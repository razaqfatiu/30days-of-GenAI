// day2_ai_ecosystem/framework.ts
// Use LangChain to have an LLM explain the collaboration among AI roles.

import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || "gpt-4o-mini",
  temperature: 0.7,
  // baseURL: process.env.OPENAI_BASE_URL, // optional override
});

async function explainRoles() {
  const system = new SystemMessage(
    "You are an instructor explaining how Data Scientists, ML Engineers, and AI Engineers collaborate."
  );
  const human = new HumanMessage(
    "Summarize their relationship in a short story or analogy that a junior developer would understand."
  );

  const response = await model.invoke([system, human]);
  console.log("💡 AI Insight:");
  console.log(response.content);
}

explainRoles().catch(console.error);