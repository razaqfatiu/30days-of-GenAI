import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { performance } from "perf_hooks";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const MOCK_LLM = (process.env.MOCK_LLM ?? "").toLowerCase() === "true";

if (!MOCK_LLM && !OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY (or set MOCK_LLM=true).");
  process.exit(1);
}

type Route = "direct" | "rag";
type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };

type State = {
  question: string;
  route?: Route;
  context?: string;
  answer?: string;
  eval?: { ok: boolean; score: number; notes: string };
};

type TraceSpan = {
  name: string;
  startMs: number;
  endMs?: number;
  durationMs?: number;
  meta?: Record<string, any>;
};

class Tracer {
  traceId: string;
  spans: TraceSpan[] = [];
  constructor(traceId: string) {
    this.traceId = traceId;
  }
  startSpan(name: string, meta?: Record<string, any>) {
    const span: TraceSpan = { name, startMs: performance.now(), meta };
    this.spans.push(span);
    return span;
  }
  endSpan(span: TraceSpan, meta?: Record<string, any>) {
    span.endMs = performance.now();
    span.durationMs = span.endMs - span.startMs;
    span.meta = { ...(span.meta ?? {}), ...(meta ?? {}) };
  }
  print() {
    console.log(`\n🧭 TRACE ${this.traceId}`);
    for (const s of this.spans) {
      console.log(`- ${s.name}: ${s.durationMs?.toFixed(1)}ms`, s.meta ? JSON.stringify(s.meta) : "");
    }
  }
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}
function estimateCostUSD(inputTokens: number, outputTokens: number) {
  const PRICE_IN_PER_1K = 0.0005;  // placeholder
  const PRICE_OUT_PER_1K = 0.0015; // placeholder
  return (inputTokens / 1000) * PRICE_IN_PER_1K + (outputTokens / 1000) * PRICE_OUT_PER_1K;
}

async function openAiChat(messages: ChatMessage[]) {
  if (MOCK_LLM) return `MOCK_ANSWER: ${messages[messages.length - 1].content.slice(0, 60)}...`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, messages }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.choices[0].message.content as string;
}

async function stepClassify(state: State, tracer: Tracer) {
  const sp = tracer.startSpan("classify", { strategy: "heuristic" });
  const q = state.question.toLowerCase();
  const route: Route = /rag|retriev|cite|reference|docs|policy|latest|source|ground/i.test(q) ? "rag" : "direct";
  tracer.endSpan(sp, { route });
  return { route };
}

async function stepRetrieve(state: State, tracer: Tracer) {
  const sp = tracer.startSpan("retrieve");
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
    context = "(Local store missing. Run Day 9 first. Stub: Chunking splits text into smaller parts.)";
  }

  tracer.endSpan(sp, { contextChars: context.length });
  return { context };
}

async function stepAnswer(state: State, tracer: Tracer) {
  const sp = tracer.startSpan("answer", { route: state.route });

  const system =
    "You are a helpful assistant for beginners. Be clear and concise. " +
    "If context is provided, use it and avoid making up facts.";

  const prompt =
    state.route === "rag"
      ? `${system}\n\nQuestion: ${state.question}\n\nContext:\n${state.context}\n\nAnswer:`
      : `${system}\n\nQuestion: ${state.question}\n\nAnswer:`;

  const inTok = estimateTokens(prompt);
  const answer = await openAiChat([{ role: "user", content: prompt }]);
  const outTok = estimateTokens(answer);
  const costUSD = estimateCostUSD(inTok, outTok);

  tracer.endSpan(sp, { inputTokens: inTok, outputTokens: outTok, estCostUSD: Number(costUSD.toFixed(6)) });
  return { answer };
}

async function stepEvaluate(state: State, tracer: Tracer) {
  const sp = tracer.startSpan("evaluate", { method: MOCK_LLM ? "mock" : "llm-judge" });

  if (MOCK_LLM) {
    tracer.endSpan(sp, { ok: true, score: 0.9 });
    return { eval: { ok: true, score: 0.9, notes: "MOCK eval: ok." } };
  }

  const prompt =
    "Return STRICT JSON only: {\"ok\":boolean,\"score\":number,\"notes\":string}\n\n" +
    `Question: ${state.question}\n\n` +
    (state.context ? `Context:\n${state.context}\n\n` : "") +
    `Answer:\n${state.answer}\n\n` +
    "Criteria: beginner-friendly; grounded if context exists; no fake citations.";

  const raw = await openAiChat([{ role: "user", content: prompt }]);

  try {
    const j = JSON.parse(raw);
    const ok = Boolean(j.ok);
    const score = Number(j.score);
    const notes = String(j.notes ?? "");
    tracer.endSpan(sp, { ok, score });
    return { eval: { ok, score, notes } };
  } catch {
    tracer.endSpan(sp, { ok: false, score: 0, parseError: true });
    return { eval: { ok: false, score: 0, notes: "Eval JSON parse failed." } };
  }
}

async function runPipeline(question: string) {
  const tracer = new Tracer(`trace_${Date.now()}`);
  let state: State = { question };

  state = { ...state, ...(await stepClassify(state, tracer)) };
  if (state.route === "rag") state = { ...state, ...(await stepRetrieve(state, tracer)) };
  state = { ...state, ...(await stepAnswer(state, tracer)) };
  state = { ...state, ...(await stepEvaluate(state, tracer)) };

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
      question: "Explain chunking in simple terms and why metadata matters in RAG.",
      mustInclude: [/chunk/i, /metadata/i],
      mustNotInclude: [/as an ai language model/i],
      minEvalScore: 0.6,
    },
    {
      name: "Temperature mention",
      question: "What is temperature in LLMs? Explain simply.",
      mustInclude: [/temperature/i],
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
    else (console.log("  ❌ FAIL"), console.log("  Eval:", state.eval), console.log("  Preview:", ans.slice(0, 220), "..."));
  }

  console.log(`\n✅ Tests passed: ${pass}/${tests.length}`);
}

(async () => {
  console.log("=== Day 20 Vanilla Demo ===");
  await runPipeline("Explain chunking and why metadata matters in RAG. Keep it short.");

  console.log("\n=== Day 20 Vanilla Tests ===");
  await runTests();
})();