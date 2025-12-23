import "dotenv/config";

/**
 * Day 26 — Cost & Performance Optimization (Framework-style Pipeline)
 *
 * Run:
 *   npm run dev:day26:framework
 *
 * This mirrors the vanilla concepts but structures them like a production pipeline:
 * - stage timers (profiling)
 * - cache adapters
 * - router policy
 * - budgeting
 * - guardrails + escalation
 * - cost ledger + rate limiter
 * - streaming adapter (simulated)
 */

type Provider = "cheap" | "strong";

type ModelConfig = {
  name: string;
  inputCostPer1k: number;
  outputCostPer1k: number;
  speedMsPer100Tokens: number;
};

const MODELS: Record<Provider, ModelConfig> = {
  cheap: { name: "small-model", inputCostPer1k: 0.05, outputCostPer1k: 0.2, speedMsPer100Tokens: 40 },
  strong: { name: "strong-model", inputCostPer1k: 0.5, outputCostPer1k: 2.0, speedMsPer100Tokens: 90 },
};

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function hashKey(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return String(h >>> 0);
}

class Timer {
  private start = performance.now();
  ms() { return Math.round(performance.now() - this.start); }
}

class Cache<T> {
  private m = new Map<string, T>();
  get(k: string) { return this.m.get(k); }
  set(k: string, v: T) { this.m.set(k, v); }
  has(k: string) { return this.m.has(k); }
}

type LedgerRow = { userId: string; feature: string; costUsd: number; latencyMs: number; provider: Provider; ts: number };
class Ledger {
  rows: LedgerRow[] = [];
  add(r: LedgerRow) { this.rows.push(r); }
  total() { return this.rows.reduce((s, r) => s + r.costUsd, 0); }
}

class RateLimiter {
  private log = new Map<string, number[]>();
  constructor(private perMinute: number) {}
  allow(userId: string) {
    const ts = Date.now();
    const windowMs = 60_000;
    const arr = this.log.get(userId) ?? [];
    const filtered = arr.filter((t) => ts - t < windowMs);
    filtered.push(ts);
    this.log.set(userId, filtered);
    return filtered.length <= this.perMinute;
  }
}

type Budget = { system: number; memory: number; retrieval: number; chat: number; user: number };

class Budgeter {
  make(): Budget {
    return { system: 150, memory: 250, retrieval: 700, chat: 200, user: 100 };
  }
  trim(text: string, maxTokens: number) {
    const maxChars = maxTokens * 4;
    return text.length <= maxChars ? text : text.slice(0, maxChars) + "\n[...trimmed...]";
  }
}

class Router {
  pick(userText: string, confidence: number): Provider {
    const deep = userText.toLowerCase().includes("design") || userText.toLowerCase().includes("architecture");
    return deep || confidence < 0.5 ? "strong" : "cheap";
  }
}

class Retriever {
  constructor(private cache: Cache<string>) {}
  async get(query: string, cold: boolean) {
    if (this.cache.has(query)) return { context: this.cache.get(query)!, cacheHit: true };
    await sleep(cold ? 180 : 60);
    const context = [
      "DocA: Token budgeting reduces cost by limiting prompt size.",
      "DocB: Model routing selects cheaper models for simple tasks.",
      "DocC: Caching avoids repeated work.",
    ].join("\\n");
    this.cache.set(query, context);
    return { context, cacheHit: false };
  }
}

class LLM {
  constructor(private outputCache: Cache<string>) {}

  async call(prompt: string, provider: Provider, maxOutputTokens: number, streaming: boolean) {
    const key = hashKey(prompt);
    if (this.outputCache.has(key)) {
      const answer = this.outputCache.get(key)!;
      return { answer, cacheHit: true, inputTokens: estimateTokens(prompt), outputTokens: estimateTokens(answer), costUsd: 0, modelLatencyMs: 5 };
    }

    const model = MODELS[provider];
    const inputTokens = estimateTokens(prompt);
    const outputTokens = Math.min(maxOutputTokens, 250);
    const modelLatencyMs = Math.ceil(((inputTokens + outputTokens) / 100) * model.speedMsPer100Tokens);

    await sleep(modelLatencyMs);

    const answer =
      (provider === "strong"
        ? "Strong-model answer: robust plan with budgeting, caching, routing, rate limiting."
        : "Cheap-model answer: use budgets, caching, routing.") + (streaming ? " (streamed)" : "");

    const costUsd = (inputTokens / 1000) * model.inputCostPer1k + (outputTokens / 1000) * model.outputCostPer1k;

    this.outputCache.set(key, answer);
    return { answer, cacheHit: false, inputTokens, outputTokens, costUsd, modelLatencyMs };
  }
}

function evaluate(answer: string) {
  return {
    groundedness: answer.includes("robust") ? 0.85 : 0.6,
    usefulness: answer.includes("budget") ? 0.8 : 0.55,
  };
}

async function* stream(text: string, chunkSize = 18) {
  for (let i = 0; i < text.length; i += chunkSize) {
    await sleep(30);
    yield text.slice(i, i + chunkSize);
  }
}

class Pipeline {
  private budgeter = new Budgeter();
  private router = new Router();
  private ledger = new Ledger();
  private rate = new RateLimiter(10);

  private retrievalCache = new Cache<string>();
  private outputCache = new Cache<string>();
  private retriever = new Retriever(this.retrievalCache);
  private llm = new LLM(this.outputCache);

  async run(userId: string, userText: string, opts: { cold: boolean; streaming: boolean }) {
    const tAll = new Timer();

    if (!this.rate.allow(userId)) return { error: "Rate limit exceeded" };

    // Retrieval stage
    const tR = new Timer();
    const r = await this.retriever.get(userText, opts.cold);
    const retrievalMs = tR.ms();

    // Confidence heuristic
    const confidence = r.cacheHit ? 0.75 : 0.65;

    // Model routing
    const provider = this.router.pick(userText, confidence);

    // Budgeted prompt assembly
    const b = this.budgeter.make();
    const system = this.budgeter.trim("You are a helpful assistant. Be clear. Use context. If unsure, say you don't know.", b.system);
    const memory = this.budgeter.trim("Memory: user prefers concise answers.", b.memory);
    const context = this.budgeter.trim(r.context, b.retrieval);
    const chat = this.budgeter.trim("Recent chat: ...", b.chat);
    const user = this.budgeter.trim("User: " + userText, b.user);
    const prompt = `${system}\\n\\n${memory}\\n\\nContext:\\n${context}\\n\\n${chat}\\n\\n${user}\\nAssistant:`;

    // Guardrails
    const MAX_OUTPUT_TOKENS = 300;

    // LLM stage
    const llmRes = await this.llm.call(prompt, provider, MAX_OUTPUT_TOKENS, opts.streaming);

    // Eval-driven escalation (adaptive context loading)
    const ev = evaluate(llmRes.answer);
    let final = llmRes;
    let escalated = false;

    if (ev.groundedness < 0.75 || ev.usefulness < 0.7) {
      escalated = true;
      const prompt2 = prompt + "\\n(Extra context: streaming UX, caching layers, rate limiting.)";
      final = await this.llm.call(prompt2, "strong", MAX_OUTPUT_TOKENS, opts.streaming);
    }

    const totalMs = tAll.ms();

    // Cost attribution
    this.ledger.add({ userId, feature: "chat", costUsd: final.costUsd, latencyMs: totalMs, provider, ts: Date.now() });

    // Streaming adapter (simulated)
    if (opts.streaming && final.answer.includes("(streamed)")) {
      process.stdout.write("Streaming output: ");
      for await (const chunk of stream(final.answer)) process.stdout.write(chunk);
      process.stdout.write("\\n");
    }

    return {
      provider,
      retrievalCacheHit: r.cacheHit,
      retrievalMs,
      modelLatencyMs: final.modelLatencyMs,
      totalMs,
      costUsd: final.costUsd,
      escalated,
      ledgerTotalUsd: this.ledger.total(),
    };
  }
}

async function main() {
  console.log("✅ Day 26 — Cost & Performance Optimization (Framework pipeline)\\n");

  const pipe = new Pipeline();
  const userId = "user_123";

  const cold = await pipe.run(userId, "Design cost guardrails for an LLM app and explain token budgeting.", { cold: true, streaming: true });
  console.log("Cold:", cold);

  const warm = await pipe.run(userId, "Design cost guardrails for an LLM app and explain token budgeting.", { cold: false, streaming: false });
  console.log("\\nWarm:", warm);
}

main().catch(console.error);
