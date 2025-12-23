import "dotenv/config";

/**
 * Day 26 — Cost & Performance Optimization (Vanilla TS)
 *
 * Run:
 *   npm run dev:day26:vanilla
 */

// -----------------------------
// Helpers: timing, tokens, costs
// -----------------------------
function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function tnow() {
  return performance.now();
}

// Rough token estimate for budgeting.
function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

type Provider = "cheap" | "strong";

type ModelConfig = {
  name: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  speedMsPer100Tokens: number;
};

// Illustrative pricing/speed (not real).
const MODELS: Record<Provider, ModelConfig> = {
  cheap: { name: "small-model", inputCostPer1k: 0.05, outputCostPer1k: 0.2, speedMsPer100Tokens: 40 },
  strong: { name: "strong-model", inputCostPer1k: 0.5, outputCostPer1k: 2.0, speedMsPer100Tokens: 90 },
};

// -----------------------------
// 1) Token budgeting & prompt cost engineering
// -----------------------------
type PromptParts = {
  system: string;
  profile: string;
  memory: string;
  retrieval: string;
  recentChat: string;
  user: string;
};

function buildPromptParts(userText: string, opts: { verboseSystem: boolean; retrievalContext: string; memory: string }): PromptParts {
  // Prompt cost engineering: compare short vs verbose system prompts.
  const systemShort = "You are a helpful assistant. Be clear. Use provided context. If unsure, say you don't know.";
  const systemVerbose =
    "You are a helpful assistant. Always be extremely detailed. Repeat safety rules. Restate the user question. " +
    "Provide many bullet points. Add extra explanation even if not needed.";

  return {
    system: opts.verboseSystem ? systemVerbose : systemShort,
    profile: "User preferences: style=simple, length=short.",
    memory: opts.memory,
    retrieval: opts.retrievalContext,
    recentChat: "Recent chat: (last few turns...)",
    user: `User: ${userText}`,
  };
}

type Budget = {
  total: number;
  alloc: { system: number; profile: number; memory: number; retrieval: number; recentChat: number; user: number; buffer: number };
};

function makeBudget(totalTokens: number): Budget {
  const alloc = {
    system: 150,
    profile: 80,
    memory: 250,
    retrieval: 700,
    recentChat: 200,
    user: 100,
    buffer: Math.max(0, totalTokens - (150 + 80 + 250 + 700 + 200 + 100)),
  };
  return { total: totalTokens, alloc };
}

function trimToBudget(text: string, maxTokens: number) {
  const maxChars = maxTokens * 4;
  return text.length <= maxChars ? text : text.slice(0, maxChars) + "\n[...trimmed for budget...]";
}

function assemblePrompt(parts: PromptParts, budget: Budget) {
  const p = {
    system: trimToBudget(parts.system, budget.alloc.system),
    profile: trimToBudget(parts.profile, budget.alloc.profile),
    memory: trimToBudget(parts.memory, budget.alloc.memory),
    retrieval: trimToBudget(parts.retrieval, budget.alloc.retrieval),
    recentChat: trimToBudget(parts.recentChat, budget.alloc.recentChat),
    user: trimToBudget(parts.user, budget.alloc.user),
  };

  const prompt =
    `${p.system}\n\n${p.profile}\n\nMemory:\n${p.memory}\n\nContext:\n${p.retrieval}\n\n${p.recentChat}\n\n${p.user}\nAssistant:`;

  return { prompt, tokenEstimate: estimateTokens(prompt) };
}

// -----------------------------
// 2) Caching layers
// -----------------------------
const embeddingCache = new Map<string, number[]>();
const retrievalCache = new Map<string, string>();
const outputCache = new Map<string, string>();

function hashKey(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

// -----------------------------
// 3) Embeddings + retrieval (mock)
// -----------------------------
function fakeEmbed(text: string) {
  if (embeddingCache.has(text)) return { vector: embeddingCache.get(text)!, cacheHit: true };
  const v = Array.from({ length: 32 }, (_, i) => (text.length * (i + 1)) % 7);
  embeddingCache.set(text, v);
  return { vector: v, cacheHit: false };
}

async function fakeRetrieve(query: string, cold: boolean) {
  if (retrievalCache.has(query)) return { context: retrievalCache.get(query)!, cacheHit: true };

  // Cold vs warm: cold retrieval is slower
  await sleep(cold ? 180 : 60);

  const context = [
    "DocA: Token budgeting reduces cost by limiting prompt size.",
    "DocB: Model routing selects cheaper models for simple tasks.",
    "DocC: Caching avoids repeated embedding and retrieval work.",
  ].join("\n");

  retrievalCache.set(query, context);
  return { context, cacheHit: false };
}

// -----------------------------
// 4) Model routing (cheap → strong)
// -----------------------------
function routeModel(userText: string, confidence: number): Provider {
  const t = userText.toLowerCase();
  const deep = t.includes("design") || t.includes("architecture") || t.includes("in depth");
  if (deep || confidence < 0.5) return "strong";
  return "cheap";
}

// -----------------------------
// 5) Streaming vs non-streaming (simulated)
// -----------------------------
async function* fakeStream(text: string, chunkSize = 18) {
  for (let i = 0; i < text.length; i += chunkSize) {
    await sleep(30);
    yield text.slice(i, i + chunkSize);
  }
}

// -----------------------------
// 6) LLM call (mock) with guardrails + fallback
// -----------------------------
type LlmResult = {
  answer: string;
  provider: Provider;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  modelLatencyMs: number;
  outputCacheHit: boolean;
};

async function fakeLlm(prompt: string, provider: Provider, opts: { streaming: boolean; maxOutputTokens: number }) : Promise<LlmResult> {
  const key = hashKey(prompt);

  // Output caching: only safe for deterministic prompts (temp=0). We'll assume deterministic.
  if (outputCache.has(key)) {
    const answer = outputCache.get(key)!;
    return {
      answer,
      provider,
      inputTokens: estimateTokens(prompt),
      outputTokens: estimateTokens(answer),
      costUsd: 0,
      modelLatencyMs: 5,
      outputCacheHit: true,
    };
  }

  // Guardrail: enforce output token limit
  const model = MODELS[provider];
  const inputTokens = estimateTokens(prompt);
  const outputTokens = Math.min(opts.maxOutputTokens, 250);

  const modelLatencyMs = Math.ceil(((inputTokens + outputTokens) / 100) * model.speedMsPer100Tokens);
  await sleep(modelLatencyMs);

  const base =
    provider === "strong"
      ? "Strong-model answer: robust plan with budgeting, caching, routing, rate limiting."
      : "Cheap-model answer: use budgets, caching, and simple routing.";

  const answer = base + (opts.streaming ? " (streamed)" : "");

  const costUsd =
    (inputTokens / 1000) * model.inputCostPer1k +
    (outputTokens / 1000) * model.outputCostPer1k;

  outputCache.set(key, answer);
  return { answer, provider, inputTokens, outputTokens, costUsd, modelLatencyMs, outputCacheHit: false };
}

// -----------------------------
// 7) Evaluation-driven optimization + adaptive context loading
// -----------------------------
type Eval = { groundedness: number; usefulness: number };

function evaluate(answer: string): Eval {
  return {
    groundedness: answer.includes("robust") ? 0.85 : 0.6,
    usefulness: answer.includes("budget") ? 0.8 : 0.55,
  };
}

async function answerAdaptive(userText: string, opts: { cold: boolean; streaming: boolean }) {
  const t0 = tnow();

  // Step A: minimal retrieval
  const retrievalA = await fakeRetrieve(userText, opts.cold);
  const confidenceA = retrievalA.context.length ? (retrievalA.cacheHit ? 0.75 : 0.65) : 0.3;

  const providerA = routeModel(userText, confidenceA);

  const budget = makeBudget(1500);

  const partsA = buildPromptParts(userText, {
    verboseSystem: false,
    retrievalContext: retrievalA.context,
    memory: "Long-term memory: user prefers concise explanations.",
  });

  const { prompt: promptA, tokenEstimate } = assemblePrompt(partsA, budget);

  const MAX_OUTPUT_TOKENS = 300;
  const llmA = await fakeLlm(promptA, providerA, { streaming: opts.streaming, maxOutputTokens: MAX_OUTPUT_TOKENS });
  const evalA = evaluate(llmA.answer);

  // Adaptive escalation: if quality low, load more context and upgrade model
  let final = llmA;
  let finalEval = evalA;
  let escalated = false;

  if (evalA.groundedness < 0.75 || evalA.usefulness < 0.7) {
    escalated = true;

    const moreContext = retrievalA.context +
      "\nDocD: Rate limiting protects the system under burst traffic." +
      "\nDocE: Streaming improves perceived latency.";

    const partsB = buildPromptParts(userText, {
      verboseSystem: false,
      retrievalContext: moreContext,
      memory: "Long-term memory: user prefers concise explanations.",
    });

    const { prompt: promptB } = assemblePrompt(partsB, budget);

    // Upgrade model on escalation
    const llmB = await fakeLlm(promptB, "strong", { streaming: opts.streaming, maxOutputTokens: MAX_OUTPUT_TOKENS });
    final = llmB;
    finalEval = evaluate(llmB.answer);
  }

  const t1 = tnow();

  return {
    provider: final.provider,
    retrievalCacheHit: retrievalA.cacheHit,
    promptTokens: tokenEstimate,
    inputTokens: final.inputTokens,
    outputTokens: final.outputTokens,
    costUsd: final.costUsd,
    modelLatencyMs: final.modelLatencyMs,
    totalLatencyMs: Math.round(t1 - t0),
    eval: finalEval,
    escalated,
    answer: final.answer,
  };
}

// -----------------------------
// 8) Batching & parallelism demos
// -----------------------------
async function demoBatching() {
  const texts = ["doc about caching", "doc about budgets", "doc about routing"];
  const t0 = tnow();

  // Batching (simulated): do embeddings concurrently.
  const results = await Promise.all(
    texts.map(async (t) => {
      await sleep(10); // simulate overhead
      return fakeEmbed(t);
    })
  );

  const t1 = tnow();
  return { count: results.length, ms: Math.round(t1 - t0), cacheHits: results.filter(r => r.cacheHit).length };
}

async function demoParallelism() {
  const t0 = tnow();

  // Parallel independent work: retrieval + a "tool call"
  await Promise.all([
    fakeRetrieve("parallel demo", false),
    (async () => { await sleep(80); return "SQL result"; })(),
  ]);

  const t1 = tnow();
  return { ms: Math.round(t1 - t0) };
}

// -----------------------------
// 9) Rate limiting & traffic shaping
// -----------------------------
type RateRule = { perMinute: number };
const rule: RateRule = { perMinute: 10 };
const reqLog = new Map<string, number[]>();

function allowRequest(userId: string) {
  const ts = Date.now();
  const windowMs = 60_000;

  const arr = reqLog.get(userId) ?? [];
  const filtered = arr.filter((t) => ts - t < windowMs);
  filtered.push(ts);
  reqLog.set(userId, filtered);

  return filtered.length <= rule.perMinute;
}

// -----------------------------
// 10) Cost attribution & accounting
// -----------------------------
type CostRow = { userId: string; feature: string; costUsd: number; latencyMs: number; provider: Provider; ts: number };
const ledger: CostRow[] = [];

function recordCost(row: CostRow) {
  ledger.push(row);
}

function summarizeCosts() {
  const byUser: Record<string, number> = {};
  const byFeature: Record<string, number> = {};

  for (const r of ledger) {
    byUser[r.userId] = (byUser[r.userId] ?? 0) + r.costUsd;
    byFeature[r.feature] = (byFeature[r.feature] ?? 0) + r.costUsd;
  }

  return { total: ledger.reduce((s, r) => s + r.costUsd, 0), byUser, byFeature };
}

// -----------------------------
// 11) Streaming demo helper
// -----------------------------
async function demoStreaming(answer: string) {
  process.stdout.write("Streaming output: ");
  for await (const chunk of fakeStream(answer)) {
    process.stdout.write(chunk);
  }
  process.stdout.write("\n");
}

// -----------------------------
// Main
// -----------------------------
async function main() {
  console.log("✅ Day 26 — Cost & Performance Optimization (Vanilla)\n");

  const userId = "user_123";
  const feature = "chat";

  // Guardrail: rate limit
  if (!allowRequest(userId)) {
    console.log("Rate limit exceeded. Try later.");
    return;
  }

  // Cold vs warm comparison
  const cold = await answerAdaptive("Design cost guardrails for an LLM app and explain token budgeting.", { cold: true, streaming: true });
  recordCost({ userId, feature, costUsd: cold.costUsd, latencyMs: cold.totalLatencyMs, provider: cold.provider, ts: Date.now() });

  console.log("Cold request:", cold);
  if (cold.answer.includes("(streamed)")) await demoStreaming(cold.answer);

  const warm = await answerAdaptive("Design cost guardrails for an LLM app and explain token budgeting.", { cold: false, streaming: false });
  recordCost({ userId, feature, costUsd: warm.costUsd, latencyMs: warm.totalLatencyMs, provider: warm.provider, ts: Date.now() });

  console.log("\nWarm request:", warm);

  // Batching + parallelism
  const batch = await demoBatching();
  const par = await demoParallelism();
  console.log("\nBatching demo:", batch);
  console.log("Parallelism demo:", par);

  // Cost accounting summary
  console.log("\nCost summary:", summarizeCosts());

  // Traffic shaping burst demo
  console.log("\nTraffic shaping demo (burst):");
  let allowed = 0;
  for (let i = 0; i < 12; i++) {
    if (allowRequest(userId)) allowed++;
    else break;
  }
  console.log(`Allowed ${allowed} requests within 1 minute (perMinute=${rule.perMinute}).`);

  // Profiling notes
  console.log("\nProfiling notes:");
  console.log("- totalLatencyMs includes retrieval + model time + overhead.");
  console.log("- modelLatencyMs approximates inference time based on token size.");
  console.log("- compare cold vs warm for cache impact.");
}

main().catch(console.error);
