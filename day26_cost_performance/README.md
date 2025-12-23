# Day 26 — Cost & Performance Optimization for LLM Systems (Deep Dive)

## 🔄 Connection to Day 25
Day 25 introduced **memory**: what to store, when to recall, how to prune.
Day 26 answers: **how to run all of this cheaply, quickly, and safely at scale.**

If you ship GenAI to real users, you’ll face:
- latency complaints (“it’s slow”)
- cost explosions (“bills are scary”)
- reliability issues (“timeouts, spikes, rate limits”)

Day 26 is about systems that are:
✅ fast enough for good UX  
✅ cheap enough to scale  
✅ safe enough to not runaway

---

# The Big Picture: What Costs Money and Time?
A typical request includes:
1) prompt assembly (system + memory + context)
2) retrieval (vector DB, BM25, APIs)
3) model inference (LLM call)
4) tool calls (SQL, REST, GraphQL)
5) post-processing (rerank, formatting)

Each step adds:
- **latency** (time)
- **tokens** (cost)
- **risk** (timeouts / failures)

---

# Topics Covered Today (In Depth)

## 1️⃣ Token Budgeting & Context Allocation
**Token budgeting** decides how much text you allow into the prompt.

Why it matters:
- max context windows (if you exceed, you get truncation)
- tokens drive cost
- too much context = noise + hallucinations

### Allocation strategy
Split your budget across prompt sections:
- System rules
- Profile + memory
- Retrieved context
- Recent chat
- User question
- Output buffer (reserve)

**Tip:** Allocate more to *high-confidence* evidence (Day 24).

---

## 2️⃣ Prompt Cost Engineering
Your system prompt is a recurring cost.

Techniques:
- keep system rules short
- avoid repeated instructions across memory/retrieval
- use templates instead of verbose paragraphs
- treat prompts like production code (refactor)

Rule:
> Every extra 100 tokens in your system prompt costs you on every single call.

---

## 3️⃣ Adaptive Context Loading (Escalation)
Don’t load everything upfront.

Flow:
1) minimal context + cheap routing
2) evaluate confidence/quality
3) if low → retrieve more / rerank / stronger model

This reduces cost while preserving quality.

---

## 4️⃣ Model Routing (Cheap → Strong)
Not every step needs a big model.

Examples:
- intent classification → cheap model
- summarization / rewrite → cheap/mid
- final answer → strong only if necessary

Routing policy can use:
- query complexity
- confidence of retrieval
- risk level (financial/legal)

---

## 5️⃣ Caching (Embeddings, Retrieval, Outputs)
Caching avoids repeated work.

Cache types:
- embeddings cache: same text → same vector
- retrieval cache: same query → same top-k docs (TTL)
- output cache: deterministic prompts (temp=0)

Risks:
- stale data
- leaking private data (careful with keys)
- caching tool outputs that must be fresh

---

## 6️⃣ Batching & Parallelism
Reduce latency by:
- batching embeddings
- parallel retrieval hops (Day 24)
- parallel tool calls when independent (Day 16)

Only serialize dependent steps.

---

## 7️⃣ Cold vs Warm Performance
Cold start:
- caches empty
- connections not reused
- serverless warm-up

Warm start:
- caches populated
- DB connections reused

Cold can be 3–10x slower; measure both.

---

## 8️⃣ Streaming vs Non-Streaming
Streaming:
- improves perceived latency
- can be interrupted early

Non-streaming:
- better for structured output
- safer when tools/JSON must be validated before showing

---

## 9️⃣ Latency Profiling & Bottleneck Analysis
Measure stage timings:
- retrieval
- tool calls
- model inference
- retries/timeouts
- cache hit rate

Then optimize the slowest stage first.

---

## 🔟 Cost Guardrails & Fallback Strategies
Guardrails:
- max tokens per request
- max hops
- max tool calls
- max time per request

Fallbacks:
- smaller model
- reduced context
- partial answers with uncertainty
- graceful “try again later”

---

## 1️⃣1️⃣ Cost Attribution & Accounting
Track cost:
- per request
- per user
- per feature
- per endpoint

So you can identify expensive features and optimize correctly.

---

## 1️⃣2️⃣ Evaluation-Driven Optimization
Optimization without measurement is guesswork.

Track:
- groundedness
- usefulness
- citation accuracy
- latency
- cost

Then compare alternatives (A/B):
- cheap model vs strong model
- minimal context vs expanded context
- caching on/off

---

## 1️⃣3️⃣ Rate Limiting & Traffic Shaping
Protect the system:
- per-user rate limits
- burst limits
- priority queues
- background heavy work

Prevents one user or bot traffic from melting your infra.

---

# What Today’s Code Implements

## ✅ Vanilla `code.ts`
A runnable simulator that demonstrates:
- token budgeting + trimming per section
- prompt cost engineering (short vs verbose system)
- adaptive context escalation based on evaluation
- model routing policy
- caching layers (embedding/retrieval/output)
- batching + parallelism demos
- cold vs warm performance comparison
- streaming vs non-streaming simulation
- profiling fields printed per request
- guardrails + fallbacks
- cost ledger (per user/feature)
- rate limiting and burst handling

## ✅ Framework `framework.ts`
A pipeline/orchestrator style implementation:
- stage timers
- cache adapters
- router policy
- guardrails + escalation
- ledger + rate limiter
- streaming adapter simulation

---

## 🚀 Scripts
```jsonc
"dev:day26:vanilla": "tsx day26_cost_performance/code.ts",
"dev:day26:framework": "tsx day26_cost_performance/framework.ts"
```

---

## 📚 References
- OpenAI docs (tokens/requests): https://platform.openai.com/docs/introduction
- Web performance basics: https://developer.mozilla.org/en-US/docs/Web/Performance
- Rate limiting overview: https://en.wikipedia.org/wiki/Rate_limiting
- Caching basics: https://en.wikipedia.org/wiki/Cache_(computing)