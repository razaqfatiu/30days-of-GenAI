# Day 18 — Agent Memory: Episodic, Vector, Task Memory + Routing & Context Pruning

## 🔄 Connection to Day 17
Day 17 introduced **multi-agent systems** (specialized roles + supervising agent).  
But teams without memory are like coworkers with amnesia: they repeat work, forget decisions, and lose consistency.

Day 18 adds **memory layers** so agents can:
- remember **what happened** (episodic),
- remember **what we’re doing** (task memory),
- remember **related knowledge** (vector memory),
- choose **which memory to use** (routing),
- and stay within token limits (**context pruning**).

---

## 🧠 Memory Types

### 1) Episodic Memory — “What happened?”
A chronological log of important events:
- routing decisions,
- tool/agent inputs and outputs,
- errors,
- intermediate results.

**Why it matters**
- debugging (“why did the agent do that?”),
- audits and traceability,
- evaluation and improvement.

Stored as: `day18_episodes*.json`

---

### 2) Task Memory — “What are we doing?”
Task memory captures:
- the current goal,
- constraints and preferences,
- summaries of older conversation context,
- progress state (done / pending).

**Why it matters**
- consistent tone and structure,
- avoids repeating decisions,
- stabilizes multi-step workflows.

Stored as: `day18_task_memory*.json`

---

### 3) Vector Memory — “What’s similar to this?”
Vector memory stores embeddings for notes, summaries, and answers.  
Later, we use similarity search to recall semantically related items.

**Why it matters**
- recall works even without matching keywords,
- enables “semantic recall” (chunking ↔ retrieval ↔ embeddings),
- underpins memory-driven agents and RAG.

Stored as: `day18_vector_memory*.json`

---

## 🧭 Memory Routing — “Which memory should we use?”
A common beginner mistake is: *dump all memory into the prompt*.  
That increases cost and can reduce accuracy.

Instead, we route:

- If user asks **“what did we do earlier / previous steps?”**
  → use **episodic memory**.
- If user asks **“remember style / tone / goal?”**
  → use **task memory**.
- Otherwise
  → try **vector recall**.

Implemented in both `code.ts` and `framework.ts`.

---

## ✂️ Context Pruning — “How do we avoid context overflow?”
Context windows are limited and tokens cost money.

We implement a pruning strategy:
- keep only the most recent N messages in **short-term memory**,
- summarize older messages into **task memory**,
- store that summary in vector memory so it can be recalled later.

This improves:
- latency,
- cost,
- and reduces “lost in context” failures.

---

## 📂 Files
- `README.md` — this guide
- `code.ts` — Vanilla TypeScript (OpenAI HTTP calls + file-based memory)
- `framework.ts` — LangChain wrappers (ChatOpenAI + OpenAIEmbeddings)

---

## 🚀 package.json scripts

```jsonc
"dev:day18:vanilla": "tsx day18_agent_memory/code.ts",
"dev:day18:framework": "tsx day18_agent_memory/framework.ts"
```

---

## 🔑 .env
```bash
OPENAI_API_KEY=your_openai_key_here
```

---

## 📚 References
- OpenAI Embeddings guide: https://platform.openai.com/docs/guides/embeddings
- OpenAI Function calling & tool patterns: https://platform.openai.com/docs/guides/function-calling
- LangChain JS docs: https://js.langchain.com/
- LangGraph (memory/state concepts): https://js.langchain.com/docs/langgraph/