// day08_vector_db/code.ts
// Vanilla local JSON "vector store" using OpenAI embeddings and cosine similarity.
// Input: ../day07_chunking/day07_chunks.json
// Output: day08_local_vector_store.json
// Run: npx tsx day08_vector_db/code.ts

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

interface Day7ChunkMeta {
  id: string;
  index: number;
  startIndex: number;
  endIndex: number;
  strategy: string;
}

interface Day7Chunk {
  meta: Day7ChunkMeta;
  text: string;
}

interface LocalVectorRecord {
  id: string;
  text: string;
  metadata: Day7ChunkMeta;
  embedding: number[];
}

interface Day7File {
  strategy: string;
  chunkSize: number;
  overlap: number;
  totalChunks: number;
  chunks: Day7Chunk[];
}

// Simple cosine similarity for embeddings
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

// Call OpenAI embeddings API directly using fetch
async function embedText(text: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not set in environment");
  }

  const response = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI embeddings API error: ${response.status} - ${errText}`);
  }

  const data: any = await response.json();
  const embedding = data.data?.[0]?.embedding;
  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Unexpected embeddings API response format");
  }
  return embedding;
}

async function main() {
  const inputPath = path.join(__dirname, "..", "day07_chunking", "day07_chunks.json");
  if (!fs.existsSync(inputPath)) {
    console.error("Could not find day07_chunks.json at:", inputPath);
    console.error("Make sure you've run Day 7 first.");
    process.exit(1);
  }

  const raw = fs.readFileSync(inputPath, "utf-8");
  const parsed: Day7File = JSON.parse(raw);

  console.log(`Loaded ${parsed.totalChunks} chunks from Day 7 output.`);

  const records: LocalVectorRecord[] = [];
  for (const chunk of parsed.chunks) {
    const text = chunk.text.trim();
    if (!text) continue;

    console.log(`Embedding chunk ${chunk.meta.id}...`);
    const embedding = await embedText(text);

    records.push({
      id: chunk.meta.id,
      text,
      metadata: chunk.meta,
      embedding,
    });
  }

  const storePath = path.join(__dirname, "day08_local_vector_store.json");
  fs.writeFileSync(
    storePath,
    JSON.stringify(
      {
        totalRecords: records.length,
        createdAt: new Date().toISOString(),
        records,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Saved ${records.length} records to ${storePath}`);

  // Demo similarity search
  const query = "Why do we chunk documents before using RAG?";
  console.log("\nRunning a demo similarity search for query:");
  console.log(query);

  const queryEmbedding = await embedText(query);

  const scored = records.map((rec) => ({
    ...rec,
    score: cosineSimilarity(queryEmbedding, rec.embedding),
  }));

  scored.sort((a, b) => b.score - a.score);

  console.log("\nTop 3 matches:");
  for (const rec of scored.slice(0, 3)) {
    console.log(`- [score=${rec.score.toFixed(3)}] id=${rec.id}`);
    console.log(`  text="${rec.text.slice(0, 120).replace(/\s+/g, " ")}" ...`);
  }
}

main().catch((err) => {
  console.error("Error in local vector store demo:", err);
});