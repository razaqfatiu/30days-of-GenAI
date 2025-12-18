/**
 * Day 23 — Advanced RAG (Framework-style)
 */

type Doc = { id: string; text: string };

const docs: Doc[] = [
  { id: "1", text: "Vector embeddings map text to vectors." },
  { id: "2", text: "BM25 ranks documents via term frequency." },
  { id: "3", text: "Hybrid retrieval improves RAG quality." },
];

class AdvancedRAG {
  rewrite(q: string) {
    return `Explain ${q} for a beginner learning RAG.`;
  }

  retrieve(_q: string) {
    return docs.filter(d => d.text.toLowerCase().includes("rag") || d.text.toLowerCase().includes("vector"));
  }

  rerank(results: Doc[]) {
    return results.sort((a, b) => b.text.length - a.text.length);
  }

  assemble(results: Doc[]) {
    return results.map(r => r.text).join("\n");
  }

  run(q: string) {
    const rq = this.rewrite(q);
    const r = this.retrieve(rq);
    const ranked = this.rerank(r);
    return this.assemble(ranked);
  }
}

console.log(new AdvancedRAG().run("embeddings"));