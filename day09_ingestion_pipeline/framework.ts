import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { OpenAIEmbeddings } from "@langchain/openai";

const CHUNKS_PATH = path.join(__dirname, "..", "day07_chunking", "day07_chunks.json");
const COLLECTION_NAME = "day09_ingestion";

if (!fs.existsSync(CHUNKS_PATH)) {
  console.error("❌ Missing day07_chunks.json. Run Day 7 first.");
  process.exit(1);
}

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

// Simple cleaner to keep text consistent with vanilla version
function cleanText(text: string): string {
  return text
    .replace(/\s+/g, " ")
    .replace(/\u00A0/g, " ")
    .trim();
}

const raw: Day7Output = JSON.parse(fs.readFileSync(CHUNKS_PATH, "utf8"));

const docs: Document[] = raw.chunks
  .map((chunk) => ({
    ...chunk,
    text: cleanText(chunk.text),
  }))
  .filter((chunk) => chunk.text.length > 0)
  .map((chunk) => {
    return new Document({
      pageContent: chunk.text,
      metadata: {
        ...chunk.meta,
        source: "day07_chunking/day07_chunks.json",
      },
    });
  });

async function main() {
  const url = process.env.CHROMA_URL || "http://localhost:8000";
  console.log(`Using Chroma at: ${url}`);
  console.log(`Preparing to ingest ${docs.length} documents into collection "${COLLECTION_NAME}".`);

  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  let vectorStore: Chroma;

  try {
    // Try to connect to an existing collection (for "upsert"-like behavior)
    vectorStore = await Chroma.fromExistingCollection(embeddings, {
      collectionName: COLLECTION_NAME,
      url,
    });
    console.log(`✅ Connected to existing Chroma collection "${COLLECTION_NAME}". Adding documents...`);
    await vectorStore.addDocuments(docs);
  } catch (err) {
    console.warn(`⚠️ Could not find existing collection "${COLLECTION_NAME}". Creating a new one...`);
    vectorStore = await Chroma.fromDocuments(docs, embeddings, {
      collectionName: COLLECTION_NAME,
      url,
    });
    console.log(`✅ Created new Chroma collection "${COLLECTION_NAME}".`);
  }

  // Simple test query
  const query = "Why is chunking important in RAG?";
  const k = 3;

  console.log(`\n🔍 Running similarity search for: "${query}" (top ${k})`);
  const results = await vectorStore.similaritySearch(query, k);

  for (const doc of results) {
    console.log("-".repeat(40));
    console.log(`id: ${doc.metadata.id}, strategy: ${doc.metadata.strategy}`);
    console.log(`text: ${doc.pageContent.slice(0, 160).replace(/\s+/g, " ")}...`);
  }

  console.log("\n✅ Chroma ingestion & search demo complete.");
}

main().catch((err) => {
  console.error("❌ Error in framework ingestion demo:", err);
});