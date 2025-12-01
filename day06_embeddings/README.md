# Day 6 — Embeddings: How AI Represents Meaning

## 🔄 Connection to Day 5
On Day 5, you learned about inferencing — how an LLM “thinks,” predicts tokens, and responds to prompts.
Today we focus on **understanding**, not generation — through embeddings.

Embeddings are the backbone of:
- Search
- RAG
- Recommendations
- Clustering
- Deduplication
- Semantic filtering

---

## 🧠 What Are Embeddings?
Embeddings are numeric vectors that represent **meaning**.

Example (simplified):
- “I love this product” → [0.8, 0.9, 0.1]
- “This product is great” → [0.79, 0.88, 0.12]
- “The weather is terrible today” → [-0.3, 0.1, 0.9]

Similar meaning → vectors close together  
Different meaning → vectors far apart  

Think of embeddings as **GPS coordinates for meaning**.

---

## 🎯 Why Embeddings Matter
Embeddings allow AI systems to:
- Compare meaning of texts
- Perform semantic search
- Group similar items
- Detect anomalies
- Retrieve relevant documents for RAG

Embeddings = **understanding layer**  
LLMs = **generation layer**

---

## 🧮 Cosine Similarity (Simple Explanation)
Cosine similarity measures the angle between two vectors.

- 1.0 → extremely similar  
- 0.0 → unrelated  
- -1.0 → opposite  

This is the core operation behind search and retrieval.

---

## 🌍 Real-World Use Cases
- Search engines (Google, YouTube, Amazon)
- Spotify & Netflix recommendations
- Fraud and anomaly detection
- Semantic document retrieval
- RAG question answering systems
- Deduplication and clustering

---

## ☁️ OpenAI Embeddings: text-embedding-3-small
We use OpenAI’s text-embedding-3-small because it is:
- cheap
- performant
- widely adopted
- ideal for search & RAG
- beginner-friendly with LangChain

---

## 📐 Best Practices
- Use the same model for doc + query
- Normalize vectors for cosine similarity
- Do NOT embed entire documents (use chunking)
- Store metadata with each embedding
- Cache embeddings instead of recomputing

---

## ❗ Common Pitfalls
- Chunking too large (hurts retrieval)
- Chunking too small (hurts context)
- Using Euclidean distance instead of cosine similarity
- Mixing embedding providers
- Forgetting metadata

---

## 🧪 Files in This Folder
### code.ts
- Manual cosine similarity
- Fake tiny embeddings
- Ranking by similarity

### framework.ts
- Real embeddings from OpenAI
- LangChain integration
- Mini semantic search demo
- Output ranked results

Run:
```
npm run dev:day6:vanilla
npm run dev:day6:framework
```

---

## 📚 References
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- LangChain JS Embeddings: https://js.langchain.com/docs/integrations/text_embedding/openai
- Pinecone Vector Learning: https://www.pinecone.io/learn/vector-embeddings/

---

## ⏭ Day 7 Preview: Chunking
Before embedding real documents, we must chunk them.
Tomorrow we cover:
- chunk size
- overlap
- sentence preservation
- metadata
- chunking strategies for RAG accuracy
