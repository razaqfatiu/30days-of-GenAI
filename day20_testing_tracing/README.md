# Day 20 — Testing, Tracing & Observability for AI Systems
**Logging agent steps • LangSmith tracing • audit trails • debugging tool failures • eval hooks • latency & cost basics**

## 🔄 Connection to Day 19
Day 19 taught **orchestration**: DAG workflows, branching logic, LCEL, and LangGraph.

Day 20 is the “production reality check”:

> If you can’t **see** what your AI system did (steps, tools, routing, failures) and can’t **test** it reliably,
> you can’t trust it in production.

This day focuses on **observability** (visibility) + **testing** (confidence).

---

# 1) Logging agent steps (the minimum observability)
When you build agents/pipelines, each step should emit *structured logs* like:

- Which **node** ran (classify/retrieve/answer/evaluate)
- Why it ran (routing decision)
- What it used (tool name, input size, #chunks)
- What it produced (output size, status)
- How long it took (latency)

### ✅ Why structured logs (not plain text)?
Because structured logs are queryable. In production you’ll ask:
- “Show all runs where retrieval returned 0 chunks”
- “Which tool fails most often?”
- “Which questions route to RAG but shouldn’t?”

**In code today**  
We use a `Tracer` with **spans**. Each span includes `name`, `durationMs`, and `meta` fields.

Example span:
```jsonc
{
  "name": "answer",
  "durationMs": 812.2,
  "meta": { "route": "rag", "inputTokens": 322, "outputTokens": 188, "estCostUSD": 0.0005 }
}
```

This is the same idea behind OpenTelemetry spans, Datadog traces, etc.

---

# 2) Audit trails (compliance + debugging + trust)
An **audit trail** is a permanent record of:
- inputs and outputs
- routing decisions
- tool calls
- errors
- safety/refusal decisions
- timestamps

### ✅ Why it matters
- **Debugging**: “why did it answer that?”
- **Governance**: “what data did we use?”
- **Security**: “did the tool leak anything?”
- **Customer support**: “reproduce the run”

**What to store**
- request id / trace id
- step list + timestamps
- tool inputs/outputs (redact sensitive data!)
- model used + key parameters (temperature, max tokens)
- evaluation results

**In code today**
We show how to create trace spans and print them.  
In a real app, you’d:
- write spans to a file, DB, or trace backend
- redact PII
- keep retention policies

---

# 3) Debugging tool failures (practical failure modes)
Tool failures are *normal* in production. Examples:
- network timeout
- rate limits (429)
- provider errors (5xx)
- invalid tool input
- vector DB returns empty results
- schema mismatch (tool expects A, got B)

### ✅ Reliability patterns you should use
1) **Timeouts**  
Fail fast if a tool hangs.
2) **Retries with backoff**  
Retry transient failures (network, 5xx) but don’t retry invalid inputs.
3) **Circuit breakers** (advanced)  
If a tool is failing repeatedly, stop calling it temporarily.
4) **Fallback paths**  
If retrieval fails, answer directly but communicate uncertainty.
5) **Error tagging in traces**  
Make failures searchable in your observability backend.

**In code today**
- Vanilla file shows evaluation + spans + MOCK mode for deterministic testing.
- You can extend spans with `error: true`, `statusCode`, etc.

---

# 4) LangSmith tracing (what it is and when to use it)
**LangSmith** is a tracing + evaluation product from LangChain that gives you:
- per-run traces (chains, tools, LLM calls)
- step-by-step visualization
- prompt/version tracking
- dataset-based evaluations and regressions

### ✅ Why teams adopt LangSmith
- you get observability *without building your own dashboard*
- you can compare runs across prompts and model versions
- you can create eval datasets and run regressions

### How it fits with today’s code
Today’s tracer is the “conceptual core”.
LangSmith is the “production-grade backend”.

### (Optional) Quick setup concept (high-level)
To enable LangSmith in LangChain JS, you typically set:
- `LANGCHAIN_TRACING_V2=true`
- `LANGCHAIN_API_KEY=...`
- `LANGCHAIN_PROJECT=...`

Then LangChain will emit traces automatically for supported components.

LangSmith docs: https://docs.smith.langchain.com/

---

# 5) Evaluation hooks (LLM-as-judge)
We add an evaluation step that grades the answer:
- helpfulness for beginners
- groundedness when context is provided
- avoid hallucinations / fake citations

### ✅ Why this matters
- It catches regressions when you change prompts/models
- It provides a signal for routing improvements (e.g., “RAG didn’t help”)
- It supports A/B testing and continuous improvement

---

# 6) Latency & cost basics (what to measure)
Even if you don’t have exact token usage, you can start with estimates:
- **input token estimate** (~chars / 4)
- **output token estimate**
- **per-step latency**
- **per-request cost approximation**

### What you want in production dashboards
- p50/p95 latency per step
- cost per request
- failure rate per tool
- retrieval hit rate (#chunks > 0)
- groundedness score over time

---

# 📂 Files
- `code.ts` — Vanilla TypeScript:
  - tracing spans per step
  - token/cost estimates
  - evaluation hook (LLM judge)
  - golden tests with behavior assertions
  - `MOCK_LLM=true` for deterministic runs
- `framework.ts` — LangChain:
  - same tracing concepts using `ChatOpenAI`

---

# 🚀 package.json scripts

```jsonc
"dev:day20:vanilla": "tsx day20_testing_tracing/code.ts",
"dev:day20:framework": "tsx day20_testing_tracing/framework.ts"
```

---

# 🔑 .env
```bash
OPENAI_API_KEY=your_key
MOCK_LLM=true # optional for deterministic local/CI

# Optional LangSmith tracing (if you want to try it)
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=your_langsmith_key
LANGCHAIN_PROJECT=30days-of-genai
```

---

# 📚 References
- OpenAI evals guide: https://platform.openai.com/docs/guides/evals
- OpenTelemetry: https://opentelemetry.io/docs/
- LangSmith: https://docs.smith.langchain.com/