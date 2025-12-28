/**
 * Day 29 — End-to-End GenAI System (Vanilla)
 */

type Request = { userId: string; query: string };

function classifyIntent(query: string) {
  return query.includes("invoice") ? "billing" : "general";
}

function retrieveContext(intent: string) {
  return intent === "billing" ? ["Invoice policy"] : ["General FAQ"];
}

function buildPrompt(docs: string[], query: string) {
  return `Context:\n${docs.join("\n")}\nUser: ${query}`;
}

function routeModel(prompt: string) {
  return prompt.length > 200 ? "strong-model" : "cheap-model";
}

function runLLM(prompt: string, model: string) {
  return `[${model}] Answer`;
}

export function handle(req: Request) {
  const intent = classifyIntent(req.query);
  const docs = retrieveContext(intent);
  const prompt = buildPrompt(docs, req.query);
  const model = routeModel(prompt);
  const answer = runLLM(prompt, model);
  return { intent, model, answer };
}

console.log(handle({ userId: "1", query: "How do I see my invoice?" }));