
# Day 11 — Building a Basic RAG Pipeline (Retrieval + Generation)

## 🔄 Connection to Day 6–10

By now you’ve quietly assembled all the key LEGO pieces:

- **Day 6 – Embeddings:** turn text into vectors (meaning).
- **Day 7 – Chunking:** split long docs into meaningful pieces.
- **Day 8 – Vector DBs:** a home for your embeddings.
- **Day 9 – Ingestion Pipelines:** robustly load, clean, embed, and store.
- **Day 10 – Similarity Search Algorithms:** how “nearest neighbors” are found efficiently.

Today we wire everything together into a working **RAG (Retrieval-Augmented Generation) pipeline**.

> **RAG = Retrieval-Augmented Generation**  
> A pattern where we fetch relevant context from our knowledge base,  
> then let the LLM generate an answer grounded in that context.

---

## 🎯 Goal for Day 11

You will build a **minimal but real RAG pipeline**:

1. Take a natural language **question**.
2. **Retrieve** the most relevant chunks from your vector store.
3. **Stuff those chunks into the LLM prompt** as context.
4. Ask the LLM to answer using that context (with simple “citations”).

You’ll do this in two ways:

- **Vanilla TypeScript** using `fetch` to call OpenAI directly.
- **Framework-based** using LangChain + Chroma.

---

## 🧠 RAG Architecture (Simple Mental Model)

You can think of RAG as two separate pipelines:

### 1. Data Pipeline (Offline, from previous days)
You’ve already implemented this:

```text
Raw docs → clean → chunk → embed → store in vector DB
```

### 2. Query Pipeline (Online, today)
This is what we build now:

```text
User question
      ↓
  Embed query
      ↓
Similarity search in vector DB
      ↓
Top-k chunks + metadata
      ↓
LLM prompt = instructions + question + context
      ↓
LLM answer (grounded in retrieved context)
```

The **LLM does not “remember” your docs** – it sees only the context you give it.

---

## 📂 Prerequisites

We reuse artifacts from previous days:

- `../day09_ingestion_pipeline/day09_local_ingestion_store.json`  
  (local JSON vector store with chunk embeddings)
- Chroma collection created in Day 9:
  - collection name: `day09_ingestion`
  - `CHROMA_URL` (e.g. `http://localhost:8000`)

Make sure you have:

```bash
OPENAI_API_KEY=your_openai_key_here
CHROMA_URL=http://localhost:8000   # if using Chroma server
```

in your `.env`.

---

## 🧪 Files in This Folder

### 1️⃣ `code.ts` — Vanilla RAG (JSON Store + OpenAI)

**What it does:**

1. Loads `day09_local_ingestion_store.json`.
2. Embeds the user question using OpenAI’s embeddings API (`text-embedding-3-small`).
3. Computes **cosine similarity** between the question vector and all stored vectors.
4. Picks top-k chunks (e.g. `k = 3`).
5. Builds a simple prompt:

   - system message: “You are a helpful assistant, answer using the provided context.”
   - user message: includes:
     - the question
     - a “Context” section with numbered chunks

6. Calls OpenAI’s **chat completions** API (e.g. `gpt-4o-mini` or `gpt-4o`).
7. Prints:

   - the selected context chunks with their IDs/metadata
   - the final answer from the LLM

> This is a **bare-bones**, transparent implementation of RAG — great for learning and debugging.

Run:

```bash
npm run dev:day11:vanilla
```

---

### 2️⃣ `framework.ts` — RAG with LangChain + Chroma

**What it does:**

1. Creates a `ChatOpenAI` model from `@langchain/openai`.
2. Connects to your existing Chroma collection:

   ```ts
   const vectorStore = await Chroma.fromExistingCollection(...);
   const retriever = vectorStore.asRetriever({ k: 3 });
   ```

3. Uses a LangChain RAG-style chain:

   - retrieves documents
   - formats a prompt:
     - instructions (use context, be honest about missing info)
     - context block (joined from documents)
     - user question

4. Pipes everything into the LLM and prints:

   - the final answer
   - a summary of the retrieved documents (IDs + first characters)

It shows how **high-level frameworks** encapsulate the RAG pattern you implemented manually in vanilla TypeScript.

Run:

```bash
npm run dev:day11:framework
```

---

## 🧰 package.json Scripts

Add these entries:

```jsonc
"dev:day11:vanilla": "tsx day11_rag_pipeline/code.ts",
"dev:day11:framework": "tsx day11_rag_pipeline/framework.ts"
```

---

## 🔑 `.env.sample` (Suggested)

```bash
OPENAI_API_KEY=your_openai_key_here

# For framework (Chroma)
CHROMA_URL=http://localhost:8000
```

---

## 🧭 Things to Experiment With

- Change **k** (number of retrieved chunks). Too many can cause:
  - prompt bloat
  - confusion
- Try altering the **system prompt**:
  - “Always quote the source chunk id in your answer.”
- Try asking questions that:
  - are clearly answerable from the chunks
  - are **not** answerable → see how the model responds

Remember:  
> RAG is only as good as your **chunks**, **embeddings**, **vector store**, and **prompting**.

You’ve now wired all of these together.

---

## 📚 References (RAG)

- LangChain JS RAG guide: https://js.langchain.com/docs/use_cases/question_answering/
- Chroma + RAG examples: https://docs.trychroma.com/usage-guide
- Pinecone RAG concepts: https://www.pinecone.io/learn/retrieval-augmented-generation/
