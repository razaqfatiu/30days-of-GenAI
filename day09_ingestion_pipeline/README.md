# Day 9 — Ingestion Pipelines: Turning Raw Data into a Searchable Knowledge Base

## 🔄 Connection to Day 6, Day 7, and Day 8
- **Day 6:** Embeddings — how text becomes vectors.
- **Day 7:** Chunking — how long documents become usable pieces.
- **Day 8:** Vector stores — where embeddings live.

**Day 9 ties all three together into a real ingestion pipeline.**

> Raw Data → Clean → Normalize → Chunk (Day 7) → Embed (Day 6) → Store (Day 8)

---

## 🎯 What You’ll Build Today
Today’s goal is to make the ingestion pipeline more **realistic and robust**:

- ✅ Cleaning & normalization (trim, collapse whitespace, skip empty chunks)
- ✅ Batching OpenAI embedding calls (reduce latency & respect rate limits)
- ✅ Upserts:
  - Re-use existing embeddings where possible
  - Only embed new / changed chunks
- ✅ Local JSON “vector store” (vanilla)
- ✅ Chroma-based ingestion (framework)

---

## 🧩 Why Ingestion Pipelines Matter
Your RAG quality depends on **how** you ingest data:

Bad ingestion:
- re-embeds everything on every run
- stores dirty text with weird whitespace
- loses metadata
- can’t be re-run safely

Good ingestion:
- cleans and normalizes text
- only updates what changed (upserts)
- preserves metadata
- is idempotent (safe to re-run)

Day 9 is where you start thinking like an **AI Engineer**, not just someone calling an API once.

---

## 📂 Files in This Folder

### `code.ts` — Vanilla Ingestion Pipeline (JSON Vector Store)

What it does:

1. Loads chunks from `../day07_chunking/day07_chunks.json`.
2. **Cleans & normalizes** text (trim, collapse whitespace).
3. Loads existing `day09_local_ingestion_store.json` if present.
4. Detects which chunk IDs are **new or changed**.
5. Embeds those chunks in **batches** using OpenAI’s `/embeddings` API.
6. Merges new records with existing ones (simple **upsert**).
7. Saves the updated store to:
   - `day09_local_ingestion_store.json`.

This gives you a minimal but realistic ingestion behavior that you can rerun.

---

### `framework.ts` — LangChain + Chroma Ingestion Pipeline

What it does:

1. Loads Day 7 chunks and wraps them as LangChain `Document`s.
2. Uses `OpenAIEmbeddings` (`text-embedding-3-small`).
3. Connects to Chroma:
   - If collection exists → uses it and **adds documents** (upsert-like).
   - If not → creates a new collection.
4. Performs a similarity search:
   - query: `"Why is chunking important?"`
5. Logs the top matches with metadata.

Notes:
- Chroma’s behavior for same IDs depends on the backend; here, the focus is on illustrating the ingestion pattern.
- In production, you might maintain explicit document IDs and call an upsert API.

---

## 🚀 How to Run

In your root `package.json`:

```jsonc
"dev:day9:vanilla": "tsx day09_ingestion_pipeline/code.ts",
"dev:day9:framework": "tsx day09_ingestion_pipeline/framework.ts"
```

Then:

```bash
npm run dev:day9:vanilla
npm run dev:day9:framework
```

---

## 🔑 `.env.sample`

Minimal variables needed:

```bash
OPENAI_API_KEY=your_key_here

# For Chroma (framework.ts)
CHROMA_URL=http://localhost:8000
```

---

## 📚 References

- OpenAI Embeddings Guide: https://platform.openai.com/docs/guides/embeddings
- LangChain Document Loaders: https://js.langchain.com/docs/modules/data_connection/document_loaders/
- ChromaDB Docs: https://docs.trychroma.com/
- RAG Pipelines (OpenAI Cookbook): search "RAG pipeline ingestion"