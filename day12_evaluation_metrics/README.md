
# Day 12 — Evaluating RAG: Quality, Latency, and Cost

## 🔄 Connection To Previous Days

- **Day 6–10** gave us: embeddings, chunking, vector DBs, ingestion, and similarity search.
- **Day 11** wired everything into a working **RAG pipeline** (Retrieval + Generation).

Now that we can *answer* questions, the next step as an **AI Engineer** is:

> “Is this system any good — and how much does it *cost* to run?”

Day 12 is about **measuring**, not just building.

---

## 🎯 What You’ll Learn Today

We’ll focus on three dimensions:

1. **Quality metrics** (How good are the answers?)
2. **Latency metrics** (How fast is the pipeline?)
3. **Cost / Token metrics** (How expensive is each query?)

You’ll see:

- How to instrument your RAG pipeline with simple timing.
- How to log which chunks were retrieved (for debugging).
- How to capture token usage from the OpenAI API (for cost estimation).
- How frameworks vs. vanilla differ in where you plug in metrics.

---

## 🧪 Key Concepts

### 1️⃣ Quality Metrics (Human + Heuristic)

These usually need **human judgment**, but we can assist with structure:

- **Relevance** – Does the answer address the question?
- **Groundedness / Faithfulness** – Is the answer supported by the retrieved context?
- **Context Utilization** – Is the context actually used, or is the model hallucinating?
- **Coverage** – Does the answer use all relevant chunks, or just one?

Basic approach:

- Prepare a **small evaluation set**: (question, expected answer or keywords).
- Run your RAG pipeline for each question.
- Manually rate / compare.
- Optionally log everything to a JSON file for later analysis.

In this day’s code, we show how to log **retrieved chunks and scores** to make manual eval easier.

---

### 2️⃣ Latency Metrics

Latency is **time per query**, broken down by stages:

- Embedding latency (question → vector)
- Retrieval latency (search in vector DB / JSON store)
- LLM latency (generation time)
- Total end-to-end latency

We measure these using `Date.now()` in vanilla and timing around calls in the framework version.

You’ll see metrics like:

- `embedMs`
- `retrievalMs`
- `llmMs`
- `totalMs`

In production, you’d also track:

- p50 / p90 / p99 latency
- timeout rates
- error rates

---

### 3️⃣ Cost / Token Metrics

OpenAI responses often include a `usage` object with fields like:

- `prompt_tokens`
- `completion_tokens`
- `total_tokens`

We can log these to understand:

- How many tokens the context + question consume.
- How many tokens the answer consumes.
- Which queries are most expensive.

You can plug these into your provider’s pricing to estimate **$ per 1K tokens**.

> ⚠️ Pricing changes over time, so treat any hardcoded values as examples only.
> Always check your provider’s current pricing page.

In this repo we:

- Log token usage.
- Leave comments where you could compute approximate cost.
- Save metrics into a JSON log file.

---

## 📂 Files in `day12_evaluation_metrics`

### 1️⃣ `code.ts` — Vanilla RAG + Metrics (JSON Store)

This script:

1. Loads `../day09_ingestion_pipeline/day09_local_ingestion_store.json`.
2. Defines a function `runRagWithMetrics(question)` that:
   - Embeds the question using OpenAI.
   - Retrieves top-k chunks using cosine similarity.
   - Calls OpenAI chat completions with question + context.
   - Measures latency for:
     - embedding
     - retrieval
     - generation
   - Captures token usage where available.
   - Produces a `metrics` object containing:
     - question
     - timings `{ embedMs, retrievalMs, llmMs, totalMs }`
     - tokens `{ embeddingTokens, promptTokens, completionTokens, totalTokens }`
     - retrieved chunks (ids + scores)
3. Logs the answer and metrics to the console.
4. Appends metrics to a local JSON log file:
   - `day12_rag_metrics_log.json`

This gives you a **very simple evaluation harness** for observing how your RAG behaves.

---

### 2️⃣ `framework.ts` — Metrics Around a LangChain RAG Chain

This script:

1. Re-creates a RAG chain similar to Day 11 using:
   - `ChatOpenAI`
   - `OpenAIEmbeddings`
   - `Chroma.fromExistingCollection(...)`
   - `asRetriever({ k: 3 })`
   - `ChatPromptTemplate`
   - `RunnableSequence`
2. Wraps the chain invocation with timing to capture:
   - `totalMs` – time from before `chain.invoke` to after it returns.
3. Logs:
   - the question
   - the final answer
   - retrieved docs’ IDs and strategy
   - the total latency

You could later integrate:

- LangChain callbacks
- LangSmith
- external tracing/observability tools

But Day 12 keeps it **framework-light** and easy to follow.

---

## 🚀 How To Run

In your root `package.json`, add:

```jsonc
"dev:day12:vanilla": "tsx day12_evaluation_metrics/code.ts",
"dev:day12:framework": "tsx day12_evaluation_metrics/framework.ts"
```

Then run:

```bash
npm run dev:day12:vanilla
npm run dev:day12:framework
```

Make sure:

- Day 9 ingestion has been run (so JSON store + Chroma collection exist).
- Your `.env` contains a valid `OPENAI_API_KEY`.

---

## 🔑 Environment Variables (`.env.sample`)

```bash
OPENAI_API_KEY=your_openai_key_here

# For framework (Chroma)
CHROMA_URL=http://localhost:8000
```

---

## 📊 Output Example (Vanilla)

You’ll see logs **similar** to:

```text
Question: Why is chunking important in RAG?

Top retrieved chunks:
 - [chunk:chunk_0] score=0.84 ...
 - [chunk:chunk_5] score=0.81 ...
 - [chunk:chunk_2] score=0.79 ...

Answer:
  (LLM answer...)

Metrics:
{
  "latency": { "embedMs": 120, "retrievalMs": 3, "llmMs": 450, "totalMs": 573 },
  "tokens": { "embeddingTokens": 21, "promptTokens": 150, "completionTokens": 120, "totalTokens": 270 }
}
```

And a `day12_rag_metrics_log.json` file will accumulate run-by-run entries.

---

## 📚 References

- RAG Evaluation Concepts (search “RAG evaluation techniques”)  
- LangChain Evaluation Overview:  
  https://js.langchain.com/docs/guides/evaluation/  
- OpenAI API Token Usage:  
  https://platform.openai.com/docs/guides/usage  
- General Latency & SLO Practices (search “latency SLO p95 p99”)
