
// day07_chunking/framework.ts
// LangChain-based chunking and embeddings JSON output.
// Run: npx tsx day07_chunking/framework.ts

import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { RecursiveCharacterTextSplitter } from "@langchain/textsplitters";
import { OpenAIEmbeddings } from "@langchain/openai";

const DEFAULT_TEXT = `Retrieval-Augmented Generation (RAG) combines a language model with external knowledge sources.
Instead of relying only on the model's memory, we fetch relevant chunks from a knowledge base and feed them into the prompt.

Chunking is the process of splitting documents into smaller pieces before embedding them.
Good chunks preserve meaning and can stand on their own when retrieved.`;

function loadCorpus(): string {
  const corpusPath = path.join(__dirname, "corpus.txt");
  if (fs.existsSync(corpusPath)) {
    return fs.readFileSync(corpusPath, "utf-8");
  }
  return DEFAULT_TEXT;
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY is not set. Embeddings will be skipped, only chunks will be written.");
  }

  const rawText = loadCorpus();
  console.log("Loaded corpus length:", rawText.length);

  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 500,
    chunkOverlap: 50,
  });

  const docs = await splitter.createDocuments([rawText], [
    { source: "corpus.txt" },
  ]);

  console.log(`Recursive splitter produced ${docs.length} chunks.`);

  let withEmbeddings: any[] = docs.map((d, idx) => ({
    id: `doc-${idx}`,
    text: d.pageContent,
    metadata: d.metadata,
    embedding: null,
  }));

  if (apiKey) {
    const embeddings = new OpenAIEmbeddings({
      model: "text-embedding-3-small",
    });

    console.log("Generating embeddings for chunks...");
    const vectors = await embeddings.embedDocuments(docs.map((d) => d.pageContent));
    withEmbeddings = withEmbeddings.map((item, i) => ({
      ...item,
      embedding: vectors[i],
    }));
  }

  const outPath = path.join(__dirname, "day07_chunks_with_embeddings.json");
  fs.writeFileSync(
    outPath,
    JSON.stringify(
      {
        chunkSize: 500,
        chunkOverlap: 50,
        totalChunks: withEmbeddings.length,
        chunks: withEmbeddings,
      },
      null,
      2
    ),
    "utf-8"
  );

  console.log(`Wrote ${withEmbeddings.length} chunks (with embeddings if available) to ${outPath}`);
}

main().catch((err) => {
  console.error("Framework chunking demo failed:", err);
});
