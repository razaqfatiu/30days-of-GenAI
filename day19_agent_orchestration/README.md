# Day 19 — Agent Orchestration Frameworks
**LangGraph • LCEL • DAG Workflows • Branching Logic**

## 🔄 Connection to Day 18
Day 18 added **memory** (episodic/task/vector) so agents can *remember* and *stay consistent*.

Day 19 answers the next engineering question:

> “How do we build **reliable multi-step agent workflows** that are **observable**, **branch**, **run in parallel**, and **don’t turn into spaghetti code**?”

That’s what **orchestration** is.

---

## 🧠 What “Orchestration” Means
Orchestration is how you coordinate:
- **steps** (nodes),
- **data** (state),
- **control flow** (edges),
- **branching** (if/else decisions),
- **parallel work** (fan-out),
- and **retries/guardrails** (reliability).

Think of it as building a **workflow engine** for AI tasks.

---

## ✅ Concepts Covered Today

### 1) DAG-based workflows
A **DAG (Directed Acyclic Graph)** is a set of nodes connected by edges:
- nodes = tasks (classify, retrieve, answer, evaluate…)
- edges = order of execution
- DAGs are great for **pipelines**, **fan-out/fan-in**, and **parallelism**

### 2) Branching logic
Your workflow shouldn’t run every step every time.
Example:
- If question needs external knowledge → run retrieval path
- Else → answer directly

This is “conditional routing”.

### 3) LangGraph (graph orchestration for agents)
LangGraph provides:
- **StateGraph** (nodes update shared state)
- **START / END** nodes
- **Conditional edges** for branching
- **Parallel execution** of multiple nodes in a “superstep”

Official docs show `StateGraph`, `START`, `END`, and `addConditionalEdges`.  
Refs: https://docs.langchain.com/oss/javascript/langgraph/graph-api

### 4) LangChain Expression Language (LCEL)
LCEL is a **composable chain syntax** that feels like Unix pipes:
- `prompt | llm | parser`

It supports:
- **RunnableSequence** (linear pipelines)
- **RunnableParallel** (parallel pipelines)
- **RunnableBranch** (if/else routing)

Refs:
- RunnableBranch: https://v03.api.js.langchain.com/classes/_langchain_core.runnables.RunnableBranch.html
- LCEL overview: https://www.pinecone.io/learn/series/langchain/langchain-expression-language/

---

## 📂 Files in this folder
- `README.md` — this guide
- `code.ts` — Vanilla TypeScript DAG engine + branching + parallel fan-out
- `framework.ts` — LangGraph StateGraph + LCEL (RunnableBranch + RunnableParallel)

---

## 🚀 package.json scripts

```jsonc
"dev:day19:vanilla": "tsx day19_agent_orchestration/code.ts",
"dev:day19:framework": "tsx day19_agent_orchestration/framework.ts"
```

---

## 🔑 .env
```bash
OPENAI_API_KEY=your_openai_key_here
```

---

## 📚 Extra References
- LangGraph overview: https://docs.langchain.com/oss/javascript/langgraph/overview
- LangGraph quickstart: https://docs.langchain.com/oss/javascript/langgraph/quickstart
- LangChain JS API reference: https://v03.api.js.langchain.com/