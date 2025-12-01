// day06_embeddings/framework.ts
// Real embeddings with OpenAI + LangChain: small semantic search demo.
// Run: npx tsx day06_embeddings/framework.ts

import "dotenv/config";
import { OpenAIEmbeddings } from "@langchain/openai";

// Tiny in-memory "document store"
const documents = [
  {
    id: 1,
    title: "Intro to Embeddings",
    content: "Embeddings convert text into vectors so that similar meanings are close in vector space."
  },
  {
    id: 2,
    title: "Building a RAG System",
    content: "RAG systems retrieve relevant chunks using embeddings before calling an LLM."
  },
  {
    id: 3,
    title: "Cooking Pasta",
    content: "Boil water, add pasta, and cook until al dente before adding sauce."
  },
];

// Cosine similarity helper for real vectors
function cosineSimilarity(a: number[], b: number[]): number {
  const dot = a.reduce((sum, ai, i) => sum + ai * b[i], 0);
  const magA = Math.sqrt(a.reduce((sum, ai) => sum + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((sum, bi) => sum + bi * bi, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

async function main() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY in environment.");
    return;
  }

  // Use OpenAI's text-embedding-3-small model
  const embeddings = new OpenAIEmbeddings({
    model: "text-embedding-3-small",
  });

  console.log("Embedding documents...");
  const docContents = documents.map((d) => d.content);
  const docVectors = await embeddings.embedDocuments(docContents);

  const query = "How do I use embeddings in a RAG pipeline?";
  console.log("\nQuery:", query);

  const queryVector = await embeddings.embedQuery(query);

  console.log("\nComputing similarities...");
  const scored = documents.map((doc, idx) => ({
    ...doc,
    similarity: cosineSimilarity(queryVector, docVectors[idx]),
  }));

  const ranked = scored.sort((a, b) => b.similarity - a.similarity);

  console.log("\n=== Ranked Results ===");
  for (const doc of ranked) {
    console.log(
      `- [score=${doc.similarity.toFixed(3)}] ${doc.title}: ${doc.content}`
    );
  }

  console.log(`
Takeaways:
- We turned both documents and query into embeddings.
- Semantic similarity is computed with cosine similarity.
- Top result is what you would feed into an LLM in a RAG system.
`);
}

main().catch((err) => {
  console.error("Embedding demo failed:", err);
});