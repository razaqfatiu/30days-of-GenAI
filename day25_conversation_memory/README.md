# Day 25 — Conversation Memory & Long‑Running Context (Deep Dive)

## 🔄 Connection to Day 24
Day 24 taught us how to plan retrieval for a single answer.
Day 25 extends this across time: what to remember, for how long, and when to recall.

LLMs have no memory by default — memory is an engineering responsibility.

---

## Types of Memory
- Short‑term (conversation)
- Task memory
- Episodic memory
- Long‑term user memory

---

## Memory Scope & Lifetimes
Session, task, user, and system memory must be scoped to avoid pollution.

---

## Memory Write Policies
Only store:
- confirmed facts
- summaries, not raw text
- high‑confidence signals

---

## Storage Strategies
- Text summaries
- Vector memory
- Structured memory

---

## Retrieval Triggers
Recall memory based on intent or similarity, not always.

---

## Context Pruning
Sliding windows and summaries prevent token overflow.

---

## Memory Conflicts
Handle corrections and stale memory safely.

---

## Privacy & Safety
Never store secrets or PII. Support forget‑me flows.

---

## Scripts
```jsonc
"dev:day25:vanilla": "tsx day25_conversation_memory/code.ts",
"dev:day25:framework": "tsx day25_conversation_memory/framework.ts"
```