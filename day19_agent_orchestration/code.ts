import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Day 19 — Agent Orchestration (Vanilla TypeScript)
 *
 * Goals:
 * - Build a tiny DAG workflow engine (like a simplified LangGraph)
 * - Support branching logic (conditional edges)
 * - Support parallel fan-out (run multiple nodes concurrently)
 * - Add basic reliability (retries + timeouts)
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

type State = {
  question: string;
  route?: "direct" | "rag";
  retrievedChunks?: string[];
  draftAnswer?: string;
  evaluation?: { ok: boolean; reason: string };
  trace: { node: string; note: string; at: string }[];
};

type NodeResult = Partial<State>;
type NodeFn = (state: State) => Promise<NodeResult>;

type NodeDef = {
  name: string;
  run: NodeFn;
  retries?: number;
  timeoutMs?: number;
};

type Edge =
  | { from: string; to: string }
  | { from: string; type: "conditional"; decide: (s: State) => string | string[] };

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

async function withTimeout<T>(p: Promise<T>, ms?: number): Promise<T> {
  if (!ms) return p;
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`Timeout after ${ms}ms`)), ms);
    p.then((v) => {
      clearTimeout(id);
      resolve(v);
    }).catch((e) => {
      clearTimeout(id);
      reject(e);
    });
  });
}

async function withRetries<T>(fn: () => Promise<T>, retries = 0): Promise<T> {
  let attempt = 0;
  while (true) {
    try {
      return await fn();
    } catch (e) {
      attempt++;
      if (attempt > retries) throw e;
      await sleep(200 * attempt);
    }
  }
}

class DagRunner {
  nodes: Record<string, NodeDef> = {};
  edges: Edge[] = [];

  addNode(node: NodeDef) {
    this.nodes[node.name] = node;
    return this;
  }

  addEdge(from: string, to: string) {
    this.edges.push({ from, to });
    return this;
  }

  addConditionalEdges(from: string, decide: (s: State) => string | string[]) {
    this.edges.push({ from, type: "conditional", decide });
    return this;
  }

  nextNodes(from: string, state: State): string[] {
    const outs = this.edges.filter((e) => e.from === from);
    const result: string[] = [];
    for (const e of outs) {
      if ("to" in e) result.push(e.to);
      else result.push(...(Array.isArray(e.decide(state)) ? (e.decide(state) as string[]) : [e.decide(state) as string]));
    }
    return result;
  }

  async run(initial: State, startNode: string) {
    let state = initial;
    let scheduled = [startNode];
    const MAX_STEPS = 12;
    let step = 0;

    while (scheduled.length && step++ < MAX_STEPS) {
      const toRun = [...new Set(scheduled)];
      scheduled = [];

      const results = await Promise.all(
        toRun.map(async (nodeName) => {
          const node = this.nodes[nodeName];
          if (!node) throw new Error(`Unknown node: ${nodeName}`);

          const runOnce = async () => {
            state.trace.push({ node: nodeName, note: "start", at: new Date().toISOString() });
            const out = await node.run(state);
            state.trace.push({ node: nodeName, note: "done", at: new Date().toISOString() });
            return { nodeName, out };
          };

          const runner = () => withTimeout(runOnce(), node.timeoutMs);
          return withRetries(runner, node.retries ?? 0);
        })
      );

      for (const r of results) {
        state = { ...state, ...r.out };
        scheduled.push(...this.nextNodes(r.nodeName, state));
      }
    }

    if (step >= MAX_STEPS) state.trace.push({ node: "SYSTEM", note: "max steps reached", at: new Date().toISOString() });
    return state;
  }
}

async function openAiChat(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "gpt-4o-mini", temperature: 0, messages: [{ role: "user", content: prompt }] }),
  });
  if (!res.ok) throw new Error(await res.text());
  const json = await res.json();
  return json.choices[0].message.content as string;
}

const classify: NodeDef = {
  name: "classify",
  run: async (state) => {
    const needsRag = /policy|price|latest|define|reference|citation|docs|metadata|rag|embedding|chunk/i.test(state.question);
    return { route: needsRag ? "rag" : "direct" };
  },
};

const retrieve: NodeDef = {
  name: "retrieve",
  run: async (state) => {
    const storePath = path.join(__dirname, "..", "day09_ingestion_pipeline", "day09_local_ingestion_store.json");
    if (!fs.existsSync(storePath)) return { retrievedChunks: ["(No local store found. Run Day 9 first.)"] };

    const store = JSON.parse(fs.readFileSync(storePath, "utf-8")) as { records: { id: string; text: string }[] };
    const q = state.question.toLowerCase();
    const token = q.split(/\s+/)[0] ?? q;

    const hits = store.records
      .filter((r) => r.text.toLowerCase().includes(token))
      .slice(0, 3)
      .map((r) => r.text.slice(0, 220).replace(/\s+/g, " "));

    return { retrievedChunks: hits.length ? hits : ["(No relevant chunks found.)"] };
  },
};

const answer: NodeDef = {
  name: "answer",
  retries: 1,
  timeoutMs: 25_000,
  run: async (state) => {
    const ctx = state.retrievedChunks?.length ? `Context:\n- ${state.retrievedChunks.join("\n- ")}\n\n` : "";
    const prompt =
      `You are a helpful AI assistant for beginners.\n` +
      `Question: ${state.question}\n\n` +
      ctx +
      `Give a clear answer. If context is provided, ground your answer in it.`;

    const draftAnswer = await openAiChat(prompt);
    return { draftAnswer };
  },
};

const evaluate: NodeDef = {
  name: "evaluate",
  retries: 1,
  timeoutMs: 25_000,
  run: async (state) => {
    const prompt =
      `Evaluate the answer for helpfulness and whether it addressed the question.\n` +
      `Return JSON with keys: ok(boolean), reason(string).\n\n` +
      `Question: ${state.question}\n\nAnswer:\n${state.draftAnswer}`;

    const raw = await openAiChat(prompt);
    try {
      const j = JSON.parse(raw);
      return { evaluation: { ok: !!j.ok, reason: String(j.reason ?? "") } };
    } catch {
      return { evaluation: { ok: false, reason: "Could not parse evaluation JSON." } };
    }
  },
};

const logTrace: NodeDef = {
  name: "log_trace",
  run: async (state) => {
    console.log("\n🧾 Trace:");
    for (const t of state.trace) console.log(`- ${t.at} [${t.node}] ${t.note}`);
    return {};
  },
};

const dag = new DagRunner()
  .addNode(classify)
  .addNode(retrieve)
  .addNode(answer)
  .addNode(evaluate)
  .addNode(logTrace)
  .addEdge("START", "classify")
  .addConditionalEdges("classify", (s) => (s.route === "rag" ? "retrieve" : "answer"))
  .addEdge("retrieve", "answer")
  // Fan-out: evaluate + logTrace run in parallel after answer
  .addEdge("answer", "evaluate")
  .addEdge("answer", "log_trace")
  .addEdge("evaluate", "END");

(async () => {
  const initial: State = { question: "Explain chunking and why metadata matters in RAG.", trace: [] };
  const final = await dag.run(initial, "START");
  console.log("\n✅ Final Draft Answer:\n", final.draftAnswer);
  console.log("\n✅ Evaluation:\n", final.evaluation);
})();