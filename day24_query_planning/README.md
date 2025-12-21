# Day 24 — Query Planning & Multi-Hop Retrieval (Deep Dive)

## 🔄 Connection to Day 23
**Day 23** improved *retrieval quality* inside one hop:
- query rewriting
- hybrid retrieval (BM25 + vector)
- reranking
- context assembly

**Day 24** adds a new skill:
> **Plan the retrieval** when one search is not enough.

Because many real questions are **multi-hop**:
- they contain multiple parts
- they require multiple sources
- some parts depend on others

If Day 23 is “retrieving better”, Day 24 is “retrieving smarter”.

---

# The Problem Day 24 Solves
A basic RAG system often does:
> user question → retrieve once → answer

This fails when:
- the question is broad (“explain everything”)
- the question has two goals (“compare X and Y and recommend”)
- the answer requires dependencies (“first define A, then explain B with A”)

**Example (multi-hop)**
> “How does RAG reduce hallucinations, and what role do embeddings play?”

A single retrieval query might only bring docs about RAG or only about embeddings.
Day 24 teaches how to break it down, route retrieval correctly, and merge evidence.

---

# Day 24 Concepts (In Depth)

## 1️⃣ Intent Classification
Intent classification answers:
> “What type of question is this?”

Common intents:
- **Fact lookup**: short, direct, usually one hop  
  Example: “What is an embedding?”
- **Explanation**: requires concept + mechanism  
  Example: “How does retrieval work in RAG?”
- **Comparison**: needs two sides + tradeoffs  
  Example: “BM25 vs vector search—when should I use each?”
- **Procedural**: step-by-step with order  
  Example: “How do I build an ingestion pipeline?”

### Why intent matters
Intent decides:
- whether multi-hop is needed
- which tools to use (vector vs keyword vs SQL/API)
- whether to run retrieval parallel or sequential
- how to structure the final answer

**Anti-pattern**
Running multi-hop for every question increases:
- latency
- cost
- noise in context

---

## 2️⃣ Query Decomposition
Query decomposition turns one complex question into smaller, searchable questions.

**Example**
User question:
> “Compare BM25 and vector search, then tell me what to use for invoice IDs.”

Decomposition:
1. “What is BM25?”
2. “What is vector search?”
3. “When is BM25 better?”
4. “When is vector search better?”
5. “For invoice IDs and exact matching, which is better?”

### Good decomposition rules
- each sub-query should be searchable on its own
- keep sub-queries short and specific
- prefer “one concept per sub-query”

### Output of decomposition
A decomposition plan usually includes:
- `query`: the sub-question
- `dependencies`: does it rely on another hop?
- `route`: where it should be retrieved from (vector/keyword/sql/api)
- `priority`: importance for final answer

---

## 3️⃣ Retrieval Routing
Routing answers:
> “Where should I search for this sub-query?”

Typical sources:
- **Vector search**: concepts, explanations, paraphrases  
  Great for “meaning”
- **Keyword/BM25**: IDs, exact phrases, names  
  Great for “exact matches”
- **SQL**: structured data (users, payments, invoices)  
  Great for “facts in tables”
- **Third-party APIs**: external truth (payments provider, CRM, ticketing)

### Routing examples
- “What is RAG?” → vector
- “Invoice INV-9231 status” → keyword or SQL
- “What’s the user’s subscription plan?” → SQL
- “Did Paystack refund payment X?” → third-party API

### Why routing matters
If you send an “ID lookup” query to vector search, it might miss it.
If you send an “explain concept” query to keyword search, it might retrieve shallow docs.

Routing is a major reason production RAG feels “smart”.

---

## 4️⃣ Parallel vs Sequential Hops
Once we have sub-queries, we decide execution strategy.

### Parallel hops (faster)
Use parallel execution when sub-queries are independent:
- “What is RAG?”
- “What are embeddings?”
These can run at the same time to reduce total latency.

### Sequential hops (correctness)
Use sequential execution when one hop depends on another:
- Hop 1: “Find the product category”
- Hop 2: “Fetch docs for that category”
- Hop 3: “Answer the user”
Here, Hop 2 needs Hop 1’s output.

### Practical rule
- Parallel when independent
- Sequential when dependent
- Mix both in complex flows (DAG thinking from Day 19)

---

## 5️⃣ Confidence Scoring (Per Hop)
Confidence scoring answers:
> “How reliable is the retrieved evidence for this hop?”

Signals you can use (simple → advanced):
- **Similarity score** (vector DB score)
- **Keyword match strength** (BM25 score)
- **Reranker score**
- **Heuristics**: empty results, duplicates, too generic
- **LLM judge** (Day 12/20 ideas): “Is this evidence relevant?”

### What to do with confidence
- High confidence → include more context from that hop
- Medium confidence → include but limit tokens
- Low confidence → exclude or ask clarifying question / fallback

**Why this matters**
Without confidence control, one weak hop can pollute the prompt and cause hallucinations.

---

## 6️⃣ Context Merging & Budgeting
After multiple hops, you may have too much text.
Context merging decides what the model sees.

### Merging steps
1. **Deduplicate** near-identical chunks
2. **Group** by hop / topic (helps answer structure)
3. **Order** by relevance and dependency (definitions first)
4. **Budget** tokens per hop

### Token budgeting (simple strategy)
Assume you can only send ~N tokens of context.
Split N across hops:
- Hop 1 (core definition): 30%
- Hop 2 (mechanism): 50%
- Hop 3 (examples): 20%

If a hop has low confidence, reduce its budget.

### Why budgeting matters
Even correct retrieval fails if:
- context is too long (truncation)
- the important evidence is buried
- you overwhelm the model with unrelated chunks

---

## 7️⃣ Reflection Before Answering
Reflection is a final check:
> “Do we have enough evidence to answer all parts?”

A simple reflection checklist:
- Did we answer each sub-question?
- Do we have strong evidence (confidence) for each part?
- Are there contradictions?
- Is anything missing?

If reflection fails, options:
- retrieve again with refined queries
- ask the user a clarifying question
- answer partially with clear uncertainty

Reflection makes answers more reliable and reduces hallucinations.

---

# How Today’s Code Implements This
Both `code.ts` and `framework.ts` demonstrate:
- intent classification
- decomposition into hops
- routing (vector vs keyword in demo)
- parallel execution (map/Promise patterns)
- hop confidence scores + filtering
- context merging
- reflection flag before answering

> This is intentionally simplified so the concepts are easy to learn.
> In real production, swap the mock sources with your vector DB, BM25 index, SQL, and APIs (Day 22 tools).

---

## 🚀 package.json scripts
```jsonc
"dev:day24:vanilla": "tsx day24_query_planning/code.ts",
"dev:day24:framework": "tsx day24_query_planning/framework.ts"
```

---

## 📚 References
- Pinecone RAG guide: https://www.pinecone.io/learn/retrieval-augmented-generation/
- Hybrid search overview: https://www.elastic.co/what-is/hybrid-search
- Self-Ask + Search (multi-hop idea): https://arxiv.org/abs/2210.03350
- Plan-and-Solve prompting: https://arxiv.org/abs/2305.04091