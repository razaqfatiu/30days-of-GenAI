
import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";
import { Chroma } from "@langchain/community/vectorstores/chroma";
import { PineconeStore } from "@langchain/pinecone";
import { Pinecone } from "@pinecone-database/pinecone";
import weaviate, {
  ApiKey as WeaviateApiKey,
  type ConnectionParams as WeaviateConnectionParams,
  type WeaviateClient,
} from "weaviate-ts-client";

function createWeaviateClient(params: WeaviateConnectionParams): WeaviateClient {
  const moduleRef = weaviate as unknown as {
    client: (config: WeaviateConnectionParams) => WeaviateClient;
  };
  return moduleRef.client(params);
}

const QUERY = "Explain why chunking matters in a RAG system.";

async function searchWithChroma() {
  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const url = process.env.CHROMA_URL || "http://localhost:8000";

  const store = await Chroma.fromExistingCollection(embeddings, {
    collectionName: "day09_ingestion",
    url,
  });

  const results = await store.similaritySearch(QUERY, 3);
  console.log("\n[Chroma] Top Matches:");
  for (const doc of results) {
    console.log("-----");
    console.log("id:", doc.metadata.id);
    console.log("strategy:", doc.metadata.strategy);
    console.log("text:", doc.pageContent.slice(0, 140).replace(/\s+/g, " "), "...");
  }
}

async function searchWithPinecone() {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME;
  if (!apiKey || !indexName) {
    console.log("\n[Pinecone] Skipping — missing PINECONE_API_KEY or PINECONE_INDEX_NAME.");
    return;
  }

  const client = new Pinecone({ apiKey });
  const index = client.Index(indexName);

  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });

  const store = await PineconeStore.fromExistingIndex(embeddings, {
    pineconeIndex: index,
  });

  const results = await store.similaritySearch(QUERY, 3);
  console.log("\n[Pinecone] Top Matches:");
  for (const doc of results) {
    console.log("-----");
    console.log("id:", doc.metadata.id);
    console.log("strategy:", doc.metadata.strategy);
    console.log("text:", doc.pageContent.slice(0, 140).replace(/\s+/g, " "), "...");
  }
}

async function searchWithWeaviate() {
  const host = process.env.WEAVIATE_HOST;
  const apiKey = process.env.WEAVIATE_API_KEY;
  const indexClass = process.env.WEAVIATE_INDEX_CLASS || "Day09Chunk";

  if (!host || !apiKey) {
    console.log("\n[Weaviate] Skipping — missing WEAVIATE_HOST or WEAVIATE_API_KEY.");
    return;
  }

  const client: WeaviateClient = createWeaviateClient({
    scheme: process.env.WEAVIATE_SCHEME || "https",
    host,
    apiKey: new WeaviateApiKey(apiKey),
  });

  const embeddings = new OpenAIEmbeddings({ model: "text-embedding-3-small" });
  const queryEmbedding = await embeddings.embedQuery(QUERY);

  const response = await client.graphql
    .get()
    .withClassName(indexClass)
    .withNearVector({ vector: queryEmbedding })
    .withLimit(3)
    .withFields("chunkId text strategy source _additional { id distance }")
    .do();

  const hits = Array.isArray(response?.data?.Get?.[indexClass])
    ? response?.data?.Get?.[indexClass]
    : [];

  console.log("\n[Weaviate] Top Matches:");
  for (const hit of hits) {
    const distance = typeof hit?._additional?.distance === "number" ? hit._additional.distance.toFixed(4) : "n/a";
    console.log("-----");
    console.log("id:", hit?.chunkId ?? hit?._additional?.id ?? "n/a");
    console.log("strategy:", hit?.strategy ?? "unknown");
    console.log("distance:", distance);
    console.log("text:", String(hit?.text ?? "").slice(0, 140).replace(/\s+/g, " "), "...");
  }
}

async function main() {
  console.log("Running similarity search across vector DB providers...");
  await searchWithChroma();
  await searchWithPinecone();
  await searchWithWeaviate();
  console.log("\nNote: The underlying algorithms (HNSW, IVF, PQ, etc.) are chosen/configured by each vector DB.");
}

main().catch((err) => {
  console.error("Error in framework similarity search demo:", err);
});
