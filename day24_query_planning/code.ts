type Intent = "fact" | "explanation" | "comparison" | "procedural";

type SubQuery = { query: string; route: "vector" | "keyword" };
type Retrieval = { text: string; confidence: number };

const KB = {
  vector: [
    "RAG grounds answers using retrieved documents.",
    "Embeddings represent semantic meaning."
  ],
  keyword: ["BM25 is keyword-based search."]
};

function classifyIntent(q: string): Intent {
  if (q.includes("compare")) return "comparison";
  if (q.includes("how")) return "explanation";
  return "fact";
}

function decompose(_q: string): SubQuery[] {
  return [
    { query: "What is RAG?", route: "vector" },
    { query: "What are embeddings?", route: "vector" }
  ];
}

function retrieve(sub: SubQuery): Retrieval {
  const data = KB[sub.route];
  return {
    text: data[Math.floor(Math.random() * data.length)],
    confidence: Math.random()
  };
}

function merge(results: Retrieval[]): string {
  return results.filter(r => r.confidence > 0.3).map(r => r.text).join("\n");
}

function reflect(context: string): boolean {
  return context.length > 0;
}

function run(q: string) {
  const intent = classifyIntent(q);
  const plan = decompose(q);
  const results = plan.map(retrieve);
  const context = merge(results);
  const ready = reflect(context);

  console.log({ intent, context, ready });
}

run("How does RAG reduce hallucinations and what role do embeddings play?");