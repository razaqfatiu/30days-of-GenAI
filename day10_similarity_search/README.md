# Day 10 — Similarity Search Algorithms (kNN, ANN, HNSW, IVF, PQ)

## 🔄 Connecting Day 6 → 9

- **Day 6 — Embeddings:** text → vectors
- **Day 7 — Chunking:** documents → chunks
- **Day 8 — Vector DBs:** where vectors live
- **Day 9 — Ingestion:** how vectors get stored

Today we look inside the “search engine”:

> **How does the system quickly find the most similar vectors to a query?**

---

## 🎯 Learning Goals

By the end of Day 10, you should:

- Understand the difference between:
  - **kNN (exact search)**
  - **ANN (approximate search)**
  - **HNSW**
  - **IVF**
  - **PQ**
- Know **when to use which**, and when to **combine** techniques.
- See small **toy implementations in vanilla TypeScript** (for intuition).
- Understand how **vector DBs abstract these algorithms** so you rarely implement them yourself.

---

## 🧠 The Core Idea: Nearest Neighbors

Everything starts with this question:

> Given a query vector **q**, which vectors in my database are **closest** to q?

Closeness is defined using a **distance metric**, usually:

- cosine similarity
- dot product
- L2 (Euclidean distance)

---

## 1️⃣ kNN — Exact k-Nearest Neighbors

### How it works (concept)

- Compare the query vector to **every stored vector**.
- Compute similarity or distance.
- Sort them.
- Take the top-k.

### Pros

- Simple, easy to implement.
- Exact results (no approximation).

### Cons

- Slow for large datasets (millions of vectors).
- O(N) per query.

### When to use

- Small collections (e.g. < 50k vectors).
- Debugging.
- Local JSON “vector stores”.
- Unit tests for approximate algorithms.

Our `code.ts` implements kNN as a **linear scan** with cosine similarity.

---

## 2️⃣ ANN — Approximate Nearest Neighbors

ANN answers a slightly different question:

> “Give me neighbors that are **very close**, not necessarily mathematically perfect, but very fast.”

Instead of scanning all vectors, ANN algorithms:

- build an index
- search only a subset of vectors
- trade a little accuracy for a lot of speed

All production vector DBs use ANN:  
Pinecone, Weaviate, Milvus, Chroma (HNSW mode), FAISS, etc.

Our toy ANN in `code.ts`:

- pre-groups vectors into “coarse buckets”
- only searches the most promising buckets

---

## 3️⃣ HNSW — Hierarchical Navigable Small World

HNSW is a popular ANN graph-based structure.

### Intuition

- Think of all vectors as points in space.
- Connect each point to its neighbors (graph).
- Build multiple layers:
  - top layers: rough, long-range links
  - lower layers: detailed, local links
- To search:
  1. Start from a random entry point.
  2. Walk greedily to closer neighbors.
  3. Descend layers for finer search.

### Pros

- High recall (good accuracy).
- Very fast at scale.
- Good default in many DBs.

### Cons

- More complex to build.
- Uses more memory than some compressed indices.

### Who uses it?

- Pinecone (HNSW-based indexes)
- Weaviate (HNSW as default)
- Many FAISS configs
- Chroma can sit on top of HNSW backends.

Our `code.ts` contains a **tiny HNSW-inspired search**:

- builds a simple neighbor graph
- performs greedy search on the graph
  > ⚠️ This is **for learning only**, not production.

---

## 4️⃣ IVF — Inverted File Index

IVF is a clustering-based index.

### Intuition

1. Cluster all vectors into e.g. 100–1000 clusters (using k-means or similar).
2. For each vector, store it in its nearest cluster.
3. At query time:
   - find which clusters are closest to the query
   - only search vectors **inside those clusters**

### Pros

- Very fast for large collections.
- Scales well.

### Cons

- Slightly lower recall if you search too few clusters.
- Needs a training step to build clusters.

### Who uses it?

- FAISS
- Milvus
- Pinecone (some configurations)

Our `code.ts`:

- implements a simple IVF-style index:
  - assigns vectors to coarse centroids
  - searches the top few closest clusters

---

## 5️⃣ PQ — Product Quantization

PQ is about **compression**.

### Intuition

- Split each vector into several parts.
- For each part, learn a small “codebook” of representative vectors.
- Store only the index of the nearest codebook entry for each part.

Result:

- Huge memory savings.
- Fast approximate distance computation.

### Pros

- Supports billion-scale vector collections.
- Memory efficient.

### Cons

- More approximation → some loss in accuracy.
- More complex to implement and tune.

### Who uses it?

- FAISS (heavily)
- Milvus
- Some Pinecone modes

Our `code.ts`:

- shows a **very small PQ-like step**:
  - splits vectors into 2 parts
  - simple codebook assignment
  - uses compressed vectors for approximate distance

---

## 🧪 Files in This Folder

### `code.ts` — Toy Implementations (for Intuition)

What it does:

1. Loads `../day09_ingestion_pipeline/day09_local_ingestion_store.json`.
2. Implements:
   - **kNN** — exact linear search
   - **ANN (bucket-based)** — approximate pre-filtered search
   - **IVF-style** — cluster-based search
   - **HNSW-inspired** — neighbor-graph greedy search
   - **PQ-style** — compressed vectors search
3. Runs all methods for a sample query and prints:
   - Top matches
   - Scores
   - Which method produced them

> These are **educational toy versions**, not production-grade implementations.

---

### `framework.ts` — Using Real Vector DB Backends

What it does:

1. Uses:
   - **Chroma** (local)
   - Optionally: **Pinecone** and **Weaviate** (if env keys exist)
2. For each provider:
   - Uses the same query string.
   - Calls `.similaritySearch()`.
   - Prints top results + metadata.

Important:

> **You don’t choose HNSW / IVF / PQ directly in LangChain.**  
> The **vector database** (Pinecone, Weaviate, etc.) picks and manages the index under the hood based on its config.

We use multiple vector stores to:

- show that **the same RAG code** can work on top of different ANN/index choices
- emphasize that \*\*engineers usually configure, not implement, these algorithms.

---

## 🚀 Scripts

Add:

```jsonc
"dev:day10:vanilla": "tsx day10_similarity_search/code.ts",
"dev:day10:framework": "tsx day10_similarity_search/framework.ts"
```

---

## 🧭 When to Use Which Algorithm?

### ✅ Use kNN when:

- Dataset is small (< 50k vectors).
- You’re debugging.
- You need exact ground truth.

### ✅ Use ANN (HNSW / IVF / PQ) when:

- You have lots of vectors.
- Latency matters.
- You’re in production.

### Rough guide:

- **HNSW** → great default, high recall, fast.
- **IVF** → very large datasets, trade recall for speed.
- **PQ** → extreme scales (100M+ vectors), memory constrained.

---

## 🔗 Which Algorithms Do Vector DBs Use?

| Vector DB | Typical Algorithms (internal)                      |
| --------- | -------------------------------------------------- |
| Pinecone  | HNSW, IVF, PQ-based hybrids                        |
| Weaviate  | HNSW (as default index)                            |
| Milvus    | IVF, HNSW, PQ, combinations                        |
| FAISS     | Full library of IVF, HNSW, PQ, etc.                |
| Chroma    | Uses underlying backends that often use HNSW/FAISS |

As an **AI Engineer**, you rarely implement these from scratch.  
Instead, you:

- configure the vector DB,
- choose index type,
- set parameters like `efSearch`, `nProbe`, or compression modes.

Day 10 is about understanding **what’s happening under the hood** so you can make informed choices.

---

## 📚 References

### **FAISS (Facebook AI Similarity Search)**

- Index Types Overview:  
  https://faiss.ai/cpp_api/struct/Index.html
- Official GitHub Repository:  
  https://github.com/facebookresearch/faiss

### **HNSW (Hierarchical Navigable Small World Graphs)**

- Original Research Paper (Arxiv):  
  https://arxiv.org/abs/1603.09320
- Visual & Intuitive Explanation:  
  https://towardsdatascience.com/hnsw-algorithm-explained-cc6102d8c4ff

### **Pinecone ANN Indexing**

- Pinecone Index Types Overview:  
  https://docs.pinecone.io/docs/indexes
- How Pinecone Implements ANN (HNSW, IVF, PQ):  
  https://docs.pinecone.io/docs/under-the-hood

### **Weaviate Indexing**

- Vector Index Concepts (HNSW):  
  https://weaviate.io/developers/weaviate/concepts/vector-index
- Schema + Index Configuration:  
  https://weaviate.io/developers/weaviate/config-refs/schema/index-configuration

### **Milvus Index Types**

- IVF / IVFPQ / HNSW / DiskANN:  
  https://milvus.io/docs/index-overview.md

### **ChromaDB**

- Usage Guide (Vector Search Basics):  
  https://docs.trychroma.com/usage-guide
- Technical Notes (Indexing & Internals):  
  https://docs.trychroma.com/tech-notes

### **General ANN Learning Resources**

- Pinecone ANN Learning Series:  
  https://www.pinecone.io/learn/series/ann/

---

Next up:  
We’ll move from **retrieval only** to full **RAG pipelines** — combining retrieval and LLM generation in Day 11.
