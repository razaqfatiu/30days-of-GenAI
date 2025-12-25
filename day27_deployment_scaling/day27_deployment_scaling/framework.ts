import "dotenv/config";

/**
 * Day 27 — Deployment & Scaling GenAI Systems (Framework-style)
 *
 * Run:
 *   npm run dev:day27:framework
 */

type Env = "dev" | "staging" | "prod";
type Region = "us-east" | "eu-west";
type Provider = "cheap-model" | "mid-model" | "strong-model";
type Role = "user" | "admin";

class ConfigRegistry {
  env: Env = (process.env.APP_ENV as Env) || "dev";
  get() {
    return {
      dev: { defaultModel: "cheap-model" as Provider, canaryEnabled: true, verboseLogs: true, rateLimitPerMin: 60 },
      staging: { defaultModel: "mid-model" as Provider, canaryEnabled: true, verboseLogs: true, rateLimitPerMin: 30 },
      prod: { defaultModel: "strong-model" as Provider, canaryEnabled: false, verboseLogs: false, rateLimitPerMin: 10 },
    }[this.env];
  }
}

class Observability {
  metrics = { requests: 0, errors: 0, queueDepth: 0, costUsd: 0, avgLatencyMs: 0 };
  constructor(private verbose: boolean) {}
  log(level: "debug" | "info" | "warn" | "error", msg: string, meta: any = {}) {
    if (level === "debug" && !this.verbose) return;
    console.log(JSON.stringify({ ts: new Date().toISOString(), level, msg, ...meta }));
  }
  alert(name: string, meta: any) {
    this.log("warn", `ALERT: ${name}`, meta);
  }
}

class Security {
  allowlist = new Set(["searchDocs", "getInvoice", "sendEmail"]);
  authenticate(auth?: string): { userId: string; role: Role } | null {
    if (!auth?.startsWith("Bearer ")) return null;
    const token = auth.slice("Bearer ".length);
    if (token.startsWith("admin:")) return { userId: token, role: "admin" };
    if (token.startsWith("user:")) return { userId: token, role: "user" };
    return null;
  }
  authorizeTool(ctx: { role: Role }, tool: string) {
    if (!this.allowlist.has(tool)) return false;
    if (tool === "sendEmail" && ctx.role !== "admin") return false;
    return true;
  }
}

class ReleaseManager {
  strategy: "canary" | "blue-green" = "canary";
  canaryPct = 0.1;
  stablePrompt: "prompt_v1" | "prompt_v2" = "prompt_v1";
  candidatePrompt: "prompt_v1" | "prompt_v2" = "prompt_v2";
  stableModel: Provider = "mid-model";
  candidateModel: Provider = "strong-model";
  activeColor: "blue" | "green" = "blue";
  pick(canaryEnabled: boolean) {
    if (this.strategy === "canary") {
      const isCanary = canaryEnabled && Math.random() < this.canaryPct;
      return isCanary
        ? { prompt: this.candidatePrompt, model: this.candidateModel, variant: "canary" as const }
        : { prompt: this.stablePrompt, model: this.stableModel, variant: "stable" as const };
    }
    return this.activeColor === "blue"
      ? { prompt: this.stablePrompt, model: this.stableModel, variant: "blue" as const }
      : { prompt: this.candidatePrompt, model: this.candidateModel, variant: "green" as const };
  }
}

class Router {
  region(r: Region) { return r; }
  lb(instances: string[]) { return instances[Math.floor(Math.random() * instances.length)]; }
}

type Job = { id: string; type: "ingest" | "longAgent"; payload: any; attempts: number };

class QueueSystem {
  queue: Job[] = [];
  dlq: Job[] = [];
  maxQueue = 10;
  maxAttempts = 3;
  constructor(private obs: Observability) {}
  enqueue(job: Job) {
    if (this.queue.length >= this.maxQueue) {
      this.obs.log("warn", "Load shedding: queue full", { jobId: job.id, depth: this.queue.length });
      return false;
    }
    this.queue.push(job);
    this.obs.metrics.queueDepth = this.queue.length;
    return true;
  }
  async worker(id: string) {
    while (true) {
      const job = this.queue.shift();
      this.obs.metrics.queueDepth = this.queue.length;
      if (!job) { await new Promise(r => setTimeout(r, 80)); continue; }
      try {
        this.obs.log("info", "Worker processing", { workerId: id, jobId: job.id, attempt: job.attempts + 1 });
        await new Promise(r => setTimeout(r, 200));
        if (Math.random() < 0.2) throw new Error("Tool failure");
        this.obs.log("info", "Job succeeded", { workerId: id, jobId: job.id });
      } catch (e: any) {
        job.attempts += 1;
        this.obs.log("error", "Job failed", { workerId: id, jobId: job.id, attempts: job.attempts, err: e.message });
        if (job.attempts < this.maxAttempts) {
          await new Promise(r => setTimeout(r, job.attempts * 150));
          this.queue.push(job);
        } else {
          this.dlq.push(job);
          this.obs.log("error", "Moved to DLQ", { jobId: job.id });
        }
      }
    }
  }
}

class Autoscaler {
  apiInstances = ["api-1", "api-2"];
  workerInstances = ["worker-1"];
  constructor(private obs: Observability, private qs: QueueSystem) {}
  startWorkerPool() {
    for (const w of this.workerInstances) this.qs.worker(w);
  }
  scale() {
    const depth = this.qs.queue.length;
    if (depth > 6 && this.workerInstances.length < 4) {
      this.workerInstances.push(`worker-${this.workerInstances.length + 1}`);
      this.obs.log("info", "Scale up workers", { workers: this.workerInstances.length, queueDepth: depth });
      this.qs.worker(this.workerInstances[this.workerInstances.length - 1]);
    }
    if (depth === 0 && this.workerInstances.length > 1) {
      this.workerInstances.pop();
      this.obs.log("info", "Scale down workers", { workers: this.workerInstances.length });
    }
    if (this.obs.metrics.costUsd > 0.05) {
      this.obs.alert("Cost spike", { costUsd: this.obs.metrics.costUsd });
    }
  }
}

class RunbookEngine {
  constructor(private obs: Observability, private qs: QueueSystem) {}
  hints() {
    const h: string[] = [];
    if (this.obs.metrics.avgLatencyMs > 600) h.push("Latency high: check provider latency, cache hit rate, retrieval timing.");
    if (this.qs.queue.length > 6) h.push("Queue backlog: scale workers, shed load, inspect DLQ.");
    if (this.obs.metrics.costUsd > 0.03) h.push("Cost rising: check routing, prompt versions, canary impact, caching.");
    if (this.qs.dlq.length > 0) h.push("DLQ non-empty: inspect failing jobs, add validation/retries/backoff.");
    return h.length ? h : ["All good."];
  }
}

async function main() {
  const config = new ConfigRegistry();
  const cfg = config.get();
  const obs = new Observability(cfg.verboseLogs);
  const sec = new Security();
  const rel = new ReleaseManager();
  const r = new Router();
  const qs = new QueueSystem(obs);
  const scaler = new Autoscaler(obs, qs);
  const runbooks = new RunbookEngine(obs, qs);

  obs.log("info", "✅ Day 27 framework simulator started", { env: config.env });

  scaler.startWorkerPool();

  const promptRegistry = {
    prompt_v1: "You are a helpful assistant. Answer concisely using context.",
    prompt_v2: "You are a helpful assistant. Be clear. Use context. If unsure, say you don't know.",
  };

  const modelRegistry = {
    "cheap-model": { cost: 0.001, latencyMs: 120 },
    "mid-model": { cost: 0.004, latencyMs: 220 },
    "strong-model": { cost: 0.01, latencyMs: 380 },
  } as const;

  const reqs = [
    { region: "us-east" as Region, path: "/chat", auth: "Bearer user:123", body: { userText: "Explain blue-green deployments" } },
    { region: "eu-west" as Region, path: "/ingest", auth: "Bearer user:123", body: { userText: "Ingest docs for RAG" } },
    { region: "us-east" as Region, path: "/chat", auth: "Bearer admin:1", body: { userText: "Send email", tool: "sendEmail" } },
    { region: "us-east" as Region, path: "/chat", auth: "Bearer user:123", body: { userText: "Try sendEmail", tool: "sendEmail" } },
  ] as const;

  for (const req of reqs) {
    obs.metrics.requests += 1;

    const ctx = sec.authenticate(req.auth);
    if (!ctx) { obs.metrics.errors += 1; obs.log("warn", "Unauthorized"); continue; }

    if ("tool" in req.body && req.body.tool && !sec.authorizeTool(ctx, req.body.tool)) {
      obs.metrics.errors += 1;
      obs.log("warn", "Forbidden tool", { userId: ctx.userId, tool: req.body.tool });
      continue;
    }

    const region = r.region(req.region);
    const api = r.lb(scaler.apiInstances);
    const variant = rel.pick(cfg.canaryEnabled);

    await new Promise(res => setTimeout(res, modelRegistry[variant.model].latencyMs));
    obs.metrics.costUsd += modelRegistry[variant.model].cost;

    obs.log("info", "Handled request", { region, api, variant: variant.variant, model: variant.model, prompt: variant.prompt });

    if (req.path === "/ingest") {
      qs.enqueue({ id: `job_${Date.now()}`, type: "ingest", payload: req.body, attempts: 0 });
    }

    scaler.scale();
    await new Promise(res => setTimeout(res, 120));
  }

  await new Promise(res => setTimeout(res, 1200));

  obs.log("info", "Metrics", { metrics: obs.metrics, queue: qs.queue.length, dlq: qs.dlq.length });
  obs.log("warn", "Runbook hints", { hints: runbooks.hints() });
}

main().catch(console.error);
