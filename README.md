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

| Day    | Theme                                       | Focus                                                                                                                |
| ------ | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| **1**  | **The Transition**                          | From Software Engineer → AI Engineer — why it matters, mindset shift, and roadmap.                                   |
| **2**  | **The AI Ecosystem**                        | Combine roles: Data Scientist, ML Engineer, AI Engineer + overview of Generative AI, LLMs, and the current AI stack. |
| **3**  | **Inside the Mind of an LLM**               | Understanding tokens, context windows, parameters, temperature, and latency.                                         |
| **4**  | **Prompt Engineering 101**                  | Types of prompts — zero-shot, one-shot, few-shot, chain-of-thought, and role-based — when and why to use each.       |
| **5**  | **Inferencing & Model Behavior**            | What happens when an LLM “thinks”? API requests, context, and cost/performance tradeoffs.                            |
| **6**  | **Embeddings Explained**                    | Turning words into numbers — semantic meaning in vector space.                                                       |
| **7**  | **Vector Spaces in Practice**               | Analogy: “Google Maps of Meaning” — distances, cosine similarity, and semantic relationships.                        |
| **8**  | **Chunking (Merged)**                       | What chunking is, how it works, parameters (chunk size, overlap, preserveSentences), and why it matters.             |
| **9**  | **Metadata and Context Management**         | How metadata improves search, logging, and debugging in RAG pipelines.                                               |
| **10** | **Batching and Ingestion Pipelines**        | Efficiently preparing and uploading large data for embeddings and RAG.                                               |
| **11** | **Vector Databases (Merged)**               | FAISS, Pinecone, Chroma, Weaviate — what they are, differences, and how to use them.                                 |
| **12** | **RAG Fundamentals**                        | Retrieval-Augmented Generation: concept, benefits, and structure.                                                    |
| **13** | **RAG Pipeline (Part 1: Data)**             | Preparing and embedding documents with chunking + metadata.                                                          |
| **14** | **RAG Pipeline (Part 2: Query)**            | Query flow: similarity search → reranking → model response.                                                          |
| **15** | **Search Algorithms Deep Dive**             | KNN, ANN, and Hybrid search — when to use each and trade-offs.                                                       |
| **16** | **Latency, Tokens, and Cost Optimization**  | Techniques to manage response time, API costs, and context limits.                                                   |
| **17** | **Translating Real Problems into AI Tasks** | How to break down business problems into model-friendly workflows.                                                   |
| **18** | **Pre-Trained Models and APIs**             | Understanding model APIs: keys, rate limits, endpoints, context, and billing.                                        |
| **19** | **Local vs Cloud Embeddings**               | Comparing self-hosted (e.g., sentence-transformers) vs managed (OpenAI, Cohere).                                     |
| **20** | **Frameworks for AI Engineering**           | LangChain, LlamaIndex, Dust, and why these frameworks matter.                                                        |
| **21** | **Building with LangChain**                 | Hands-on: Create a simple chain with prompt + LLM + memory.                                                          |
| **22** | **Agents — The AI Workers**                 | Agents vs models — analogy, use cases, and internal reasoning.                                                       |
| **23** | **The ReAct Paradigm**                      | Reason + Act loop — how agents combine logic and tools.                                                              |
| **24** | **Multi-Agent Collaboration**               | How multiple agents communicate to solve complex tasks.                                                              |
| **25** | **Orchestration Frameworks**                | LangGraph, AutoGen, CrewAI — managing multi-agent systems.                                                           |
| **26** | **Evaluation and Testing**                  | Metrics for prompts, responses, hallucinations, and accuracy.                                                        |
| **27** | **AI Safety and Ethics**                    | Responsible AI, bias, privacy, and model misuse prevention.                                                          |
| **28** | **Observability and Tracing**               | How to log, trace, and debug AI pipelines (LangFuse, OpenDevin).                                                     |
| **29** | **Deploying AI Systems**                    | Containerization, scaling, and serving models in production.                                                         |
| **30** | **Final Project: Build Your Own AI App**    | Combine everything — a mini RAG agent built end-to-end with TypeScript + LangChain.                                  |

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
