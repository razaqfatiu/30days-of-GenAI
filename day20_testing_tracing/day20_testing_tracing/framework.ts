import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";
import { ChatOpenAI } from "@langchain/openai";

/**
 * Day 20 — Testing, Tracing & Observability (LangChain framework)
 *
 * Same ideas as vanilla:
 * - tracing spans
 * - latency + token/cost estimates
 * - evaluation hook
 * - behavior-based tests
 *
 * Difference:
 * - LLM calls use LangChain's ChatOpenAI wrapper (instead of raw fetch).
 */

const MOCK_LLM = (process.env.MOCK_LLM ?? "").toLowerCase() === "true";

const llm = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

type Route = "direct" | "rag";
type State = {
  question: string;
  route?: Route;
  context?: string;
  answer?: string;
  eval?: { ok: boolean; score: number; notes: string };
};

type Span = { name: string; startMs: number; endMs?: number; durationMs?: number; meta?: Record<string, any> };

class Tracer {
  spans: Span[] = [];
  start(name: string, meta?: Record<string, any>) {
    const s: Span = { name, startMs: performance.now(), meta };
    this.spans.push(s);
    return s;
  }
  end(span: Span, meta?: Record<string, any>) {
    span.endMs = performance.now();
    span.durationMs = span.endMs - span.startMs;
    span.meta = { ...(span.meta ?? {}), ...(meta ?? {}) };
  }
  print() {
    console.log("\n🧭 TRACE");
    for (const s of this.spans) console.log(`- ${s.name}: ${s.durationMs?.toFixed(1)}ms`, s.meta ? JSON.stringify(s.meta) : "");
  }
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
function estimateCostUSD(inputTokens: number, outputTokens: number) {
  const IN = 0.0005, OUT = 0.0015; // placeholders
  return (inputTokens / 1000) * IN + (outputTokens / 1000) * OUT;
}

async function llmCall(prompt: string) {
  if (MOCK_LLM) return `MOCK_ANSWER: ${prompt.slice(0, 60)}...`;
  const msg = await llm.invoke([{ role: "user", content: prompt }]);
  return String(msg.content);
}

async function classify(state: State, tracer: Tracer) {
  const sp = tracer.start("classify");
  const q = state.question.toLowerCase();
  const route: Route = /rag|retriev|cite|docs|source|latest|ground|metadata/i.test(q) ? "rag" : "direct";
  tracer.end(sp, { route });
  return { route };
}

async function retrieve(state: State, tracer: Tracer) {
  const sp = tracer.start("retrieve");
  const storePath = path.join(__dirname, "..", "day09_ingestion_pipeline", "day09_local_ingestion_store.json");
  let context = "";
  if (fs.existsSync(storePath)) {
    const store = JSON.parse(fs.readFileSync(storePath, "utf-8")) as { records: { text: string }[] };
    const token = state.question.toLowerCase().split(/\s+/)[0] ?? "chunk";
    const hits = store.records
      .filter(r => r.text.toLowerCase().includes(token))
      .slice(0, 3)
      .map(r => r.text.slice(0, 220).replace(/\s+/g, " "));
    context = hits.length ? hits.join("\n- ") : "(No relevant local chunks found.)";
  } else {
    context = "(Local store missing; stub: Chunking splits text into smaller parts.)";
  }
  tracer.end(sp, { contextChars: context.length });
  return { context };
}

async function answer(state: State, tracer: Tracer) {
  const sp = tracer.start("answer", { route: state.route });

  const system =
    "You are a helpful assistant for beginners. Be clear and concise. " +
    "If context is provided, use it and avoid making up facts.";

  const prompt =
    state.route === "rag"
      ? `${system}\n\nQuestion: ${state.question}\n\nContext:\n${state.context}\n\nAnswer:`
      : `${system}\n\nQuestion: ${state.question}\n\nAnswer:`;

  const inTok = estimateTokens(prompt);
  const out = await llmCall(prompt);
  const outTok = estimateTokens(out);
  const cost = estimateCostUSD(inTok, outTok);

  tracer.end(sp, { inputTokens: inTok, outputTokens: outTok, estCostUSD: Number(cost.toFixed(6)) });
  return { answer: out };
}

async function evaluate(state: State, tracer: Tracer) {
  const sp = tracer.start("evaluate", { method: MOCK_LLM ? "mock" : "llm-judge" });
  if (MOCK_LLM) {
    tracer.end(sp, { ok: true, score: 0.9 });
    return { eval: { ok: true, score: 0.9, notes: "MOCK eval: ok." } };
  }

  const prompt =
    "Return STRICT JSON only: {\"ok\":boolean,\"score\":number,\"notes\":string}\n\n" +
    `Question: ${state.question}\n\n` +
    (state.context ? `Context:\n${state.context}\n\n` : "") +
    `Answer:\n${state.answer}\n\n` +
    "Criteria: beginner-friendly; grounded if context exists; no fake citations.";

  const raw = await llmCall(prompt);
  try {
    const j = JSON.parse(raw);
    const ok = Boolean(j.ok);
    const score = Number(j.score);
    const notes = String(j.notes ?? "");
    tracer.end(sp, { ok, score });
    return { eval: { ok, score, notes } };
  } catch {
    tracer.end(sp, { ok: false, score: 0, parseError: true });
    return { eval: { ok: false, score: 0, notes: "Eval JSON parse failed." } };
  }
}

async function runPipeline(question: string) {
  const tracer = new Tracer();
  let state: State = { question };

  state = { ...state, ...(await classify(state, tracer)) };
  if (state.route === "rag") state = { ...state, ...(await retrieve(state, tracer)) };
  state = { ...state, ...(await answer(state, tracer)) };
  state = { ...state, ...(await evaluate(state, tracer)) };

  tracer.print();
  return { state, tracer };
}

type TestCase = {
  name: string;
  question: string;
  mustInclude?: RegExp[];
  mustNotInclude?: RegExp[];
  minEvalScore?: number;
};

async function runTests() {
  const tests: TestCase[] = [
    {
      name: "Chunking + metadata mention",
      question: "Explain chunking and why metadata matters in RAG.",
      mustInclude: [/chunk/i, /metadata/i],
      mustNotInclude: [/as an ai language model/i],
      minEvalScore: 0.6,
    },
  ];

  let pass = 0;
  for (const t of tests) {
    console.log(`\n🧪 TEST: ${t.name}`);
    const { state } = await runPipeline(t.question);

    const ans = state.answer ?? "";
    let ok = true;

    for (const r of t.mustInclude ?? []) if (!r.test(ans)) (ok = false, console.log(`  ❌ Missing: ${r}`));
    for (const r of t.mustNotInclude ?? []) if (r.test(ans)) (ok = false, console.log(`  ❌ Should not include: ${r}`));

    const score = state.eval?.score ?? 0;
    if (typeof t.minEvalScore === "number" && score < t.minEvalScore) {
      ok = false;
      console.log(`  ❌ Eval too low: ${score} < ${t.minEvalScore}`);
    }

    if (ok) (pass++, console.log("  ✅ PASS"));
    else (console.log("  ❌ FAIL"), console.log("  Eval:", state.eval));
  }

  console.log(`\n✅ Tests passed: ${pass}/${tests.length}`);
}

(async () => {
  console.log("=== Day 20 LangChain Demo ===");
  await runPipeline("Explain chunking and why metadata matters in RAG. Keep it short.");

  console.log("\n=== Day 20 LangChain Tests ===");
  await runTests();
})();