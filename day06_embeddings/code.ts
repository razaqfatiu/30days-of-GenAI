// day06_embeddings/code.ts
// Vanilla embeddings intuition: vectors, cosine similarity, and ranking similarity.
// Run: npx tsx day06_embeddings/code.ts

type Vector = number[];

// Compute dot product of two vectors
function dot(a: Vector, b: Vector): number {
  return a.reduce((sum, ai, i) => sum + ai * b[i], 0);
}

// Compute magnitude (length) of a vector
function magnitude(v: Vector): number {
  return Math.sqrt(dot(v, v));
}

// Compute cosine similarity between two vectors
function cosineSimilarity(a: Vector, b: Vector): number {
  const denom = magnitude(a) * magnitude(b);
  if (denom === 0) return 0;
  return dot(a, b) / denom;
}

// Simple "fake" embeddings for intuition (3D vectors)
const embeddingStore: { text: string; vector: Vector }[] = [
  { text: "I love this product", vector: [0.8, 0.9, 0.1] },
  { text: "This product is great", vector: [0.78, 0.88, 0.12] },
  { text: "The weather is terrible today", vector: [-0.3, 0.1, 0.9] },
  { text: "I hate this experience", vector: [-0.7, -0.8, 0.2] },
];

// Let's say this is our "query embedding"
const queryEmbedding: Vector = [0.75, 0.85, 0.15]; // roughly similar to positive product reviews

console.log("=== Cosine Similarity Demo ===");
for (const doc of embeddingStore) {
  const sim = cosineSimilarity(queryEmbedding, doc.vector);
  console.log(`Similarity(query, "${doc.text}") = ${sim.toFixed(3)}`);
}

// Rank documents by similarity
const ranked = [...embeddingStore].sort((a, b) => {
  const simA = cosineSimilarity(queryEmbedding, a.vector);
  const simB = cosineSimilarity(queryEmbedding, b.vector);
  return simB - simA;
});

console.log("\n=== Ranked by Similarity ===");
ranked.forEach((doc, index) => {
  const sim = cosineSimilarity(queryEmbedding, doc.vector);
  console.log(`#${index + 1} (${sim.toFixed(3)}): ${doc.text}`);
});

console.log(`
Takeaways:
- Higher cosine similarity = more similar meaning.
- In real systems, embeddings have hundreds of dimensions.
- The idea is the same: convert text -> numbers, then compare vectors.
`);