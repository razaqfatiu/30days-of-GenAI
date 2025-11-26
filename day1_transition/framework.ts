// day1_transition/framework.ts
// Use a real LLM via LangChain to produce a short greeting.
// Run:
//   1) cp .env.sample .env && put your OPENAI_API_KEY
//   2) npm install
//   3) npm run dev:day1:framework

import 'dotenv/config';

// Chat model for OpenAI-compatible providers
import { ChatOpenAI } from "@langchain/openai";
// Message primitives live in @langchain/core
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  // Pick a model you have access to; change if needed
  model: process.env.MODEL_NAME || "gpt-4o-mini",
  temperature: 0.8,
  // If you use an OpenAI-compatible endpoint, set baseURL:
  // baseURL: process.env.OPENAI_BASE_URL
});

async function aiGreetUser(name: string) {
  const messages = [
    new SystemMessage("You are a friendly assistant that writes short, warm greetings."),
    new HumanMessage(`Greet ${name} in 1 sentence. Add a tiny dose of positivity.`)
  ];

  const res = await model.invoke(messages);
  console.log(res.content);
}

aiGreetUser("Ada").catch((err) => {
  console.error("Failed to generate greeting:", err);
});
