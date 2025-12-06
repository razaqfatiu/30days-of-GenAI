
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

interface LocalVectorRecord {
  id: string;
  text: string;
  metadata: any;
  embedding: number[];
}

interface LocalVectorStore {
  totalRecords: number;
  createdAt: string;
  updatedAt: string;
  records: LocalVectorRecord[];
}

function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (!magA || !magB) return 0;
  return dot / (magA * magB);
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set.");
  process.exit(1);
}

async function embedText(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "text-embedding-3-small",
      input: text,
    }),
  });

  const json: any = await res.json();
  return json.data[0].embedding;
}

async function callChatCompletion(question: string, context: string): Promise<string> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a helpful assistant. Use ONLY the provided context. If the answer is not in the context, say you don't know.",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${context}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  const json: any = await res.json();
  return json.choices[0].message.content;
}

async function main() {
  const storePath = path.join(
    __dirname,
    "..",
    "day09_ingestion_pipeline",
    "day09_local_ingestion_store.json"
  );

  if (!fs.existsSync(storePath)) {
    console.error("Missing day09_local_ingestion_store.json. Run Day 9 first.");
    process.exit(1);
  }

  const store: LocalVectorStore = JSON.parse(fs.readFileSync(storePath, "utf8"));

  const question =
    "In simple terms, why is chunking important in a RAG system, and how does it affect retrieval quality?";

  console.log("User Question:\n", question);

  const queryEmbedding = await embedText(question);

  const scored = store.records
    .map((rec) => ({
      record: rec,
      score: cosineSimilarity(queryEmbedding, rec.embedding),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  console.log("\nTop Retrieved Chunks:");
  const contextParts: string[] = [];
  scored.forEach(({ record, score }, index) => {
    console.log(`\n[${index + 1}] Chunk ID: ${record.id}, Score: ${score.toFixed(3)}`);
    console.log(record.text.slice(0, 200), "...");
    contextParts.push(`[chunk:${record.id}] ${record.text.replace(/\s+/g, " ").slice(0, 800)}`);
  });

  const context = contextParts.join("\n\n");

  const answer = await callChatCompletion(question, context);

  console.log("\nModel Answer:\n", answer);
}

main().catch(console.error);
