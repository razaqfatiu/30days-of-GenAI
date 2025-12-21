class Planner {
  run(q: string) {
    const hops = [
      { text: "RAG reduces hallucinations", confidence: 0.9 },
      { text: "Embeddings help semantic search", confidence: 0.8 }
    ];
    const context = hops.map(h => h.text).join("\n");
    console.log(context);
  }
}

new Planner().run("Explain RAG");