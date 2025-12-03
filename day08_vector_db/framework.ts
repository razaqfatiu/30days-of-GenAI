// day08_vector_db/framework.ts
// LangChain-based multi-provider vector DB demo:
// - Chroma (default)
// - Pinecone
// - Weaviate
//
// Input: ../day07_chunking/day07_chunks.json
// Run:
//   npx tsx day08_vector_db/framework.ts
//   VECTOR_DB_PROVIDER=pinecone npx tsx day08_vector_db/framework.ts
//   VECTOR_DB_PROVIDER=weaviate npx tsx day08_vector_db/framework.ts

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { Document } from "@langchain/core/documents";
import { OpenAIEmbeddings } from "@langchain/openai";

// Vector store imports
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PineconeStore } from "@langchain/pinecone";

// Pinecone + Weaviate clients
import { Pinecone } from "@pinecone-database/pinecone";
import weaviate, {
  ApiKey as WeaviateApiKey,
  type ConnectionParams as WeaviateConnectionParams,
  type WeaviateClient,
} from "weaviate-ts-client";

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

interface Day7File {
  strategy: string;
  chunkSize: number;
  overlap: number;
  totalChunks: number;
  chunks: Day7Chunk[];
}

function createWeaviateClient(params: WeaviateConnectionParams): WeaviateClient {
  const moduleRef = weaviate as unknown as {
    client: (config: WeaviateConnectionParams) => WeaviateClient;
  };
  return moduleRef.client(params);
}

function loadDay7Chunks(): Day7File {
  const inputPath = path.join(__dirname, "..", "day07_chunking", "day07_chunks.json");
  if (!fs.existsSync(inputPath)) {
    throw new Error(`Could not find day07_chunks.json at: ${inputPath}. Run Day 7 first.`);
  }
  const raw = fs.readFileSync(inputPath, "utf-8");
  return JSON.parse(raw) as Day7File;
}

function toDocuments(data: Day7File): Document[] {
  return data.chunks.map((chunk) => {
    return new Document({
      pageContent: chunk.text,
      metadata: {
        ...chunk.meta,
        source: "day07_chunking/day07_chunks.json",
      },
    });
  });
}

async function ingestWithChroma(docs: Document[], embeddings: OpenAIEmbeddings) {
  const url = process.env.CHROMA_URL || "http://localhost:8000";
  console.log(`Using Chroma at ${url}`);
  const collectionName = "day08_demo";

  const vectorStore = await Chroma.fromDocuments(docs, embeddings, {
    collectionName,
    url,
  });

  console.log(`Chroma collection "${collectionName}" created.`);

  const query = "Why do we chunk documents before using RAG?";
  const results = await vectorStore.similaritySearch(query, 3);

  console.log("\n[Chroma] Top results:");
  for (const doc of results) {
    console.log(`- id=${doc.metadata.id}, strategy=${doc.metadata.strategy}`);
    console.log(`  text="${doc.pageContent.slice(0, 120).replace(/\s+/g, " ")}" ...`);
  }
}

async function ingestWithPinecone(docs: Document[], embeddings: OpenAIEmbeddings) {
  const apiKey = process.env.PINECONE_API_KEY;
  const environment = process.env.PINECONE_ENVIRONMENT;
  const indexName = process.env.PINECONE_INDEX_NAME;

  if (!apiKey || !environment || !indexName) {
    console.warn("Missing Pinecone env vars. Skipping Pinecone ingestion.");
    return;
  }

  const client = new Pinecone({ apiKey });
  const index = client.Index(indexName);

  const vectorStore = await PineconeStore.fromDocuments(docs, embeddings, {
    pineconeIndex: index,
  });

  console.log(`Pinecone index "${indexName}" used.`);

  const query = "Why do we chunk documents before using RAG?";
  const results = await vectorStore.similaritySearch(query, 3);

  console.log("\n[Pinecone] Top results:");
  for (const doc of results) {
    console.log(`- id=${doc.metadata.id}, strategy=${doc.metadata.strategy}`);
    console.log(`  text="${doc.pageContent.slice(0, 120).replace(/\s+/g, " ")}" ...`);
  }
}

async function ingestWithWeaviate(docs: Document[], embeddings: OpenAIEmbeddings) {
  const scheme = process.env.WEAVIATE_SCHEME || "https";
  const host = process.env.WEAVIATE_HOST;
  const apiKey = process.env.WEAVIATE_API_KEY;
  const indexClass = process.env.WEAVIATE_INDEX_CLASS || "Day08Chunk";
  const batchSizeInput = Number(process.env.WEAVIATE_BATCH_SIZE || "25");
  const batchSize = Number.isFinite(batchSizeInput) && batchSizeInput > 0 ? batchSizeInput : 25;
  const resetClass = process.env.WEAVIATE_RESET_CLASS === "true";

  if (!host || !apiKey) {
    console.warn("Missing Weaviate env vars. Skipping Weaviate ingestion.");
    return;
  }

  const client: WeaviateClient = createWeaviateClient({
    scheme,
    host,
    apiKey: new WeaviateApiKey(apiKey),
  });

  if (resetClass) {
    try {
      await client.schema.classDeleter().withClassName(indexClass).do();
      console.log(`Deleted existing class "${indexClass}" before re-ingesting.`);
    } catch (err) {
      console.warn(`Could not delete class "${indexClass}" (it may not exist yet):`, err);
    }
  }

  const schema = await client.schema.getter().do();
  const hasClass =
    Array.isArray(schema?.classes) && schema.classes.some((cls: any) => cls.class === indexClass);

  if (!hasClass) {
    await client.schema
      .classCreator()
      .withClass({
        class: indexClass,
        vectorizer: "none",
        properties: [
          { name: "chunkId", dataType: ["text"] },
          { name: "text", dataType: ["text"] },
          { name: "strategy", dataType: ["text"] },
          { name: "source", dataType: ["text"] },
          { name: "chunkIndex", dataType: ["int"] },
          { name: "startIndex", dataType: ["int"] },
          { name: "endIndex", dataType: ["int"] },
        ],
      })
      .do();
    console.log(`Created Weaviate class "${indexClass}".`);
  } else {
    console.log(`Using existing Weaviate class "${indexClass}".`);
  }

  const vectors = await embeddings.embedDocuments(docs.map((doc) => doc.pageContent));
  console.log(`Uploading ${docs.length} documents to Weaviate in batches of ${batchSize}.`);

  for (let i = 0; i < docs.length; i += batchSize) {
    const batcher = client.batch.objectsBatcher();
    for (let j = i; j < Math.min(i + batchSize, docs.length); j++) {
      const doc = docs[j];
      const meta = doc.metadata as Day7ChunkMeta & { source?: string };
      batcher.withObject({
        class: indexClass,
        id: String(meta.id ?? j),
        vector: vectors[j],
        properties: {
          chunkId: String(meta.id ?? j),
          text: doc.pageContent,
          strategy: meta.strategy ?? "unknown",
          source: meta.source ?? "day07_chunking/day07_chunks.json",
          chunkIndex: meta.index ?? j,
          startIndex: meta.startIndex ?? 0,
          endIndex: meta.endIndex ?? 0,
        },
      });
    }
    await batcher.do();
  }

  console.log(`Weaviate class "${indexClass}" loaded with ${docs.length} objects.`);

  const query = "Why do we chunk documents before using RAG?";
  const queryEmbedding = await embeddings.embedQuery(query);
  const response = await client.graphql
    .get()
    .withClassName(indexClass)
    .withFields(
      "chunkId text strategy source chunkIndex startIndex endIndex _additional { id distance }"
    )
    .withNearVector({ vector: queryEmbedding })
    .withLimit(3)
    .do();

  const hits = Array.isArray(response?.data?.Get?.[indexClass])
    ? response?.data?.Get?.[indexClass]
    : [];

  console.log("\n[Weaviate] Top results:");
  for (const hit of hits) {
    const text = hit?.text ?? "";
    const distance = hit?._additional?.distance;
    const chunkId = hit?.chunkId ?? hit?._additional?.id ?? "n/a";
    console.log(
      `- id=${chunkId}, strategy=${hit?.strategy ?? "unknown"}, distance=${
        typeof distance === "number" ? distance.toFixed(4) : "n/a"
      }`
    );
    console.log(`  text="${String(text).slice(0, 120).replace(/\s+/g, " ")}" ...`);
  }
}

async function main() {
  const provider = process.env.VECTOR_DB_PROVIDER || "chroma";
  console.log("VECTOR_DB_PROVIDER =", provider);

  const day7 = loadDay7Chunks();
  console.log(`Loaded ${day7.totalChunks} chunks from Day 7 output.`);

  const docs = toDocuments(day7);
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  if (provider === "chroma") {
    await ingestWithChroma(docs, embeddings);
  } else if (provider === "pinecone") {
    await ingestWithPinecone(docs, embeddings);
  } else if (provider === "weaviate") {
    await ingestWithWeaviate(docs, embeddings);
  } else {
    console.warn(`Unknown VECTOR_DB_PROVIDER: ${provider}. Supported: chroma | pinecone | weaviate.`);
  }
}

main().catch((err) => {
  console.error("Error in framework vector DB demo:", err);
});
