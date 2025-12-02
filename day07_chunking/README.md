# Day 7 — Chunking & Semantic Chunking: Preparing Text for Embeddings and RAG

## 🔄 Connection to Day 6

On **Day 6**, you learned how embeddings turn text into vectors so that AI can compare meaning.
Today, we take a step back and answer a crucial question:

> _What exactly are we embedding?_

The answer: **chunks** — carefully sliced pieces of your documents.

If chunking is bad, retrieval is bad, and your RAG system will fail no matter how good your model is.

---

## 🎯 Goal

By the end of this day, you should understand:

- Why we **never** embed whole documents
- Different chunking strategies (fixed, sentence, recursive)
- Chunking parameters: size, overlap, boundaries
- Why metadata is essential for debugging and retrieval
- What **semantic chunking** is and when to use it
- How to implement chunking in:
  - **vanilla TypeScript** (no external calls)
  - **LangChain + OpenAI** (with semantic chunking)
- How to export chunks & embeddings to JSON files

---

## 🧠 Why Chunking Exists

In real systems:

- Documents are long (PDFs, docs, wikis, transcripts)
- Embedding models work best on **moderate-sized** texts
- LLMs have **limited context windows**

So instead of embedding a whole book, we:

1. **Split** it into smaller pieces (chunks)
2. **Attach metadata** to each chunk
3. **Embed** each chunk
4. **Search** and retrieve chunks at query time

Chunking = _preparing data so embeddings and search work well_.

---

## 🪓 Chunking Strategies

### 1. Fixed-Size Character Chunking

Split text every N characters with some overlap.

- ✅ Simple to implement
- ❌ Can break sentences or headings mid-way

### 2. Sentence-Based Chunking

Split into sentences, then group sentences into chunks.

- ✅ Respects sentence boundaries
- ✅ Better for meaning
- ❌ Needs a sentence splitter

### 3. Recursive Chunking (Recommended)

Try larger, natural boundaries first (e.g. headings), then fallback to smaller ones.

Example heuristic:

1. Try to split by `\n\n` (paragraphs)
2. If still too long, split by `.`
3. If still too long, split by characters

This is similar to LangChain’s `RecursiveCharacterTextSplitter`.

---

## ⚙️ Chunking Parameters

Common parameters:

- **chunkSize** — how big each chunk is (in characters or tokens)
- **chunkOverlap** — how much previous context we keep to avoid cutting meaning
- **preserveSentence** — whether we avoid cutting mid-sentence
- **maxChars** — hard limit to keep chunks safe

Guidelines (rough, not strict):

- General text: 300–800 characters or ~150–400 tokens
- Code: smaller chunks (e.g. 50–120 tokens)
- Legal / technical: ensure paragraphs stay intact when possible

---

## 🧾 Metadata (Do Not Skip This)

Every chunk should carry **metadata** so you can:

- trace where an answer came from
- filter by document, section, page, tags
- debug bad retrieval

Examples:

```json
{
  "id": "doc1-chunk-3",
  "source": "docs/rag_intro.md",
  "section": "Why Chunking Matters",
  "startIndex": 420,
  "endIndex": 920
}
```

Today’s code attaches simple metadata for you.

---

## 🧠 Semantic Chunking (Concept)

So far, chunking has been **rule-based** (characters, sentences, headings).
**Semantic chunking** goes further:

> Use embeddings or an LLM to find _natural topic boundaries_.

Useful for:

- meeting transcripts
- very long messy documents
- multi-topic sections

We will:

- Simulate semantic grouping in vanilla TS (heuristic)
- Show a real OpenAI-based semantic splitter using LangChain

---

## 🧪 Files and What They Do

### `code.ts` — Vanilla Chunking & Heuristic “Semantic” Grouping

- Reads a sample corpus (inline string or `corpus.txt` if you create it)
- Provides a **flexible `chunkText` function** with strategy options:
  - `"characters"`
  - `"sentences"`
  - `"recursive"`
- Adds simple metadata to each chunk
- Writes the result into **`day07_chunks.json`**

> This file does **not** call any external API.

Run:

```bash
npm run dev:day7:vanilla
```

---

### `framework.ts` — LangChain Chunking + Embeddings JSON

- Uses LangChain’s `RecursiveCharacterTextSplitter`
- Generates embeddings for chunks using `text-embedding-3-small`
- Writes a combined JSON file:
  - `day07_chunks_with_embeddings.json`

> ⚠ Requires `OPENAI_API_KEY` in your `.env`.

Run:

```bash
npm run dev:day7:framework
```

---

## 🧰 Setup Notes

Dependencies you’ll need (already used in previous days):

- `@langchain/openai`
- `@langchain/textsplitters`
- `@langchain/core`
- `dotenv`

Package scripts pattern:

```jsonc
"dev:day7:vanilla": "tsx day07_chunking/code.ts",
"dev:day7:framework": "tsx day07_chunking/framework.ts"
```

---

## 📚 References

- LangChain Text Splitters: https://js.langchain.com/docs/modules/data_connection/document_transformers/
- OpenAI Embeddings: https://platform.openai.com/docs/guides/embeddings
- RAG & Chunking Concepts: https://www.pinecone.io/learn/chunking-strategies/

---

## ⏭ Coming Next: Day 8 — Vector Databases & Ingestion

Now that your text is **well-chunked**, the next step is:

- Embed those chunks
- Store them in a vector database
- Build efficient retrieval

Day 8 will cover:

- Vector DBs (Pinecone, Chroma, Qdrant, etc.)
- Ingestion pipelines
- Metadata filtering and indexing.
