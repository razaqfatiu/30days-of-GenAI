import "dotenv/config";

/**
 * Day 25 — Conversation Memory (Framework-style) — FIXED IMPORTS
 *
 * ✅ Fix: we DO NOT import memory helpers from LangChain (paths change by version).
 * Instead we implement SlidingWindowMemory ourselves, and keep LangChain usage to
 * stable packages:
 *   - @langchain/openai
 *   - @langchain/core/messages
 *
 * Demonstrates:
 * - Short-term memory: sliding window of recent turns
 * - Long-term (episodic) memory: vector-like store + similarity retrieval
 * - Safe prompt assembly: system rules + profile + recalled memory + recent chat
 */

import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, AIMessage, SystemMessage } from "@langchain/core/messages";

type ChatMsg = HumanMessage | AIMessage;

type UserProfile = {
  preferredStyle: "simple" | "clear" | "formal";
  preferredLength: "short" | "long";
};

// ---------------------------
// Utilities (PII redaction + tiny vector memory)
// ---------------------------

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

/**
 * Demo embedding: hashed bag-of-words into a fixed vector.
 * (Not a real embedding model, but it teaches the mechanics of vector memory.)
 */
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

// ---------------------------
// Short-term memory (sliding window)
// ---------------------------

class SlidingWindowMemory {
  private history: ChatMsg[] = [];
  constructor(private k: number) {}

  add(msg: ChatMsg) {
    this.history.push(msg);
    if (this.history.length > this.k) this.history.shift();
  }

  get(): ChatMsg[] {
    return [...this.history];
  }
}

// ---------------------------
// Long-term episodic vector memory (local)
// ---------------------------

type EpisodicItem = { content: string; ts: number; confidence: number; vector: number[] };

class VectorMemoryStore {
  private items: EpisodicItem[] = [];

  write(rawContent: string, confidence = 0.8) {
    if (confidence < 0.7) return; // write policy
    const content = redactPII(rawContent);
    this.items.push({ content, ts: Date.now(), confidence, vector: embed(content) });
  }

  retrieve(query: string, k = 3, minSim = 0.2): EpisodicItem[] {
    const qv = embed(query);
    return this.items
      .map((i) => ({ ...i, sim: cosine(qv, i.vector) }))
      .sort((a, b) => b.sim - a.sim)
      .filter((x) => x.sim >= minSim)
      .slice(0, k);
  }
}

// ---------------------------
// Prompt assembly helpers
// ---------------------------

function formatRecentChat(msgs: ChatMsg[]) {
  return msgs
    .map((m) => {
      const type = m._getType(); // "human" | "ai" | "system"
      const label = type === "human" ? "USER" : type === "ai" ? "ASSISTANT" : "SYSTEM";
      return `${label}: ${String(m.content)}`;
    })
    .join("\n");
}

// NOTE: Using template literal inside JS string requires backticks; keep helper simple:
function formatRecentChatSafe(msgs: ChatMsg[]) {
  return msgs
    .map((m) => {
      const type = m._getType();
      const label = type === "human" ? "USER" : type === "ai" ? "ASSISTANT" : "SYSTEM";
      return `${label}: ${String(m.content)}`;
    })
    .join("\n");
}

async function main() {
  const llm = new ChatOpenAI({
    modelName: process.env.OPENAI_MODEL ?? "gpt-4o-mini",
    temperature: 0,
  });

  const shortTerm = new SlidingWindowMemory(8);
  const longTerm = new VectorMemoryStore();

  // Structured profile memory (long-lived)
  const profile: UserProfile = { preferredStyle: "simple", preferredLength: "short" };

  // Seed episodic memory (simulate prior sessions)
  longTerm.write("User prefers concise, beginner-friendly explanations.", 0.95);
  longTerm.write("Previously discussed RAG, hybrid retrieval, and query planning.", 0.85);

  // Simulated new user turn
  const userText = "I want a long-running assistant. How do I store and recall memory safely?";

  shortTerm.add(new HumanMessage(userText));

  // Recall relevant episodic memories
  const recalled = longTerm.retrieve(userText, 3, 0.15);
  const recalledBlock = recalled.length ? recalled.map((r) => `- ${r.content}`).join("\n") : "(none)";

  const systemRules = [
    "You are a helpful assistant for beginners.",
    "Be clear and practical.",
    "Never store secrets or PII.",
    "If unsure, say you don't know.",
  ].join(" ");

  // Build a message-based prompt (preferred for chat models)
  const prompt = [
    { role: "system" as const, content: systemRules },
    { role: "system" as const, content: `User profile: style=${profile.preferredStyle}, length=${profile.preferredLength}` },
    { role: "system" as const, content: `Recalled long-term memory:\n${recalledBlock}` },
    { role: "system" as const, content: "Recent chat:\n" + formatRecentChatSafe(shortTerm.get()) },
    { role: "user" as const, content: userText },
  ];

  let answerText = "";
  try {
    const res = await llm.invoke(prompt);
    answerText = String(res.content);
  } catch {
    answerText =
      "(LLM call skipped — set OPENAI_API_KEY to run. " +
      "Memory + prompt assembly still works and is printed below.)";
  }

  shortTerm.add(new AIMessage(answerText));

  console.log("=== Recalled long-term memory ===");
  console.log(recalledBlock);
  console.log("\n=== Recent chat (short-term window) ===");
  console.log(formatRecentChatSafe(shortTerm.get()));
  console.log("\n=== Assistant answer ===");
  console.log(answerText);
}

main().catch(console.error);
