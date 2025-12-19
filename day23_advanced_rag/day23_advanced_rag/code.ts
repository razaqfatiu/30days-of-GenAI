/**
 * Day 23 — Advanced RAG (Vanilla TypeScript)
 */

type Doc = { id: string; text: string };

const corpus: Doc[] = [
  { id: "1", text: "Vector embeddings convert text into numerical representations." },
  { id: "2", text: "BM25 is a keyword-based ranking algorithm." },
  { id: "3", text: "RAG combines retrieval with generation." },
  { id: "4", text: "Hybrid retrieval mixes keyword and vector search." },
];

// Query rewriting
function rewriteQuery(q: string) {
  return `Explain ${q} in the context of RAG and embeddings.`;
}

// BM25 mock
function bm25Search(q: string, docs: Doc[]) {
  return docs.filter(d => q.toLowerCase().includes(d.text.split(" ")[0].toLowerCase()));
}

// Vector mock
function vectorSearch(_q: string, docs: Doc[]) {
  return docs.filter(d => d.text.toLowerCase().includes("vector"));
}

// Hybrid retrieval
function hybridRetrieve(q: string, docs: Doc[]) {
  return Array.from(new Set([...bm25Search(q, docs), ...vectorSearch(q, docs)]));
}

// Reranking
function rerank(docs: Doc[]) {
  return docs.sort((a, b) => b.text.length - a.text.length);
}

// Context assembly
function assemble(docs: Doc[]) {
  return docs.map(d => d.text).join("\n");
}

function run(question: string) {
  const rewritten = rewriteQuery(question);
  const retrieved = hybridRetrieve(rewritten, corpus);
  const ranked = rerank(retrieved);
  const context = assemble(ranked);

  console.log("Question:", question);
  console.log("Rewritten:", rewritten);
  console.log("Context:", context);
}

run("how embeddings work");