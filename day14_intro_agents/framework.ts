import "dotenv/config";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import { ChatOpenAI } from "@langchain/openai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type ToolHandler = (input: Record<string, any>) => Promise<string>;

interface ToolDefinition {
  name: string;
  description: string;
  schema: string;
  handler: ToolHandler;
}

const calculatorTool: ToolDefinition = {
  name: "calculator",
  description: "Perform simple arithmetic like add, sub, mul, div on numbers a and b.",
  schema: `{"op":"add|sub|mul|div","a":number,"b":number}`,
  handler: async ({ op, a, b }) => {
    const numA = Number(a);
    const numB = Number(b);
    if (Number.isNaN(numA) || Number.isNaN(numB)) {
      return "Calculator error: both a and b must be numbers.";
    }
    switch (op) {
      case "add":
        return String(numA + numB);
      case "sub":
        return String(numA - numB);
      case "mul":
        return String(numA * numB);
      case "div":
        return numB !== 0 ? String(numA / numB) : "Calculator error: divide by zero.";
      default:
        return "Calculator error: unknown operation.";
    }
  },
};

const vectorStorePath = path.join(
  __dirname,
  "..",
  "day09_ingestion_pipeline",
  "day09_local_ingestion_store.json"
);

const vectorSearchTool: ToolDefinition = {
  name: "vector_search",
  description: "Search the Day 9 JSON store for chunks that mention the provided query text.",
  schema: `{"query": "text to look up"}`,
  handler: async ({ query }) => {
    const q = String(query ?? "").trim();
    if (!q) {
      return "vector_search error: query is required.";
    }
    if (!fs.existsSync(vectorStorePath)) {
      return `vector_search error: store not found at ${vectorStorePath}`;
    }
    const raw = fs.readFileSync(vectorStorePath, "utf-8");
    const store = JSON.parse(raw);
    const matches = (store.records ?? []).filter(
      (record: any) => typeof record.text === "string" && record.text.toLowerCase().includes(q.toLowerCase())
    );
    if (!matches.length) {
      return `No matches for "${q}".`;
    }
    return matches
      .slice(0, 3)
      .map(
        (record: any, idx: number) =>
          `[match ${idx + 1}] id=${record.id ?? "unknown"} text="${String(record.text)
            .replace(/\s+/g, " ")
            .slice(0, 160)}..."`
      )
      .join("\n");
  },
};

const tools: ToolDefinition[] = [calculatorTool, vectorSearchTool];

const TOOL_LIST = tools
  .map((tool) => `- ${tool.name}: ${tool.description}. Input schema: ${tool.schema}`)
  .join("\n");

const MAX_STEPS = 5;

function coerceContent(content: any): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part;
        if (typeof part === "object" && part !== null && "text" in part) {
          return String(part.text);
        }
        return "";
      })
      .join("");
  }
  if (typeof content === "object" && content !== null && "toString" in content) {
    return String(content);
  }
  return "";
}

async function runSimpleAgent(model: ChatOpenAI, question: string): Promise<string> {
  let history = "";
  for (let step = 0; step < MAX_STEPS; step++) {
    const systemPrompt = [
      "You are a ReAct-style assistant. You can use external tools to collect information",
      "before answering the user's question.",
      "Available tools:",
      TOOL_LIST,
      'When you need to use a tool, respond ONLY with JSON: {"type":"tool","tool":"<name>","input":{...}}.',
      'When you have a final answer, respond ONLY with JSON: {"type":"final","output":"<answer>"}.',
      "Make sure JSON is valid and does not include comments.",
    ].join("\n");

    const userContent = [
      `Question: ${question}`,
      history ? `Tool history:\n${history}` : "Tool history: (none yet)",
    ].join("\n\n");

    const aiMessage = await model.invoke([
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ]);

    const raw = coerceContent(aiMessage.content).trim();
    let parsed: any;
    try {
      parsed = JSON.parse(raw);
    } catch {
      // If model didn't follow JSON instructions, return raw text.
      return raw;
    }

    if (parsed?.type === "final" && typeof parsed?.output === "string") {
      return parsed.output;
    }

    if (parsed?.type === "tool") {
      const toolName = parsed.tool;
      const toolInput = parsed.input ?? {};
      const toolDef = tools.find((tool) => tool.name === toolName);
      if (!toolDef) {
        history += `\nTool ${toolName} not found.`;
        continue;
      }
      try {
        const result = await toolDef.handler(toolInput);
        history += `\n${toolName} => ${result}`;
      } catch (err: any) {
        history += `\n${toolName} error: ${err?.message ?? String(err)}`;
      }
      continue;
    }

    // Fallback if JSON doesn't match expected schema.
    if (typeof parsed?.output === "string") {
      return parsed.output;
    }
    return raw;
  }
  return "Unable to complete the task with the available tools.";
}

async function main() {
  const model = new ChatOpenAI({
    model: "gpt-4o-mini",
    temperature: 0,
  });

  const question = "Find two facts about chunking and then compute 2 + 5.";
  const answer = await runSimpleAgent(model, question);

  console.log("\n🤖 Agent Final Output:");
  console.log(answer);
}

main().catch((err) => {
  console.error("Agent run failed:", err);
});
