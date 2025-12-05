import * as fs from "fs";
import * as path from "path";

interface RecordItem {
  id: string;
  text: string;
  metadata: any;
  embedding: number[];
}

interface Store {
  totalRecords: number;
  records: RecordItem[];
}

// ---------- Utility: cosine similarity ----------

function cosine(a: number[], b: number[]): number {
  const dot = a.reduce((s, v, i) => s + v * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, v) => s + v * v, 0));
  const magB = Math.sqrt(b.reduce((s, v) => s + v * v, 0));
  return magA && magB ? dot / (magA * magB) : 0;
}

// ---------- Load local store from Day 9 ----------

const storePath = path.join(
  __dirname,
  "..",
  "day09_ingestion_pipeline",
  "day09_local_ingestion_store.json"
);

if (!fs.existsSync(storePath)) {
  console.error("❌ Missing ingestion store. Run Day 9 first.");
  process.exit(1);
}

const store: Store = JSON.parse(fs.readFileSync(storePath, "utf8"));
const vectors = store.records;

// ---------- 1) kNN: exact linear search ----------

function knnSearch(queryEmbedding: number[], k: number) {
  const scored = vectors.map((r) => ({
    record: r,
    score: cosine(queryEmbedding, r.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------- 2) ANN-like bucket search (toy) ----------

// Simple bucketing on the first dimension of the embedding
function buildBuckets(bucketCount: number): Map<number, RecordItem[]> {
  const buckets = new Map<number, RecordItem[]>();
  for (const rec of vectors) {
    const key = Math.floor(
      ((rec.embedding[0] || 0) + 1) / 2 * bucketCount
    ); // map [-1,1] to [0,bucketCount)
    const clamped = Math.max(0, Math.min(bucketCount - 1, key));
    if (!buckets.has(clamped)) buckets.set(clamped, []);
    buckets.get(clamped)!.push(rec);
  }
  return buckets;
}

function annBucketSearch(
  queryEmbedding: number[],
  k: number,
  bucketCount = 8,
  searchBuckets = 2
) {
  const buckets = buildBuckets(bucketCount);
  const queryKey = Math.floor(
    ((queryEmbedding[0] || 0) + 1) / 2 * bucketCount
  );
  const candidates: RecordItem[] = [];
  for (let offset = -searchBuckets; offset <= searchBuckets; offset++) {
    const key = queryKey + offset;
    if (buckets.has(key)) {
      candidates.push(...buckets.get(key)!);
    }
  }
  const scored = candidates.map((r) => ({
    record: r,
    score: cosine(queryEmbedding, r.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------- 3) IVF-style clustered search (toy) ----------

interface Centroid {
  id: number;
  vector: number[];
  members: RecordItem[];
}

// create simple centroids by picking first N records
function buildIvfIndex(numClusters: number): Centroid[] {
  const centroids: Centroid[] = [];
  const step = Math.max(1, Math.floor(vectors.length / numClusters));
  for (let i = 0; i < vectors.length && centroids.length < numClusters; i += step) {
    centroids.push({
      id: centroids.length,
      vector: vectors[i].embedding,
      members: [],
    });
  }

  // assign each vector to closest centroid
  for (const rec of vectors) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    centroids.forEach((c, idx) => {
      const score = cosine(rec.embedding, c.vector);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = idx;
      }
    });
    centroids[bestIdx].members.push(rec);
  }

  return centroids;
}

function ivfSearch(
  queryEmbedding: number[],
  k: number,
  numClusters = 4,
  probedClusters = 2
) {
  const centroids = buildIvfIndex(numClusters);

  // rank centroids by similarity to query
  const ranked = centroids
    .map((c) => ({
      centroid: c,
      score: cosine(queryEmbedding, c.vector),
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, probedClusters);

  // search only in chosen clusters
  const candidates: RecordItem[] = [];
  for (const item of ranked) {
    candidates.push(...item.centroid.members);
  }

  const scored = candidates.map((r) => ({
    record: r,
    score: cosine(queryEmbedding, r.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------- 4) HNSW-inspired graph search (toy) ----------

interface GraphNode {
  record: RecordItem;
  neighbors: number[]; // indices into vectors[]
}

function buildGraph(maxNeighbors = 5): GraphNode[] {
  const nodes: GraphNode[] = vectors.map((r) => ({
    record: r,
    neighbors: [],
  }));

  // connect each node to its closest neighbors (simple graph, 1-layer)
  for (let i = 0; i < vectors.length; i++) {
    const scores: { idx: number; score: number }[] = [];
    for (let j = 0; j < vectors.length; j++) {
      if (i === j) continue;
      scores.push({
        idx: j,
        score: cosine(vectors[i].embedding, vectors[j].embedding),
      });
    }
    scores.sort((a, b) => b.score - a.score);
    nodes[i].neighbors = scores.slice(0, maxNeighbors).map((s) => s.idx);
  }

  return nodes;
}

function hnswLikeSearch(queryEmbedding: number[], k: number, steps = 32) {
  const nodes = buildGraph();
  // start from a random node
  let current = Math.floor(Math.random() * nodes.length);

  for (let i = 0; i < steps; i++) {
    const currentScore = cosine(queryEmbedding, nodes[current].record.embedding);
    let best = current;
    let bestScore = currentScore;

    for (const neighIdx of nodes[current].neighbors) {
      const neighScore = cosine(
        queryEmbedding,
        nodes[neighIdx].record.embedding
      );
      if (neighScore > bestScore) {
        bestScore = neighScore;
        best = neighIdx;
      }
    }

    if (best === current) break; // local optimum
    current = best;
  }

  // once we land in a "good" area, do kNN on neighbors + current
  const candidateIdxs = new Set<number>([current, ...nodes[current].neighbors]);
  const candidates = Array.from(candidateIdxs).map((idx) => vectors[idx]);

  const scored = candidates.map((r) => ({
    record: r,
    score: cosine(queryEmbedding, r.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------- 5) PQ-style compressed search (toy) ----------

// Split vector into 2 halves and quantize each half to a tiny codebook.

interface PQCodebook {
  part1: number[]; // centroid for first half
  part2: number[]; // centroid for second half
}

interface PQRecord {
  id: string;
  text: string;
  metadata: any;
  codebookIndex: number;
}

// Build simple PQ codebooks by sampling
function buildPQCodebooks(numCodebooks: number): {
  codebooks: PQCodebook[];
  encoded: PQRecord[];
} {
  const dim = vectors[0].embedding.length;
  const mid = Math.floor(dim / 2);
  const codebooks: PQCodebook[] = [];
  const encoded: PQRecord[] = [];

  // sample some records as codebooks
  const step = Math.max(1, Math.floor(vectors.length / numCodebooks));
  for (let i = 0; i < vectors.length && codebooks.length < numCodebooks; i += step) {
    const e = vectors[i].embedding;
    codebooks.push({
      part1: e.slice(0, mid),
      part2: e.slice(mid),
    });
  }

  // assign each record to nearest codebook based on cosine of whole vector
  for (const rec of vectors) {
    let bestIdx = 0;
    let bestScore = -Infinity;
    for (let i = 0; i < codebooks.length; i++) {
      const cb = codebooks[i];
      const combined = [...cb.part1, ...cb.part2];
      const score = cosine(rec.embedding, combined);
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    encoded.push({
      id: rec.id,
      text: rec.text,
      metadata: rec.metadata,
      codebookIndex: bestIdx,
    });
  }

  return { codebooks, encoded };
}

function pqSearch(queryEmbedding: number[], k: number, numCodebooks = 4) {
  const dim = queryEmbedding.length;
  const mid = Math.floor(dim / 2);

  const { codebooks, encoded } = buildPQCodebooks(numCodebooks);

  // approximate query embedding by nearest codebook(s)
  const scoredCodebooks = codebooks
    .map((cb, idx) => {
      const combined = [...cb.part1, ...cb.part2];
      return {
        idx,
        score: cosine(queryEmbedding, combined),
      };
    })
    .sort((a, b) => b.score - a.score);

  const bestIdx = scoredCodebooks[0].idx;

  // only search records assigned to that codebook
  const candidates = encoded
    .filter((e) => e.codebookIndex === bestIdx)
    .map((e) => vectors.find((r) => r.id === e.id)!)
    .filter(Boolean);

  const scored = candidates.map((r) => ({
    record: r,
    score: cosine(queryEmbedding, r.embedding),
  }));
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, k);
}

// ---------- Demo Runner ----------

function printResults(label: string, results: { record: RecordItem; score: number }[]) {
  console.log(`\n=== ${label} ===`);
  for (const { record, score } of results) {
    console.log(`- [${score.toFixed(3)}] ${record.id}: ${record.text.slice(0, 100).replace(/\s+/g, " ")}...`);
  }
}

function main() {
  const query = "Explain why chunking matters in RAG.";
  console.log("Query:", query);

  // For this demo, we'll just treat query embedding as a random vector with same dim as stored embeddings
  const dim = vectors[0].embedding.length;
  const queryEmbedding = Array.from({ length: dim }, () => Math.random() * 2 - 1);

  const k = 3;

  const knn = knnSearch(queryEmbedding, k);
  const ann = annBucketSearch(queryEmbedding, k);
  const ivf = ivfSearch(queryEmbedding, k);
  const hnsw = hnswLikeSearch(queryEmbedding, k);
  const pq = pqSearch(queryEmbedding, k);

  printResults("kNN (Exact Linear Search)", knn);
  printResults("ANN (Bucket-Based Toy)", ann);
  printResults("IVF-Style Cluster Search (Toy)", ivf);
  printResults("HNSW-Inspired Graph Search (Toy)", hnsw);
  printResults("PQ-Style Compressed Search (Toy)", pq);
}

main();