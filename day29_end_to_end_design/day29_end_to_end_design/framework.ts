/**
 * Day 29 — End-to-End GenAI System (Framework)
 */

class IntentService {
  classify(q: string) {
    return q.includes("invoice") ? "billing" : "general";
  }
}

class RetrievalService {
  fetch(intent: string) {
    return intent === "billing" ? ["Invoice policy"] : ["General FAQ"];
  }
}

class PromptService {
  build(docs: string[], q: string) {
    return `Context:\n${docs.join("\n")}\nUser: ${q}`;
  }
}

class ModelRouter {
  pick(prompt: string) {
    return prompt.length > 200 ? "strong-model" : "cheap-model";
  }
}

class LLMService {
  run(prompt: string, model: string) {
    return `[${model}] Answer`;
  }
}

class GenAISystem {
  intent = new IntentService();
  retrieval = new RetrievalService();
  prompt = new PromptService();
  router = new ModelRouter();
  llm = new LLMService();

  handle(query: string) {
    const intent = this.intent.classify(query);
    const docs = this.retrieval.fetch(intent);
    const prompt = this.prompt.build(docs, query);
    const model = this.router.pick(prompt);
    const answer = this.llm.run(prompt, model);
    return { intent, model, answer };
  }
}

console.log(new GenAISystem().handle("How do I see my invoice?"));