
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

interface RagMetrics {
  question: string;
  timestamp: string;
  latency: {
    embedMs: number;
    retrievalMs: number;
    llmMs: number;
    totalMs: number;
  };
  tokens: {
    embeddingTokens: number;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  retrieval: {
    k: number;
    chosenChunkIds: string[];
    scored: {
      id: string;
      score: number;
    }[];
  };
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
  console.error("❌ OPENAI_API_KEY is not set. Add it to your .env file.");
  process.exit(1);
}

async function embedText(text: string): Promise<{ embedding: number[]; tokens: number }> {
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

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Embeddings API error: ${res.status} - ${errText}`);
  }

  const json: any = await res.json();
  const embedding = json.data?.[0]?.embedding;
  const tokens = json.usage?.total_tokens ?? 0;

  if (!embedding || !Array.isArray(embedding)) {
    throw new Error("Unexpected embeddings response format.");
  }

  return { embedding, tokens };
}

async function callChatCompletion(
  question: string,
  context: string
): Promise<{ answer: string; promptTokens: number; completionTokens: number; totalTokens: number }> {
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
            "You are a helpful AI assistant. Use ONLY the provided context to answer. " +
            "If the answer is not in the context, say you don't know. " +
            "When helpful, mention chunk ids like [chunk:xyz].",
        },
        {
          role: "user",
          content: `Question: ${question}\n\nContext:\n${context}`,
        },
      ],
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Chat completions API error: ${res.status} - ${errText}`);
  }

  const json: any = await res.json();
  const content = json.choices?.[0]?.message?.content;
  const usage = json.usage ?? {};
  const promptTokens = usage.prompt_tokens ?? 0;
  const completionTokens = usage.completion_tokens ?? 0;
  const totalTokens = usage.total_tokens ?? promptTokens + completionTokens;

  if (typeof content !== "string") {
    throw new Error("Unexpected chat completion response format.");
  }

  return {
    answer: content.trim(),
    promptTokens,
    completionTokens,
    totalTokens,
  };
}

async function runRagWithMetrics(
  question: string,
  options?: { k?: number }
): Promise<{ answer: string; metrics: RagMetrics }> {
  const k = options?.k ?? 3;

  const storePath = path.join(
    __dirname,
    "..",
    "day09_ingestion_pipeline",
    "day09_local_ingestion_store.json"
  );

  if (!fs.existsSync(storePath)) {
    throw new Error("Missing day09_local_ingestion_store.json. Run Day 9 first.");
  }

  const raw = fs.readFileSync(storePath, "utf-8");
  const store: LocalVectorStore = JSON.parse(raw);

  const t0 = Date.now();

  const tEmbedStart = Date.now();
  const { embedding: queryEmbedding, tokens: embeddingTokens } = await embedText(question);
  const tEmbedEnd = Date.now();

  const tRetrievalStart = Date.now();
  const scored = store.records.map((rec) => ({
    record: rec,
    score: cosineSimilarity(queryEmbedding, rec.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  const topK = scored.slice(0, k);
  const tRetrievalEnd = Date.now();

  const contextLines: string[] = [];
  const chosenChunkIds: string[] = [];

  topK.forEach(({ record }) => {
    chosenChunkIds.push(record.id);
    contextLines.push(
      `[chunk:${record.id}] ${record.text.replace(/\s+/g, " ").slice(0, 800)}`
    );
  });
  const context = contextLines.join("\n\n");

  const tLlmStart = Date.now();
  const {
    answer,
    promptTokens,
    completionTokens,
    totalTokens,
  } = await callChatCompletion(question, context);
  const tLlmEnd = Date.now();

  const t1 = Date.now();

  const metrics: RagMetrics = {
    question,
    timestamp: new Date().toISOString(),
    latency: {
      embedMs: tEmbedEnd - tEmbedStart,
      retrievalMs: tRetrievalEnd - tRetrievalStart,
      llmMs: tLlmEnd - tLlmStart,
      totalMs: t1 - t0,
    },
    tokens: {
      embeddingTokens,
      promptTokens,
      completionTokens,
      totalTokens,
    },
    retrieval: {
      k,
      chosenChunkIds,
      scored: topK.map(({ record, score }) => ({
        id: record.id,
        score,
      })),
    },
  };

  return { answer, metrics };
}

function appendMetricsToLog(metrics: RagMetrics, logPath: string) {
  let existing: RagMetrics[] = [];
  if (fs.existsSync(logPath)) {
    try {
      const raw = fs.readFileSync(logPath, "utf-8");
      existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    } catch {
      existing = [];
    }
  }

  existing.push(metrics);
  fs.writeFileSync(logPath, JSON.stringify(existing, null, 2), "utf-8");
}

async function main() {
  const question =
    "In simple terms, why is chunking important in a RAG system, and how does it affect retrieval quality?";

  console.log("🧑‍💻 Question:");
  console.log(question);

  const { answer, metrics } = await runRagWithMetrics(question, { k: 3 });

  console.log("\n💬 Answer:");
  console.log(answer);

  console.log("\n📊 Metrics:");
  console.log(JSON.stringify(metrics, null, 2));

  const logPath = path.join(__dirname, "day12_rag_metrics_log.json");
  appendMetricsToLog(metrics, logPath);
  console.log(`\n📝 Metrics appended to ${logPath}`);
}

main().catch((err) => {
  console.error("❌ Error in Day 12 metrics demo:", err);
});
