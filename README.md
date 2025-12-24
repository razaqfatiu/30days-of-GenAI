# From Software Engineer to AI Engineer — 30 Days of GenAI

Welcome to the **“From Software Engineer to AI Engineer”** learning challenge!  
This repository accompanies a 30-day LinkedIn series designed to help software developers transition into AI engineering — with daily analogies, theory, and TypeScript code.

---

## 🧠 What You’ll Learn

- Fundamentals of Generative AI (LLMs, Embeddings, RAG, Agents)
- How to translate real-world problems into AI tasks
- Building and testing AI apps using TypeScript
- Frameworks like LangChain, LlamaIndex, and more
- Evaluation, optimization, and deployment of AI systems

---

## 📁 Repository Structure

```
genai-30-days/
├─ README.md
├─ package.json
├─ tsconfig.json
├─ .env.sample
└─ day1_transition/
   ├─ README.md
   ├─ code.ts
   └─ framework.ts
```

> Each folder corresponds to a day in the series, containing both **vanilla TypeScript** and **framework-based** implementations.

---

## 🗓️ 30-Day Breakdown: From Software Engineer → AI Engineer

| Day | Theme | Focus |
|----:|-------|-------|
| 1 | The Transition | From Software Engineer → AI Engineer — why it matters, mindset shift, and roadmap. |
| 2 | The AI Ecosystem | Combine roles: Data Scientist, ML Engineer, AI Engineer + overview of Generative AI, LLMs, and the current AI stack. |
| 3 | Models & LLM Basics | What models are, how LLMs work, parameters, tokens, and context. |
| 4 | Prompt Engineering | Prompt types, instruction anchoring, choosing the right prompting technique. |
| 5 | Inferencing & Providers | How inference works, API calls, latency, cost, and multi-provider strategies. |
| 6 | Embeddings | What embeddings are, how similarity works, and real-world use cases. |
| 7 | Chunking & Metadata | Chunking strategies (fixed, semantic), metadata, and why they matter. |
| 8 | Vector Databases | Vector DB concepts, indexing, CRUD, and local vs managed options. |
| 9 | Ingestion Pipelines | Cleaning, normalization, batching, and upserts for vector data. |
| 10 | Similarity Search | kNN, ANN, HNSW, IVF, PQ, and hybrid search strategies. |
| 11 | RAG Fundamentals | Building an end-to-end Retrieval-Augmented Generation pipeline. |
| 12 | Evaluation & Cost | RAG evaluation metrics, latency breakdown, and cost basics. |
| 13 | Safety & Guardrails | Prompt injection, moderation, and safety patterns. |
| 14 | Intro to Agents | Reasoning + acting, tools, and agent fundamentals. |
| 15 | Structured Tool Calling | Tool schemas, validation, and safe execution. |
| 16 | Advanced Tool Calling | Chaining tools, parallel calls, routing, and correctness strategies. |
| 17 | Multi-Agent Systems | Agent teams, roles, messaging, and supervision. |
| 18 | Agent Memory | Episodic, vector, and task memory with pruning. |
| 19 | Agent Orchestration | LangGraph, LCEL, DAG-based workflows, branching logic. |
| 20 | Testing & Tracing | Logging agent steps, tracing, and debugging failures. |
| 21 | Production Guardrails | Policy enforcement, reliability patterns, and HITL. |
| 22 | Deployment & Scaling | REST, GraphQL, SQL, third-party APIs, auth, and safety constraints. |
| 23 | Advanced RAG | Query rewriting, hybrid retrieval, reranking, context assembly. |
| 24 | Query Planning | Multi-hop RAG and decomposing complex questions. |
| 25 | Conversation Memory | Long-running context, summaries, and sliding windows. |
| 26 | Cost Optimization | Caching, batching, token budgeting, and performance tuning. |
| 27 | Model Routing | Dynamic model selection, fallbacks, and degraded modes. |
| 28 | AI Security | Data isolation, secrets, and tenant safety. |
| 29 | System Architecture | End-to-end production AI system design. |
| 30 | Capstone | Build and ship a production-ready AI agent. |

---

## 🔐 Environment Variables

Copy `.env.sample` to `.env` and fill:

```
OPENAI_API_KEY=your_openai_api_key_here
# MODEL_NAME=gpt-4o-mini
# OPENAI_BASE_URL=https://api.openai.com/v1
```

---

## 🔗 Stay Connected

Follow the series on **LinkedIn** and ⭐ the repo for updates.

- [day02_ai_ecosystem](./day02_ai_ecosystem)

- [day03_llm_mind](./day03_llm_mind)

- [day04_prompt_engineering](./day04_prompt_engineering)

- [day05_inferencing](./day05_inferencing)

- [day06_embeddings](./day06_embeddings)

- [day07_chunking](./day07_chunking)

- [day08_vector_db](./day08_vector_db)

- [day09_ingestion_pipeline](./day09_ingestion_pipeline)

- [day10_similarity_search](./day10_similarity_search)

- [day11_rag_pipeline](./day11_rag_pipeline)

- [day12_evaluation_metrics](./day12_evaluation_metrics)

- [day13_guardrails_safety](./day13_guardrails_safety)

- [day14_intro_agents](./day14_intro_agents)

- [day15_structured_tool_calling](./day15_structured_tool_calling)

- [day16_advanced_tool_calling](./day16_advanced_tool_calling)

- [day17_multi_agent_systems](./day17_multi_agent_systems)

- [day18_agent_memory](./day18_agent_memory)

- [day19_agent_orchestration](./day19_agent_orchestration)

- [day20_testing_tracing](./day20_testing_tracing)

- [day21_guardrails_safety](./day21_guardrails_safety)

- [day22_deployment_scaling](./day22_deployment_scaling)

- [day23_advanced_rag](./day23_advanced_rag)

- [day24_query_planning](./day24_query_planning)

- [day25_conversation_memory](./day25_conversation_memory)

- [day26_cost_performance](./day26_cost_performance)

- [day27_deployment_scaling](./day27_deployment_scaling)
