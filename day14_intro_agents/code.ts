
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

/** -------------------------
 * Simple Tools
 * ------------------------- */

// Calculator tool
function calculatorTool(input: any) {
  const { a, b, op } = input;
  switch (op) {
    case "add": return a + b;
    case "sub": return a - b;
    case "mul": return a * b;
    case "div": return b !== 0 ? a / b : "Error: divide by zero";
    default: return "Unknown operation";
  }
}

// Vector search tool
function vectorSearchTool(input: any) {
  const query = String(input.query).toLowerCase();
  const storePath = path.join(__dirname, "..", "day09_ingestion_pipeline", "day09_local_ingestion_store.json");
  const store = JSON.parse(fs.readFileSync(storePath, "utf-8"));

  return store.records
    .filter((r: any) => r.text.toLowerCase().includes(query))
    .slice(0, 2)
    .map((r: any) => r.text);
}

const tools: Record<string, Function> = {
  calculator: calculatorTool,
  vector_search: vectorSearchTool,
};

/** -------------------------
 * LLM Call
 * ------------------------- */
async function callLLM(prompt: string) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [{ role: "user", content: prompt }]
    }),
  });
  const json = await res.json();
  return json.choices[0].message.content.trim();
}

/** Parse ReAct Action */
function parseAction(text: string) {
  const actionMatch = text.match(/Action:\s*(\w+)/i);
  const inputMatch = text.match(/Action Input:\s*(\{[\s\S]*?\})/i);

  if (!actionMatch || !inputMatch) return null;

  return {
    action: actionMatch[1],
    input: JSON.parse(inputMatch[1])
  };
}

/** -------------------------
 * Main Agent Loop
 * ------------------------- */
async function main() {
  let context = "";
  let iterations = 0;
  const maxIterations = 5;

  let prompt = `
You are an Agent that uses tools to answer questions.
Use the exact format:

Thought: reasoning  
Action: tool_name  
Action Input: {json}

Available tools:
- calculator {a,b,op}
- vector_search {query}

If you have the final answer, respond with:
Final Answer: text

Question: "Find two facts about chunking and add 2 + 3."
`;

  while (iterations++ < maxIterations) {
    const llmOutput = await callLLM(prompt + "\n" + context);
    console.log("\nLLM Output:", llmOutput);

    if (llmOutput.includes("Final Answer:")) {
      console.log("\n🎉 FINAL ANSWER:");
      console.log(llmOutput.replace("Final Answer:", "").trim());
      return;
    }

    const parsed = parseAction(llmOutput);
    if (!parsed) {
      console.log("❌ Could not parse action. Stopping.");
      return;
    }

    const toolFn = tools[parsed.action];
    if (!toolFn) {
      console.log("❌ Unknown tool:", parsed.action);
      return;
    }

    const observation = toolFn(parsed.input);
    context += `\nObservation: ${JSON.stringify(observation)}`;
    prompt += `\nObservation: ${JSON.stringify(observation)}`;
  }

  console.log("⚠️ Max iterations reached without final answer.");
}

main();
