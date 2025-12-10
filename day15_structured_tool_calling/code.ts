
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set. Add it to your .env file.");
  process.exit(1);
}

/** -------------------------
 * Tool Implementations
 * ------------------------- */

function calculatorTool(args: { a: number; b: number; op: string }) {
  const { a, b, op } = args;
  switch (op) {
    case "add":
      return a + b;
    case "sub":
      return a - b;
    case "mul":
      return a * b;
    case "div":
      return b === 0 ? "Error: division by zero" : a / b;
    default:
      return "Unknown operation";
  }
}

function vectorSearchTool(args: { query: string }) {
  const query = String(args.query).toLowerCase();
  const storePath = path.join(
    __dirname,
    "..",
    "day09_ingestion_pipeline",
    "day09_local_ingestion_store.json"
  );

  if (!fs.existsSync(storePath)) {
    return "Vector store not found. Did you run Day 9 ingestion?";
  }

  const raw = fs.readFileSync(storePath, "utf-8");
  const store = JSON.parse(raw) as {
    records: { id: string; text: string; metadata: any }[];
  };

  const matches = store.records
    .filter((r) => r.text.toLowerCase().includes(query))
    .slice(0, 3)
    .map((r) => ({
      id: r.id,
      text: r.text.slice(0, 200).replace(/\s+/g, " "),
    }));

  return matches.length ? matches : "No matching chunks found.";
}

function currentDateTool() {
  return { iso: new Date().toISOString() };
}

const localToolRegistry: Record<string, (args: any) => any> = {
  calculator: calculatorTool,
  vector_search: vectorSearchTool,
  current_date: currentDateTool,
};

/** -------------------------
 * OpenAI Tools Definitions
 * ------------------------- */

const openAiTools = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform basic arithmetic operations.",
      parameters: {
        type: "object",
        properties: {
          a: { type: "number", description: "First operand" },
          b: { type: "number", description: "Second operand" },
          op: {
            type: "string",
            enum: ["add", "sub", "mul", "div"],
            description: "Operation to perform",
          },
        },
        required: ["a", "b", "op"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "vector_search",
      description: "Search the Day 9 local ingestion store for text chunks containing the query string.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search keyword" },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "current_date",
      description: "Get the current date/time in ISO format.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

/** -------------------------
 * OpenAI Call Helper
 * ------------------------- */

type ChatMessageRole = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: ChatMessageRole;
  content: string;
  name?: string;
  tool_call_id?: string;
}

async function callOpenAiWithTools(
  messages: ChatMessage[],
  toolChoice: "auto" | "none"
): Promise<any> {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      tools: openAiTools,
      tool_choice: toolChoice,
      temperature: 0,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${errText}`);
  }

  return res.json();
}

/** -------------------------
 * Main
 * ------------------------- */

async function main() {
  const question =
    "Using our knowledge base, explain briefly what chunking is, " +
    "tell me the current date, and then compute 3 * 7.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content:
        "You are a helpful AI agent. Use tools when helpful. " +
        "If you use tools, wait for tool results before giving the final answer.",
    },
    { role: "user", content: question },
  ];

  console.log("🧑‍💻 User question:");
  console.log(question);

  // First call: allow tools
  const first = await callOpenAiWithTools(messages, "auto");
  const firstMsg = first.choices[0].message;
  const toolCalls = firstMsg.tool_calls ?? [];

  if (!toolCalls.length) {
    console.log("\n💬 Final answer (no tools used):");
    console.log(firstMsg.content);
    return;
  }

  console.log("\n🛠️ Tool calls:");
  for (const tc of toolCalls) {
    console.log(`- ${tc.function.name}(${tc.function.arguments})`);
  }

  // Append assistant message with tool_calls
  messages.push({
    role: "assistant",
    content: firstMsg.content || "",
  });

  // Execute tools and append tool messages
  for (const tc of toolCalls) {
    const toolName = tc.function.name;
    const argsStr = tc.function.arguments || "{}";
    let parsedArgs: any = {};
    try {
      parsedArgs = JSON.parse(argsStr);
    } catch {
      console.warn(`⚠️ Failed to parse args for ${toolName}:`, argsStr);
    }

    const impl = localToolRegistry[toolName];
    if (!impl) {
      console.warn(`⚠️ No implementation for tool '${toolName}'`);
      continue;
    }

    const result = impl(parsedArgs);
    console.log(`\n🔍 Result from ${toolName}:`);
    console.log(result);

    messages.push({
      role: "tool",
      name: toolName,
      tool_call_id: tc.id,
      content: JSON.stringify(result),
    });
  }

  // Second call: force final answer (no more tools)
  const second = await callOpenAiWithTools(messages, "none");
  const finalMsg = second.choices[0].message;

  console.log("\n💬 Final answer (after tools):");
  console.log(finalMsg.content);
}

main().catch((err) => {
  console.error("❌ Error in Day 15:", err);
});
