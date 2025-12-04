import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

interface ChunkMeta {
  id: string;
  index: number;
  startIndex: number;
  endIndex: number;
  strategy: string;
}

interface Chunk {
  meta: ChunkMeta;
  text: string;
}

interface Day7Output {
  totalChunks: number;
  chunks: Chunk[];
}

interface LocalVectorRecord {
  id: string;
  text: string;
  metadata: ChunkMeta;
  embedding: number[];
}

interface LocalVectorStore {
  totalRecords: number;
  createdAt: string;
  updatedAt: string;
  records: LocalVectorRecord[];
}

const DAY7_PATH = path.join(__dirname, "..", "day07_chunking", "day07_chunks.json");
const STORE_PATH = path.join(__dirname, "day09_local_ingestion_store.json");
const BATCH_SIZE = 8;

// ---------- Utility: Cleaning & Normalization ----------

function cleanText(text: string): string {
  // Trim, collapse internal whitespace, remove extra newlines
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ") // non-breaking space
    .trim();
}

// ---------- Load Day 7 Chunks ----------

if (!fs.existsSync(DAY7_PATH)) {
  console.error("❌ Missing day07_chunks.json. Run Day 7 first.");
  process.exit(1);
}

const day7Raw = fs.readFileSync(DAY7_PATH, "utf8");
const day7Data: Day7Output = JSON.parse(day7Raw);

console.log(`Loaded ${day7Data.totalChunks} chunks from Day 7.`);

// Normalize and filter chunks
const normalizedChunks: Chunk[] = day7Data.chunks
  .map((chunk) => ({
    ...chunk,
    text: cleanText(chunk.text),
  }))
  .filter((chunk) => chunk.text.length > 0);

console.log(`After cleaning, ${normalizedChunks.length} chunks remain.`);

// ---------- Load Existing Store (for Upserts) ----------

let existingStore: LocalVectorStore | null = null;
let existingById: Map<string, LocalVectorRecord> = new Map();

if (fs.existsSync(STORE_PATH)) {
  const raw = fs.readFileSync(STORE_PATH, "utf8");
  existingStore = JSON.parse(raw) as LocalVectorStore;
  existingById = new Map(existingStore.records.map((r) => [r.id, r]));
  console.log(`Found existing store with ${existingStore.totalRecords} records.`);
} else {
  console.log("No existing store found. A new one will be created.");
}

// ---------- OpenAI Embedding Helpers (Batch) ----------

async function embedBatch(texts: string[]): Promise<number[][]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("Missing OPENAI_API_KEY in environment.");
  }

  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: texts,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI embeddings API error: ${res.status} - ${errText}`);
  }

  const json: any = await res.json();
  const data = json.data;
  if (!Array.isArray(data)) {
    throw new Error("Unexpected embeddings API response format.");
  }

  return data.map((item: any) => item.embedding);
}

// ---------- Ingestion with Batching & Upserts ----------

async function ingest() {
  const newRecords: LocalVectorRecord[] = [];
  const now = new Date().toISOString();

  // Determine which chunks need (re-)embedding
  const toEmbed: Chunk[] = [];
  for (const chunk of normalizedChunks) {
    const existing = existingById.get(chunk.meta.id);
    if (!existing || existing.text !== chunk.text) {
      toEmbed.push(chunk);
    }
  }

  console.log(`Chunks needing (re)embedding: ${toEmbed.length}.`);

  // Embed in batches
  for (let i = 0; i < toEmbed.length; i += BATCH_SIZE) {
    const batch = toEmbed.slice(i, i + BATCH_SIZE);
    console.log(`Embedding batch ${i / BATCH_SIZE + 1} (size=${batch.length})...`);

    const embeddings = await embedBatch(batch.map((c) => c.text));

    batch.forEach((chunk, idx) => {
      const embedding = embeddings[idx];
      const record: LocalVectorRecord = {
        id: chunk.meta.id,
        text: chunk.text,
        metadata: chunk.meta,
        embedding,
      };
      newRecords.push(record);
      existingById.set(chunk.meta.id, record);
    });
  }

  // Merge into final array
  const mergedRecords = Array.from(existingById.values());

  const store: LocalVectorStore = {
    totalRecords: mergedRecords.length,
    createdAt: existingStore?.createdAt || now,
    updatedAt: now,
    records: mergedRecords,
  };

  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), "utf8");

  console.log(`
✅ Ingestion complete.`);
  console.log(`- New/updated records: ${newRecords.length}`);
  console.log(`- Total records in store: ${store.totalRecords}`);
  console.log(`- Store path: ${STORE_PATH}`);
}

ingest().catch((err) => {
  console.error("❌ Error in ingestion pipeline:", err);
});