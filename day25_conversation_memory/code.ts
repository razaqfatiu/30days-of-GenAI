import "dotenv/config";
import readline from "readline";

/**
 * Day 25 — Conversation Memory (Vanilla TS) — Real Implementation
 *
 * ✅ Short-term memory (sliding window)
 * ✅ Session summary (compress old turns)
 * ✅ Long-term user memory (preferences)
 * ✅ Episodic memory (vector-like similarity recall)
 * ✅ Intent routing (what memory to fetch)
 * ✅ Token budgeting / pruning
 * ✅ Write policies + conflict updates
 * ✅ PII redaction
 *
 * Run:
 *   npm run dev:day25:vanilla
 */

type Role = "user" | "assistant";
type Message = { role: Role; content: string; ts: number };

type MemoryScope = "session" | "task" | "user" | "episodic";
type MemoryItem = {
  id: string;
  scope: MemoryScope;
  content: string; // store summaries, not raw sensitive content
  meta: Record<string, any>;
  confidence: number;
  ts: number;
};

function now() {
  return Date.now();
}

function estimateTokens(text: string) {
  return Math.ceil(text.length / 4);
}

function redactPII(text: string) {
  return text
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, "[REDACTED_EMAIL]")
    .replace(/\+?\d[\d\s()-]{8,}\d/g, "[REDACTED_PHONE]")
    .replace(/sk-[a-zA-Z0-9]{10,}/g, "[REDACTED_API_KEY]");
}

function hashStr(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function embed(text: string, dims = 256): number[] {
  const v = new Array(dims).fill(0);
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);

  for (const t of tokens) v[hashStr(t) % dims] += 1;

  const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0)) || 1;
  return v.map((x) => x / norm);
}

function cosine(a: number[], b: number[]) {
  let s = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) s += a[i] * b[i];
  return s;
}

// -------------------- Stores --------------------
const messages: Message[] = [];
let sessionSummary = "";

const userProfile: Record<string, any> = {
  preferredStyle: "clear",
  preferredLength: "short",
};

const memoryLog: MemoryItem[] = [];
const episodicStore: Array<{ item: MemoryItem; vector: number[] }> = [];

// -------------------- Intent routing --------------------
type Intent = "preference" | "profile" | "followup" | "new_task" | "general" | "forget";

function classifyIntent(userText: string): Intent {
  const t = userText.toLowerCase();
  if (t.startsWith("/forget")) return "forget";
  if (t.includes("i prefer") || t.includes("keep it") || t.includes("please be")) return "preference";
  if (t.includes("i am") || t.includes("i'm") || t.includes("i use") || t.includes("my stack")) return "profile";
  if (t.includes("now") || t.includes("continue") || t.includes("compare") || t.includes("as you said")) return "followup";
  if (t.startsWith("/newtask") || t.includes("new task")) return "new_task";
  return "general";
}

// -------------------- Write policies --------------------
function shouldWriteMemory(scope: MemoryScope, confidence: number) {
  if (scope === "user") return confidence >= 0.8;
  if (scope === "episodic") return confidence >= 0.7;
  if (scope === "task") return confidence >= 0.7;
  if (scope === "session") return confidence >= 0.6;
  return false;
}

function writeMemory(item: MemoryItem) {
  const safe = { ...item, content: redactPII(item.content) };
  if (!shouldWriteMemory(safe.scope, safe.confidence)) return;

  memoryLog.push(safe);

  if (safe.scope === "episodic") {
    episodicStore.push({ item: safe, vector: embed(safe.content) });
  }
}

// -------------------- Profile conflicts / updates --------------------
function updateUserProfileFromText(userText: string) {
  const t = userText.toLowerCase();

  // length preference
  if (t.includes("short") || t.includes("concise")) userProfile.preferredLength = "short";
  if (t.includes("more detail") || t.includes("long") || t.includes("in depth")) userProfile.preferredLength = "long";

  // style preference
  if (t.includes("simple") || t.includes("beginner")) userProfile.preferredStyle = "simple";
  if (t.includes("formal")) userProfile.preferredStyle = "formal";
}

// -------------------- Sliding window + summary --------------------
const WINDOW_SIZE = 8;

function getWindowMessages() {
  return messages.slice(-WINDOW_SIZE);
}

function refreshSessionSummary() {
  const older = messages.slice(0, Math.max(0, messages.length - WINDOW_SIZE));
  if (older.length === 0) return;

  const userText = older.filter((m) => m.role === "user").map((m) => m.content).join("\n");
  const topics = ["rag", "embedding", "vector", "bm25", "agent", "memory", "chunking"].filter((k) =>
    userText.toLowerCase().includes(k)
  );

  sessionSummary = `Session summary: user discussed ${topics.join(", ") || "various topics"}.`;
}

// -------------------- Episodic retrieval --------------------
function retrieveEpisodic(query: string, k = 3, minSim = 0.2): MemoryItem[] {
  if (episodicStore.length === 0) return [];
  const qv = embed(query);
  return episodicStore
    .map((e) => ({ item: e.item, score: cosine(qv, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .filter((x) => x.score >= minSim)
    .slice(0, k)
    .map((x) => x.item);
}

// -------------------- Context assembly + budgeting --------------------
function assembleContext(userText: string, budgetTokens = 900) {
  const system =
    "You are a helpful assistant for beginners. Be clear and practical. " +
    "Never store secrets or PII. If unsure, say you don't know.";

  const profile = `User preferences: style=${userProfile.preferredStyle}, length=${userProfile.preferredLength}.`;
  const summary = sessionSummary || "Session summary: (none yet).";

  // retrieve episodic only when it helps (simple heuristic)
  const episodicItems = retrieveEpisodic(userText, 3);
  const episodic = episodicItems.length
    ? "Relevant past notes:\n" + episodicItems.map((m) => `- ${m.content}`).join("\n")
    : "Relevant past notes: (none).";

  const recentChat = getWindowMessages().map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n");

  // budget in priority order
  const parts = [
    { name: "system", text: system },
    { name: "profile", text: profile },
    { name: "summary", text: summary },
    { name: "episodic", text: episodic },
    { name: "recentChat", text: recentChat },
  ];

  let used = 0;
  const kept: Record<string, string> = {};

  for (const p of parts) {
    const t = estimateTokens(p.text);
    if (used + t <= budgetTokens) {
      kept[p.name] = p.text;
      used += t;
    } else {
      const remaining = Math.max(0, budgetTokens - used);
      const approxChars = remaining * 4;
      kept[p.name] = p.text.slice(0, approxChars) + "\n[...truncated for budget...]";
      used += estimateTokens(kept[p.name]);
      break;
    }
  }

  return { ...kept, usedTokens: used };
}

// -------------------- Reflection (before answering) --------------------
function reflectBeforeAnswer(ctx: any) {
  // Demo reflection: if we have *no* recent chat, we're missing context
  if (!ctx.recentChat) return { ok: false, reason: "No recent chat context available." };
  return { ok: true };
}

// -------------------- Assistant reply (demo) --------------------
function reply(userText: string, ctx: any) {
  const memoryUsed = [
    ctx.profile ? "profile" : null,
    ctx.summary && !ctx.summary.includes("(none") ? "session summary" : null,
    ctx.episodic && !ctx.episodic.includes("(none") ? "episodic memory" : null,
    ctx.recentChat ? "recent chat window" : null,
  ].filter(Boolean);

  const meta = `Memory used: ${memoryUsed.join(", ") || "none"} (≈${ctx.usedTokens} tokens).`;

  let answer = "";
  const t = userText.toLowerCase();
  if (t.includes("how") && t.includes("memory")) {
    answer =
      "Use a sliding window for the last few turns, summarize older messages into a session summary, store stable preferences in a user profile, and store important episodes in vector memory for later recall. Retrieve memory only when relevant and prune to a token budget.";
  } else {
    answer = "Got it. Ask your next question—I'll use the right memory at the right time.";
  }

  const style = userProfile.preferredStyle;
  const length = userProfile.preferredLength;

  return `Style=${style}, Length=${length}\n${meta}\n\nAnswer: ${answer}`;
}

// -------------------- Commands --------------------
function helpText() {
  return [
    "Commands:",
    "  /help       show commands",
    "  /profile    show stored user profile",
    "  /mem        show memory log",
    "  /newtask    clear task memory (demo) + refresh summary",
    "  /forget     clear stored memory",
    "  /exit       quit",
  ].join("\n");
}

function clearTaskMemory() {
  const kept = memoryLog.filter((m) => m.scope !== "task");
  memoryLog.length = 0;
  memoryLog.push(...kept);
}

function forgetAllMemory() {
  userProfile.preferredStyle = "clear";
  userProfile.preferredLength = "short";
  episodicStore.length = 0;
  memoryLog.length = 0;
  sessionSummary = "";
}

// -------------------- Chat loop --------------------
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

console.log("✅ Day 25 — Conversation Memory (Vanilla) — started");
console.log("Type /help for commands.\n");

function prompt() {
  rl.question("> ", (input) => onUserInput(input.trim()));
}

function onUserInput(input: string) {
  if (!input) return prompt();

  if (input === "/exit") return rl.close();
  if (input === "/help") {
    console.log(helpText());
    return prompt();
  }
  if (input === "/profile") {
    console.log("User profile:", userProfile);
    return prompt();
  }
  if (input === "/mem") {
    console.log("Memory log:", memoryLog);
    return prompt();
  }
  if (input === "/newtask") {
    clearTaskMemory();
    refreshSessionSummary();
    console.log("✅ New task started (task memory cleared).");
    return prompt();
  }
  if (input === "/forget") {
    forgetAllMemory();
    console.log("✅ All stored memory cleared.");
    return prompt();
  }

  messages.push({ role: "user", content: input, ts: now() });
  refreshSessionSummary();

  const intent = classifyIntent(input);

  // Write profile memory (with conflict handling)
  if (intent === "preference" || intent === "profile") {
    updateUserProfileFromText(input);

    writeMemory({
      id: `user_${now()}`,
      scope: "user",
      content: `User update: ${input}`,
      meta: { intent },
      confidence: 0.9,
      ts: now(),
    });
  }

  // Store episodic memory for notable events (followups/task signals)
  if (intent === "followup" || intent === "new_task") {
    writeMemory({
      id: `ep_${now()}`,
      scope: "episodic",
      content: `Episode: ${input}`,
      meta: { intent },
      confidence: 0.8,
      ts: now(),
    });
  }

  const ctx = assembleContext(input, 900);
  const reflection = reflectBeforeAnswer(ctx);

  let output = "";
  if (!reflection.ok) {
    output = `I need more context: ${reflection.reason}`;
  } else {
    output = reply(input, ctx);
  }

  messages.push({ role: "assistant", content: output, ts: now() });
  console.log("\n" + output + "\n");
  prompt();
}

prompt();