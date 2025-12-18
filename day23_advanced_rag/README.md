# Day 23 — Advanced RAG Patterns (Production Quality Retrieval)

## 🔄 Connection to Day 22
Day 22 showed how to deploy AI systems behind APIs.
Once deployed, answer quality depends mostly on **retrieval quality**, not the model.

Day 23 focuses on making RAG systems **reliable and accurate**.

---

## 1️⃣ Query Rewriting
Users ask vague questions.

Example:
User: "How does it work?"
Rewritten: "Explain how vector embeddings are used in a RAG pipeline."

This improves recall and retrieval accuracy.

---

## 2️⃣ Hybrid Retrieval (BM25 + Vector Search)
- BM25 → exact keywords, IDs
- Vector → semantic similarity

Hybrid = combine both to avoid missing relevant docs.

---

## 3️⃣ Reranking
Retrieved chunks are scored again so the most useful ones come first.
This reduces noise before generation.

---

## 4️⃣ Context Assembly
Good context:
- deduplicated
- ordered by relevance
- within token limits
- preserves sources

Bad context leads to hallucinations.

---

## 📦 What’s in this folder
- Vanilla TS implementation of advanced RAG steps
- Framework-style abstraction of the same pipeline

---

## 🚀 package.json scripts
```jsonc
"dev:day23:vanilla": "tsx day23_advanced_rag/code.ts",
"dev:day23:framework": "tsx day23_advanced_rag/framework.ts"
```

---

## 📚 References
- https://www.pinecone.io/learn/retrieval-augmented-generation/
- https://en.wikipedia.org/wiki/Okapi_BM25
- https://www.elastic.co/what-is/hybrid-search
- https://www.pinecone.io/learn/rerankers/