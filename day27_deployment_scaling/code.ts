import "dotenv/config";

/**
 * Day 27 — Deployment & Scaling GenAI Systems (Vanilla TS)
 *
 * Run:
 *   npm run dev:day27:vanilla
 */

type Env = "dev" | "staging" | "prod";
type Region = "us-east" | "eu-west";
type DeploymentPattern = "server" | "serverless" | "hybrid";
type LogLevel = "debug" | "info" | "warn" | "error";
type Role = "user" | "admin";

function sleep(ms: number) { return new Promise((r) => setTimeout(r, ms)); }
function rand(min: number, max: number) { return Math.floor(Math.random() * (max - min + 1)) + min; }

// --------------------------
// 1) Containerization & secrets (env vars interface)
// --------------------------
const ENV: Env = (process.env.APP_ENV as Env) || "dev";
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || ""; // DO NOT LOG
const JWT_PUBLIC_KEY = process.env.JWT_PUBLIC_KEY || "dev-public-key";

const CONFIG = {
  dev: { defaultModel: "cheap-model", canaryEnabled: true, logsVerbose: true, rateLimitPerMin: 60 },
  staging: { defaultModel: "mid-model", canaryEnabled: true, logsVerbose: true, rateLimitPerMin: 30 },
  prod: { defaultModel: "strong-model", canaryEnabled: false, logsVerbose: false, rateLimitPerMin: 10 },
} as const;

// NOTE: TS doesn't have true/false; fix below with booleans.
const cfg = CONFIG[ENV];

// --------------------------
// 2) Observability: logs/metrics/traces + alerts
// --------------------------
const metrics = { requests: 0, errors: 0, queueDepth: 0, avgLatencyMs: 0, costUsd: 0 };

type TraceSpan = { name: string; ms: number };
type Trace = { traceId: string; spans: TraceSpan[] };

function log(level: LogLevel, msg: string, meta: Record<string, any> = {}) {
  if (level === "debug" && !cfg.logsVerbose) return;
  console.log(JSON.stringify({ ts: new Date().toISOString(), env: ENV, level, msg, ...meta }));
}

function alert(name: string, meta: Record<string, any>) {
  log("warn", `ALERT: ${name}`, meta);
}

// --------------------------
// 3) Security & access control
// --------------------------
type AuthContext = { userId: string; role: Role };

function authenticate(authHeader: string | undefined): AuthContext | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length);
  if (token.startsWith("admin:")) return { userId: token, role: "admin" };
  if (token.startsWith("user:")) return { userId: token, role: "user" };
  return null;
}

const TOOL_ALLOWLIST = new Set(["searchDocs", "getInvoice", "sendEmail"]);
function authorizeTool(ctx: AuthContext, tool: string) {
  if (!TOOL_ALLOWLIST.has(tool)) return false;
  if (tool === "sendEmail" && ctx.role !== "admin") return false;
  return true;
}

// --------------------------
// 4) Stateless API + external state placement
// --------------------------
const memoryStore = new Map<string, string>(); // Redis in real life
const vectorDbPlacement: Record<Region, string> = { "us-east": "vector-db-us", "eu-west": "vector-db-eu" };

// --------------------------
// 5) Model & prompt versioning + registry
// --------------------------
type PromptVersion = "prompt_v1" | "prompt_v2";
type ModelVersion = "cheap-model" | "mid-model" | "strong-model";

const promptRegistry: Record<PromptVersion, string> = {
  prompt_v1: "You are a helpful assistant. Answer concisely using context.",
  prompt_v2: "You are a helpful assistant. Be clear. Use context. If unsure, say you don't know.",
};

const modelRegistry: Record<ModelVersion, { costPerReq: number; latencyMs: number }> = {
  "cheap-model": { costPerReq: 0.001, latencyMs: 120 },
  "mid-model": { costPerReq: 0.004, latencyMs: 220 },
  "strong-model": { costPerReq: 0.01, latencyMs: 380 },
};

// --------------------------
// 6) Canary & blue-green releases
// --------------------------
type ReleaseStrategy = "canary" | "blue-green";
type Release = {
  strategy: ReleaseStrategy;
  stablePrompt: PromptVersion;
  candidatePrompt: PromptVersion;
  stableModel: ModelVersion;
  candidateModel: ModelVersion;
  canaryPct: number;
  activeColor: "blue" | "green";
};

const release: Release = {
  strategy: "canary",
  stablePrompt: "prompt_v1",
  candidatePrompt: "prompt_v2",
  stableModel: "mid-model",
  candidateModel: "strong-model",
  canaryPct: 0.1,
  activeColor: "blue",
};

function pickReleaseVariant() {
  if (release.strategy === "canary") {
    const isCanary = cfg.canaryEnabled && Math.random() < release.canaryPct;
    return isCanary
      ? { prompt: release.candidatePrompt, model: release.candidateModel, variant: "canary" as const }
      : { prompt: release.stablePrompt, model: release.stableModel, variant: "stable" as const };
  }
  // blue-green
  return release.activeColor === "blue"
    ? { prompt: release.stablePrompt, model: release.stableModel, variant: "blue" as const }
    : { prompt: release.candidatePrompt, model: release.candidateModel, variant: "green" as const };
}

// --------------------------
// 7) Load balancing + routing + multi-region
// --------------------------
type Request = { region: Region; path: "/chat" | "/ingest"; auth?: string; body: { userText: string; tool?: string } };

function routeRegion(req: Request): Region { return req.region; }
function loadBalance(instances: string[]) { return instances[rand(0, instances.length - 1)]; }

// --------------------------
// 8) Async pipelines: queue + workers + retries + DLQ
// --------------------------
type Job = { id: string; type: "ingest" | "longAgent"; payload: any; attempts: number };
const queue: Job[] = [];
const deadLetterQueue: Job[] = [];
const MAX_QUEUE = 10;
const MAX_ATTEMPTS = 3;

function enqueue(job: Job) {
  if (queue.length >= MAX_QUEUE) {
    log("warn", "Load shedding: queue full", { jobId: job.id, queueDepth: queue.length });
    return false;
  }
  queue.push(job);
  metrics.queueDepth = queue.length;
  return true;
}

async function workerLoop(workerId: string) {
  while (true) {
    const job = queue.shift();
    metrics.queueDepth = queue.length;

    if (!job) { await sleep(80); continue; }

    try {
      log("info", "Worker processing job", { workerId, jobId: job.id, type: job.type, attempt: job.attempts + 1 });
      await sleep(rand(120, 280));
      if (Math.random() < 0.2) throw new Error("Tool failed or timeout");
      log("info", "Job succeeded", { workerId, jobId: job.id });
    } catch (e: any) {
      job.attempts += 1;
      log("error", "Job failed", { workerId, jobId: job.id, attempts: job.attempts, err: e.message });
      if (job.attempts < MAX_ATTEMPTS) {
        await sleep(job.attempts * 150);
        queue.push(job);
      } else {
        deadLetterQueue.push(job);
        log("error", "Job moved to DLQ", { jobId: job.id });
      }
    }
  }
}

// --------------------------
// 9) Cost-aware autoscaling
// --------------------------
let apiInstances = ["api-1", "api-2"];
let workerInstances = ["worker-1"];

function autoscale() {
  // scale workers based on queue depth
  if (queue.length > 6 && workerInstances.length < 4) {
    workerInstances.push(`worker-${workerInstances.length + 1}`);
    log("info", "Autoscale up workers", { workers: workerInstances.length, queueDepth: queue.length });
    workerLoop(workerInstances[workerInstances.length - 1]); // start the new worker
  }
  if (queue.length === 0 && workerInstances.length > 1) {
    workerInstances.pop();
    log("info", "Autoscale down workers", { workers: workerInstances.length });
  }

  // cost-aware alert example
  if (metrics.costUsd > 0.05 && ENV === "prod") {
    alert("Cost spike detected", { costUsd: metrics.costUsd });
  }
}

// fix TS 'and'
// --------------------------
// 10) Deployment pattern selection
// --------------------------
function pickDeploymentPattern(): DeploymentPattern {
  if (ENV === "dev") return "server";
  if (ENV === "staging") return "hybrid";
  return "hybrid";
}

// --------------------------
// 11) Sync request path (chat)
// --------------------------
async function handleChat(req: Request) {
  metrics.requests += 1;
  const trace: Trace = { traceId: `tr_${Date.now()}`, spans: [] };

  const tStart = Date.now();

  const ctx = authenticate(req.auth);
  if (!ctx) {
    metrics.errors += 1;
    log("warn", "Unauthorized", { path: req.path });
    return { status: 401, body: "Unauthorized" };
  }

  if (req.body.tool && !authorizeTool(ctx, req.body.tool)) {
    metrics.errors += 1;
    log("warn", "Forbidden tool access", { userId: ctx.userId, tool: req.body.tool });
    return { status: 403, body: "Forbidden tool" };
  }

  const region = routeRegion(req);
  const instance = loadBalance(apiInstances);
  const vectorDb = vectorDbPlacement[region];

  log("info", "Request routed", { region, instance, vectorDb });

  const memKey = `${ctx.userId}:memory`;
  const memory = memoryStore.get(memKey) || "(no memory yet)";
  trace.spans.push({ name: "memory_lookup", ms: rand(5, 15) });

  const variant = pickReleaseVariant();
  trace.spans.push({ name: "release_select", ms: rand(1, 3) });

  const prompt = `${promptRegistry[variant.prompt]}\nMemory: ${memory}\nUser: ${req.body.userText}\nAssistant:`;
  trace.spans.push({ name: "prompt_assemble", ms: rand(2, 8) });

  const model = modelRegistry[variant.model];
  await sleep(model.latencyMs);
  metrics.costUsd += model.costPerReq;
  trace.spans.push({ name: "model_infer", ms: model.latencyMs });

  memoryStore.set(memKey, `Last topic: ${req.body.userText.slice(0, 40)}...`);
  trace.spans.push({ name: "memory_write", ms: rand(5, 15) });

  const latency = Date.now() - tStart;
  metrics.avgLatencyMs = metrics.avgLatencyMs === 0 ? latency : Math.round((metrics.avgLatencyMs + latency) / 2);

  if (latency > 800) alert("Latency SLO breach", { latencyMs: latency, region, model: variant.model });

  log("info", "Request complete", { status: 200, latencyMs: latency, variant: variant.variant, model: variant.model });

  return { status: 200, body: { answer: `(${variant.model}/${variant.prompt}) Here is a response.`, trace } };
}

// --------------------------
// 12) Async endpoint (ingest)
// --------------------------
async function handleIngest(req: Request) {
  const ctx = authenticate(req.auth);
  if (!ctx) return { status: 401, body: "Unauthorized" };

  const ok = enqueue({ id: `job_${Date.now()}`, type: "ingest", payload: req.body, attempts: 0 });
  return ok ? { status: 202, body: "Accepted (processing async)" } : { status: 503, body: "Queue full, try later" };
}

// --------------------------
// 13) Operational runbooks
// --------------------------
function runbookHints() {
  const hints: string[] = [];
  if (metrics.avgLatencyMs > 600) hints.push("Latency high: check provider latency, caches, retrieval timings.");
  if (queue.length > 6) hints.push("Queue backlog: scale workers, shed load, inspect DLQ.");
  if (metrics.costUsd > 0.03) hints.push("Cost rising: check routing, prompt versions, canary impact, caching.");
  if (deadLetterQueue.length > 0) hints.push("DLQ non-empty: inspect failing jobs, add validation/retries/backoff.");
  return hints.length ? hints : ["All good."];
}

// --------------------------
// Main demo
// --------------------------
async function main() {
  log("info", "✅ Day 27 simulator started", { ENV, pattern: pickDeploymentPattern(), hasOpenAIKey: Boolean(OPENAI_API_KEY), hasJwtKey: Boolean(JWT_PUBLIC_KEY) });

  // Start initial workers
  for (const w of workerInstances) workerLoop(w);

  const pattern = pickDeploymentPattern();
  const serverlessColdStartMs = 250;

  const requests: Request[] = [
    { region: "us-east", path: "/chat", auth: "Bearer user:123", body: { userText: "Explain canary releases for prompts" } },
    { region: "eu-west", path: "/ingest", auth: "Bearer user:123", body: { userText: "Ingest a PDF for RAG" } },
    { region: "us-east", path: "/chat", auth: "Bearer admin:1", body: { userText: "Send an email via tool", tool: "sendEmail" } },
    { region: "us-east", path: "/chat", auth: "Bearer user:123", body: { userText: "Try to send email (should fail)", tool: "sendEmail" } },
  ];

  for (const req of requests) {
    if (pattern === "serverless") await sleep(serverlessColdStartMs);

    if (req.path === "/chat") {
      const res = await handleChat(req);
      log("info", "Response", { status: res.status });
    } else {
      const res = await handleIngest(req);
      log("info", "Response", { status: res.status, body: res.body });
    }

    autoscale();
    await sleep(120);
  }

  await sleep(1500);

  log("info", "Metrics snapshot", { metrics, queueDepth: queue.length, dlq: deadLetterQueue.length });
  log("warn", "Runbook hints", { hints: runbookHints() });
}

main().catch((e) => log("error", "Fatal error", { err: String(e) }));
