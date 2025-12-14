import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

/**
 * Day 18 — Agent Memory (Vanilla TypeScript)
 *
 * Implements:
 * - Episodic memory (event log)
 * - Task memory (goal/preferences/summaries per task)
 * - Vector memory (embeddings + similarity recall)
 * - Memory routing (choose which memory to retrieve)
 * - Context pruning (keep recent messages, summarize older into task memory)
 *
 * Notes:
 * - Uses OpenAI HTTP API via fetch (no OpenAI SDK dependency).
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ Missing OPENAI_API_KEY in .env");
  process.exit(1);
}

type Role = "system" | "user" | "assistant";
type ChatMessage = { role: Role; content: string };

type EpisodeEvent =
  | { type: "ROUTING_DECISION"; detail: any }
  | { type: "SUMMARY_CREATED"; detail: any }
  | { type: "VECTOR_WRITE"; detail: any }
  | { type: "LLM_CALL"; detail: any }
  | { type: "ERROR"; detail: any };

const files = {
  episodes: path.join(__dirname, "day18_episodes.json"),
  task: path.join(__dirname, "day18_task_memory.json"),
  vectors: path.join(__dirname, "day18_vector_memory.json"),
};

// --------- File helpers ----------
function ensureFile(filePath: string, initial: any) {
  if (!fs.existsSync(filePath)) {
    fs.writeFileSync(filePath, JSON.stringify(initial, null, 2), "utf-8");
  }
}

ensureFile(files.episodes, { episodes: [] });
ensureFile(files.task, { tasks: {} });
ensureFile(files.vectors, { vectors: [] });

// --------- Math helpers ----------
function cosine(a: number[], b: number[]) {
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

// --------- OpenAI helpers ----------
async function openAiChat(messages: ChatMessage[], temperature = 0) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      temperature,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI chat error ${res.status}: ${t}`);
  }
  return res.json();
}

async function openAiEmbed(text: string) {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!res.ok) {
    const t = await res.text();
    throw new Error(`OpenAI embeddings error ${res.status}: ${t}`);
  }

  const json = await res.json();
  return json.data[0].embedding as number[];
}

// --------- Memory Manager ----------
class MemoryManager {
  shortTerm: ChatMessage[] = []; // in-memory buffer
  maxShortTerm = 8; // pruning threshold (keep last N messages)
  taskId: string;

  constructor(taskId: string) {
    this.taskId = taskId;
    this.initTask();
  }

  initTask() {
    const db = JSON.parse(fs.readFileSync(files.task, "utf-8"));
    if (!db.tasks[this.taskId]) {
      db.tasks[this.taskId] = {
        goal: "Answer user questions clearly and in simple terms.",
        preferences: {
          tone: "friendly",
          format: "short paragraphs + bullets when useful",
        },
        summary: "",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      fs.writeFileSync(files.task, JSON.stringify(db, null, 2));
    }
  }

  addEpisode(event: EpisodeEvent) {
    const db = JSON.parse(fs.readFileSync(files.episodes, "utf-8"));
    db.episodes.push({
      timestamp: new Date().toISOString(),
      taskId: this.taskId,
      event,
    });
    fs.writeFileSync(files.episodes, JSON.stringify(db, null, 2));
  }

  readTaskMemory() {
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
    const embedding = await openAiEmbed(text);
    const db = JSON.parse(fs.readFileSync(files.vectors, "utf-8"));
    db.vectors.push({
      taskId: this.taskId,
      tag,
      text,
      embedding,
      createdAt: new Date().toISOString(),
    });
    fs.writeFileSync(files.vectors, JSON.stringify(db, null, 2));
    this.addEpisode({ type: "VECTOR_WRITE", detail: { tag, chars: text.length } });
  }

  async recallVector(query: string, threshold = 0.78) {
    const qEmb = await openAiEmbed(query);
    const db = JSON.parse(fs.readFileSync(files.vectors, "utf-8"));

    let best = { score: -1, text: "", tag: "" };

    for (const item of db.vectors) {
      const score = cosine(qEmb, item.embedding);
      if (score > best.score) best = { score, text: item.text, tag: item.tag };
    }

    if (best.score >= threshold) return best;
    return null;
  }

  // --------- Context pruning ----------
  async pruneIfNeeded() {
    if (this.shortTerm.length <= this.maxShortTerm) return;

    // overflow = old messages to compress
    const overflow = this.shortTerm.slice(0, this.shortTerm.length - this.maxShortTerm);
    const keep = this.shortTerm.slice(-this.maxShortTerm);

    const existing = this.readTaskMemory()?.summary || "";

    const prompt: ChatMessage[] = [
      {
        role: "system",
        content:
          "You summarize conversation history into a compact running summary for an AI agent. " +
          "Keep it short, factual, and include decisions, preferences, and goals.",
      },
      {
        role: "user",
        content:
          `Existing summary:\n${existing}\n\n` +
          `New messages:\n${overflow.map(m => `${m.role}: ${m.content}`).join("\n")}\n\n` +
          "Return an updated running summary.",
      },
    ];

    this.addEpisode({ type: "SUMMARY_CREATED", detail: { overflowMessages: overflow.length } });
    const out = await openAiChat(prompt, 0);
    const summary = out.choices[0].message.content as string;

    // Write summary into task memory and vector memory
    this.writeTaskSummary(summary);
    await this.writeVector(summary, "task_summary");

    // Keep only the latest N messages
    this.shortTerm = keep;
  }

  // --------- Memory routing ----------
  async routeMemory(userQuery: string) {
    const q = userQuery.toLowerCase();

    // Decide which memory to retrieve
    let route: "episodic" | "task" | "vector" = "vector";
    if (q.includes("what did we do") || q.includes("previous") || q.includes("earlier")) {
      route = "episodic";
    } else if (q.includes("remember") || q.includes("tone") || q.includes("style") || q.includes("goal")) {
      route = "task";
    } else {
      route = "vector";
    }

    this.addEpisode({ type: "ROUTING_DECISION", detail: { route, userQuery } });

    if (route === "task") {
      const t = this.readTaskMemory();
      return {
        route,
        memoryText:
          `Task summary:\n${t.summary || "(none)"}\n\n` +
          `Preferences:\n${JSON.stringify(t.preferences, null, 2)}`,
      };
    }

    if (route === "episodic") {
      const db = JSON.parse(fs.readFileSync(files.episodes, "utf-8"));
      const last = db.episodes
        .filter((e: any) => e.taskId === this.taskId)
        .slice(-6)
        .map((e: any) => `${e.timestamp}: ${e.event.type} ${JSON.stringify(e.event.detail)}`);
      return { route, memoryText: `Recent episodic events:\n${last.join("\n") || "(none)"}` };
    }

    // vector recall
    const hit = await this.recallVector(userQuery);
    if (hit) {
      return { route, memoryText: `Vector recall (${hit.tag}, score=${hit.score.toFixed(2)}):\n${hit.text}` };
    }
    return { route, memoryText: "" };
  }
}

// --------- Demo “agent” pipeline ----------
async function agentAnswer(taskId: string, userQuery: string) {
  const mem = new MemoryManager(taskId);

  // Add the user message to short-term memory
  mem.shortTerm.push({ role: "user", content: userQuery });

  // Context pruning (summarize older messages if needed)
  await mem.pruneIfNeeded();

  // Route memory (episodic vs task vs vector)
  const routed = await mem.routeMemory(userQuery);

  const task = mem.readTaskMemory();

  // Final prompt uses ONLY:
  // - routed memory (one slice)
  // - recent short-term messages (pruned window)
  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful assistant for beginners. Explain things in simple terms.\n" +
        `Tone: ${task.preferences.tone}. Format: ${task.preferences.format}.`,
    },
    ...(routed.memoryText ? [{ role: "system" as const, content: `Relevant memory:\n${routed.memoryText}` }] : []),
    ...mem.shortTerm,
  ];

  mem.addEpisode({
    type: "LLM_CALL",
    detail: { route: routed.route, shortTermMessages: mem.shortTerm.length },
  });

  const out = await openAiChat(messages, 0);
  const answer = out.choices[0].message.content as string;

  // Store assistant output into short-term and vector memory
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