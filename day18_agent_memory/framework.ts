import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { ChatOpenAI, OpenAIEmbeddings } from "@langchain/openai";

/**
 * Day 18 — Agent Memory (Framework version with LangChain wrappers)
 *
 * Implements:
 * - Episodic memory (event log)
 * - Task memory (goal/preferences/summaries per task)
 * - Vector memory (embeddings + similarity recall)
 * - Memory routing (choose episodic vs task vs vector)
 * - Context pruning (summarize overflow into task memory)
 */

const llm = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });
const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };

const files = {
  episodes: path.join(__dirname, "day18_episodes_framework.json"),
  task: path.join(__dirname, "day18_task_memory_framework.json"),
  vectors: path.join(__dirname, "day18_vector_memory_framework.json"),
};

function ensureFile(filePath: string, initial: any) {
  if (!fs.existsSync(filePath)) fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
}

ensureFile(files.episodes, { episodes: [] });
ensureFile(files.task, { tasks: {} });
ensureFile(files.vectors, { vectors: [] });

function cosine(a: number[], b: number[]) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

class MemoryManager {
  shortTerm: ChatMessage[] = [];
  maxShortTerm = 8;
  taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
    this.initTask();
  }

  initTask() {
    const db = JSON.parse(fs.readFileSync(files.task, "utf-8"));
    if (!db.tasks[this.taskId]) {
      db.tasks[this.taskId] = {
        goal: "Teach GenAI concepts to beginners clearly.",
        preferences: { tone: "friendly", format: "short paragraphs + bullets" },
        summary: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(files.task, JSON.stringify(db, null, 2));
    }
  }

  addEpisode(type: string, detail: any) {
    const db = JSON.parse(fs.readFileSync(files.episodes, "utf-8"));
    db.episodes.push({ timestamp: new Date().toISOString(), taskId: this.taskId, type, detail });
    fs.writeFileSync(files.episodes, JSON.stringify(db, null, 2));
  }

  readTask() {
    const db = JSON.parse(fs.readFileSync(files.task, "utf-8"));
    return db.tasks[this.taskId];
  }

  writeTaskSummary(summary: string) {
    const db = JSON.parse(fs.readFileSync(files.task, "utf-8"));
    db.tasks[this.taskId].summary = summary;
    db.tasks[this.taskId].updatedAt = new Date().toISOString();
    fs.writeFileSync(files.task, JSON.stringify(db, null, 2));
  }

  async writeVector(text: string, tag: string) {
    const vec = await embeddings.embedQuery(text);
    const db = JSON.parse(fs.readFileSync(files.vectors, "utf-8"));
    db.vectors.push({ taskId: this.taskId, tag, text, vec, createdAt: new Date().toISOString() });
    fs.writeFileSync(files.vectors, JSON.stringify(db, null, 2));
    this.addEpisode("VECTOR_WRITE", { tag, chars: text.length });
  }

  async recallVector(query: string, threshold = 0.78) {
    const qVec = await embeddings.embedQuery(query);
    const db = JSON.parse(fs.readFileSync(files.vectors, "utf-8"));
    let best = { score: -1, text: "", tag: "" };

    for (const item of db.vectors) {
      const score = cosine(qVec, item.vec);
      if (score > best.score) best = { score, text: item.text, tag: item.tag };
    }

    if (best.score >= threshold) return best;
    return null;
  }

  async pruneIfNeeded() {
    if (this.shortTerm.length <= this.maxShortTerm) return;

    const overflow = this.shortTerm.slice(0, this.shortTerm.length - this.maxShortTerm);
    const keep = this.shortTerm.slice(-this.maxShortTerm);

    const existing = this.readTask().summary || "";

    const prompt = [
      {
        role: "user" as const,
        content:
          `Existing summary:\n${existing}\n\n` +
          `New messages:\n${overflow.map(m => `${m.role}: ${m.content}`).join("\n")}\n\n` +
          "Create an updated running summary. Keep it short, factual, and include preferences/goals.",
      },
    ];

    this.addEpisode("SUMMARY_CREATED", { overflowMessages: overflow.length });

    const out = await llm.invoke(prompt);
    const summary = String(out.content);

    this.writeTaskSummary(summary);
    await this.writeVector(summary, "task_summary");

    this.shortTerm = keep;
  }

  async routeMemory(userQuery: string) {
    const q = userQuery.toLowerCase();
    let route: "episodic" | "task" | "vector" = "vector";

    if (q.includes("what did we do") || q.includes("previous") || q.includes("earlier")) route = "episodic";
    else if (q.includes("remember") || q.includes("tone") || q.includes("style") || q.includes("goal")) route = "task";

    this.addEpisode("ROUTING_DECISION", { route, userQuery });

    if (route === "task") {
      const t = this.readTask();
      return { route, memoryText: `Task summary:\n${t.summary || "(none)"}\nPreferences:\n${JSON.stringify(t.preferences, null, 2)}` };
    }

    if (route === "episodic") {
      const db = JSON.parse(fs.readFileSync(files.episodes, "utf-8"));
      const last = db.episodes
        .filter((e: any) => e.taskId === this.taskId)
        .slice(-6)
        .map((e: any) => `${e.timestamp}: ${e.type} ${JSON.stringify(e.detail)}`);
      return { route, memoryText: `Recent episodic events:\n${last.join("\n") || "(none)"}` };
    }

    const hit = await this.recallVector(userQuery);
    if (hit) return { route, memoryText: `Vector recall (${hit.tag}, score=${hit.score.toFixed(2)}):\n${hit.text}` };
    return { route, memoryText: "" };
  }
}

async function agentAnswer(taskId: string, userQuery: string) {
  const mem = new MemoryManager(taskId);

  mem.shortTerm.push({ role: "user", content: userQuery });

  await mem.pruneIfNeeded();
  const routed = await mem.routeMemory(userQuery);
  const task = mem.readTask();

  const prompt = [
    {
      role: "user" as const,
      content:
        `You are a helpful assistant for beginners.\n` +
        `Tone: ${task.preferences.tone}. Format: ${task.preferences.format}.\n\n` +
        (routed.memoryText ? `Relevant memory:\n${routed.memoryText}\n\n` : "") +
        `Recent context:\n${mem.shortTerm.map(m => `${m.role}: ${m.content}`).join("\n")}\n\n` +
        "Answer the user clearly.",
    },
  ];

  mem.addEpisode("LLM_CALL", { route: routed.route, shortTermMessages: mem.shortTerm.length });

  const out = await llm.invoke(prompt);
  const answer = String(out.content);

  mem.shortTerm.push({ role: "assistant", content: answer });
  await mem.writeVector(answer, "assistant_answer");

  return answer;
}

// --------- Run Demo ----------
(async () => {
  const taskId = "demo_task_001";

  const q1 = "In simple terms, what is chunking and why do we do it before embeddings?";
  console.log("\nQ1:", q1);
  console.log(await agentAnswer(taskId, q1));

  const q2 = "Remember to keep the writing friendly and beginner-focused.";
  console.log("\nQ2:", q2);
  console.log(await agentAnswer(taskId, q2));

  const q3 = "What did we do earlier in this task?";
  console.log("\nQ3:", q3);
  console.log(await agentAnswer(taskId, q3));
})();