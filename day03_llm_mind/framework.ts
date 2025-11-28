// day03_llm_mind/framework.ts
// Goal: Contrast deterministic vs creative decoding and enforce short replies.
// Run: npx tsx day03_llm_mind/framework.ts
import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const prompt = new HumanMessage(
  "Explain tokens and temperature to a junior developer in <= 2 sentences."
);

// Deterministic (precise) response
const precise = new ChatOpenAI({
  model: process.env.MODEL_NAME || "gpt-4o-mini",
  temperature: 0,           // low variance
  maxTokens: 60,            // keep it brief
  // baseURL: process.env.OPENAI_BASE_URL,
});

// Creative (more varied) response
const creative = new ChatOpenAI({
  model: process.env.MODEL_NAME || "gpt-4o-mini",
  temperature: 1.0,         // higher variance
  maxTokens: 60,
});

async function run() {
  const system = new SystemMessage("Be clear, concise, and use a friendly tone.");
  console.log("=== Temperature: 0 (precise) ===");
  const r1 = await precise.invoke([system, prompt]);
  console.log(String(r1.content));

  console.log("\n=== Temperature: 1.0 (creative) ===");
  const r2 = await creative.invoke([system, prompt]);
  console.log(String(r2.content));

  console.log("\nNote: Short replies enforced with instruction + maxTokens.");
}

run().catch((e) => {
  console.error("Framework demo failed:", e);
});