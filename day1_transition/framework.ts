// day1_transition/framework.ts
// Goal: Use a real LLM via a framework (LangChain) to produce variable, context-aware greetings.
// Run: 
//   1) Ensure OPENAI_API_KEY is set in your environment (.env)
//   2) npx ts-node day1_transition/framework.ts

// Import 'dotenv' to load variables from .env at runtime (optional but convenient)
import 'dotenv/config';

// Import LangChain's Chat model interface for OpenAI-compatible providers
import { ChatOpenAI } from "langchain/chat_models/openai";

// Import message schema types to build a basic prompt
import { HumanMessage, SystemMessage } from "langchain/schema";

// Create the chat model instance
const model = new ChatOpenAI({
  // Choose a model you have access to; replace with your preferred model name
  modelName: process.env.MODEL_NAME || "gpt-4o-mini",
  // Temperature controls creativity; higher -> more varied outputs
  temperature: 0.8,
  // Optionally point to a custom base URL if you're using an OpenAI-compatible server
  // configuration: { baseURL: process.env.OPENAI_BASE_URL }
});

// A simple function that asks the model to greet a user in context
async function aiGreetUser(name: string) {
  // We create a lightweight prompt using a system message (behavior) + human message (task)
  const messages = [
    new SystemMessage("You are a friendly assistant that writes short, warm greetings."),
    new HumanMessage(`Greet ${name} in 1 sentence. Add a tiny dose of positivity.`)
  ];

  // Invoke the model with our messages; LangChain handles the API call & formatting
  const res = await model.invoke(messages);

  // The textual content of the model's response
  console.log(res.content);
}

// Execute only when run directly: node/ts-node day1_transition/framework.ts
aiGreetUser("Ada").catch((err) => {
  // Helpful error output if API key is missing or network fails
  console.error("Failed to generate greeting:", err);
});