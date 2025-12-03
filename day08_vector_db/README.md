# Day 8 — Vector Databases & Ingestion: Where Your Embeddings Actually Live

## 🔄 Connection to Day 6 & Day 7
- **Day 6**: You learned how **embeddings** turn text into vectors that capture meaning.
- **Day 7**: You learned how to **chunk** long documents into smaller, meaningful pieces with metadata.

Today we connect the dots:

> We will take those **chunks + embeddings** and store them in a **vector database** so we can search them efficiently.

---

## 🎯 What You’ll Learn
By the end of Day 8, you’ll understand:

- What a **vector database** is (in simple terms)
- Why we don’t just use a normal SQL/NoSQL database
- Types of vector DBs: local vs cloud
- Index types (kNN, ANN) at a high level
- How to build a simple **local JSON vector store** (vanilla TS)
- How to ingest data into:
  - **Chroma** (local / self-hosted)
  - **Pinecone** (managed cloud)
  - **Weaviate** (self-hosted / cloud)
- How to run a basic **similarity search** over your chunks

---

## 🧠 What Is a Vector Database?

A **vector database** is a database that stores vectors (embeddings) and lets you find the *most similar* vectors efficiently.

Instead of asking:

> "Which row has this exact ID?"

we ask:

> "Which stored embeddings are closest in meaning to this query embedding?"

This is essential for:

- RAG (“chat with your docs”)
- Recommendation systems
- Semantic search
- Clustering and deduplication

---

## ❓ Why Not Use a Normal Database?

SQL / NoSQL databases are great for **exact matches** and simple filters.

But vector search needs:

- **similarity search** (cosine, dot-product, etc.)
- **fast approximate nearest neighbors (ANN)** on large datasets
- specialized **index structures** (HNSW, IVF, PQ, etc.)

Vector DBs are optimized to answer:

> “Given this embedding, what are the top‑k most similar embeddings?”

…fast, even with millions of records.

---

## 🧩 Index Types (High Level Only)

You’ll see terms like:

- **kNN** — exact nearest neighbors (brute-force; OK for small sets).
- **ANN** — approximate nearest neighbors (fast, used in production).
  - **HNSW** — graph-based index; popular for high recall.
  - **IVF** — cluster-based index; good for huge datasets.
  - **PQ** — compresses vectors to save memory.

You don’t need to implement these — the vector DB handles them.

---

## 🧱 Today’s Four Storage Options

We’ll show **four** approaches:

### 1️⃣ Local JSON Vector Store (Vanilla TS)
- No external DB.
- Great for learning and tiny projects.
- Stores vectors in `day08_local_vector_store.json`.
- Uses manual cosine similarity to search.

### 2️⃣ Chroma (Local / Self-Hosted)
- Simple, popular open-source vector DB.
- Good for local dev and small projects.
- Used via LangChain `Chroma` vector store.

### 3️⃣ Pinecone (Managed Cloud)
- Fully managed, scalable vector DB.
- Ideal for production.
- Requires `PINECONE_API_KEY` and an index.

### 4️⃣ Weaviate (Self-Hosted / Cloud)
- Open-source + managed options.
- Schema-based, supports hybrid search.
- Requires a running Weaviate instance.

---

## 📂 Input: Using Day 7’s Chunks

Both examples expect the output from **Day 7**:

- `../day07_chunking/day07_chunks.json`

This file contains:

- `chunks[i].text` — the chunk content.
- `chunks[i].meta` — metadata (id, indices, strategy).

We turn those into:
- Documents → for vector DBs
- Embeddings → for search

---

## 🧪 Files in This Folder

### `code.ts` — Vanilla Local JSON Vector Store

What it does:

1. Loads `../day07_chunking/day07_chunks.json`.
2. Calls OpenAI’s **embeddings API** directly (no framework).
3. Builds an in-memory vector store:
   - `{ id, text, metadata, embedding }`.
4. Saves it to `day08_local_vector_store.json`.
5. Embeds a demo **query** string.
6. Computes cosine similarity against all stored vectors.
7. Logs the top matching chunks.

Run:

```bash
npm run dev:day8:vanilla
```

Requirements:
- `OPENAI_API_KEY` in your `.env`.

---

### `framework.ts` — LangChain + Multi-Provider Vector DB Demo

What it does:

1. Loads `../day07_chunking/day07_chunks.json`.
2. Wraps them as LangChain `Document` objects.
3. Uses `OpenAIEmbeddings` (`text-embedding-3-small`).
4. Based on `VECTOR_DB_PROVIDER`, ingests into:

   - `"chroma"` → `Chroma` vector store  
   - `"pinecone"` → `PineconeStore`  
   - `"weaviate"` → `WeaviateStore`

5. Runs a similarity search for a demo query.
6. Logs top results with metadata.

Run:

```bash
# Default (Chroma)
npm run dev:day8:framework

# Or override provider:
VECTOR_DB_PROVIDER=pinecone npm run dev:day8:framework
VECTOR_DB_PROVIDER=weaviate npm run dev:day8:framework
```

---

## 🔑 Environment Variables (`.env.sample`)

Suggested `.env.sample` entries:

```bash
# OpenAI for embeddings
OPENAI_API_KEY=your_openai_key_here

# Vector DB provider selector
VECTOR_DB_PROVIDER=chroma # or pinecone | weaviate

# Chroma (if using a remote server)
CHROMA_URL=http://localhost:8000

# Pinecone
PINECONE_API_KEY=your_pinecone_key_here
PINECONE_ENVIRONMENT=your_pinecone_env
PINECONE_INDEX_NAME=your_index_name

# Weaviate
WEAVIATE_SCHEME=https
WEAVIATE_HOST=your-weaviate-endpoint.weaviate.network
WEAVIATE_API_KEY=your_weaviate_key_here
WEAVIATE_INDEX_CLASS=Day08Chunk
```

---

## 🧰 Scripts

Add these to your `package.json`:

```jsonc
"dev:day8:vanilla": "tsx day08_vector_db/code.ts",
"dev:day8:framework": "tsx day08_vector_db/framework.ts"
```

---

## 📚 References

- Chroma: https://www.trychroma.com/
- Pinecone: https://www.pinecone.io/
- Weaviate: https://weaviate.io/
- LangChain JS VectorStores: https://js.langchain.com/docs/modules/data_connection/vectorstores/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings

---

## ⏭ Coming Next: Day 9 — Ingestion Pipelines

Once you understand vector DBs and simple ingestion, the next step is to build **robust ingestion pipelines** that:

- load from many sources (PDF, Markdown, APIs)
- clean and normalize text
- chunk + embed + store in batches
- handle upserts & re-indexing

Day 9 will focus on that.