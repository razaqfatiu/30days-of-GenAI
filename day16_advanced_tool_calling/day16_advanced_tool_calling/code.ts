
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) {
  console.error("❌ OPENAI_API_KEY is not set. Add it to your .env file.");
  process.exit(1);
}

/**
 * Day 16 — Advanced Tool Calling & Multi-Tool Decisions (Vanilla)
 *
 * Demonstrates:
 * - When to chain tools (multi-step loop)
 * - Handling multiple tool calls in one step (can be parallelized)
 * - Disambiguation prompts and routing rules
 * - Correctness strategies (validation, max steps)
 */

/** -------------------------
 * Tool implementations
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
 * Tool schemas (OpenAI tools API)
 * ------------------------- */

const openAiTools = [
  {
    type: "function",
    function: {
      name: "calculator",
      description:
        "Perform arithmetic ONLY when the user clearly asks for a numeric calculation.",
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
      description:
        "Search ONLY the Day 9 ingestion corpus for domain knowledge (chunking, embeddings, RAG, etc.).",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "Keyword or phrase to search in our documents.",
          },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "current_date",
      description:
        "Return the current date/time in ISO format. Use ONLY when the user asks about time/date.",
      parameters: {
        type: "object",
        properties: {},
        additionalProperties: false,
      },
    },
  },
];

/** -------------------------
 * Types & helpers
 * ------------------------- */

type ChatRole = "system" | "user" | "assistant" | "tool";

interface ChatMessage {
  role: ChatRole;
  content: string;
  name?: string;
  tool_call_id?: string;
}

/** Basic routing heuristic: does the question look like math? */
function questionLooksLikeMath(q: string): boolean {
  return /[\d]/.test(q) || /add|plus|minus|divide|times|multiply|÷|×/i.test(q);
}

/** Call OpenAI with tools */
async function callOpenAi(
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
 * Main multi-step loop
 * ------------------------- */

async function main() {
  const question =
    "Using our knowledge base, explain what chunking is and summarize it, " +
    "then compute 12 ÷ 3, and finally tell me today's date.";

  const messages: ChatMessage[] = [
    {
      role: "system",
      content: [
        "You are a careful multi-tool AI agent.",
        "- Use tools ONLY when necessary.",
        "- Use 'vector_search' for questions about our knowledge base (chunking, embeddings, RAG, etc.).",
        "- Use 'calculator' ONLY when the user clearly asks for math.",
        "- Use 'current_date' ONLY when the user asks about the current date or time.",
        "- If the user request is ambiguous, ask a clarification question instead of calling tools.",
        "- Avoid redundant or unnecessary tool calls.",
      ].join("\n"),
    },
    { role: "user", content: question },
  ];

  console.log("🧑‍💻 User question:");
  console.log(question);

  const MAX_STEPS = 5;
  let step = 0;

  while (step++ < MAX_STEPS) {
    const response = await callOpenAi(messages, "auto");
    const message = response.choices[0]?.message;
    if (!message) {
      console.error("No message returned from OpenAI.");
      return;
    }

    const toolCalls = message.tool_calls ?? [];

    // If there are no tool calls, treat as final answer
    if (!toolCalls.length) {
      console.log("\n✅ Final answer (no more tools requested):");
      console.log(message.content);
      return;
    }

    console.log(`\n🛠 Step ${step} — tools requested:`);
    for (const tc of toolCalls) {
      console.log(`- ${tc.function.name}(${tc.function.arguments})`);
    }

    // Append the assistant message containing tool_calls
    messages.push({
      role: "assistant",
      content: message.content || "",
    });

    // In a real app, we could run these in parallel with Promise.all
    for (const tc of toolCalls) {
      const toolName = tc.function.name;
      const argsStr = tc.function.arguments || "{}";

      const impl = localToolRegistry[toolName];
      if (!impl) {
        console.warn(`⚠️ Unknown tool requested: ${toolName}. Skipping.`);
        continue;
      }

      // Example extra correctness: check if question is math-related before allowing calculator
      if (toolName === "calculator" && !questionLooksLikeMath(question)) {
        console.warn(
          "⚠️ Model requested 'calculator' but the question does not look like math. Skipping for safety."
        );
        continue;
      }

      let parsedArgs: any = {};
      try {
        parsedArgs = JSON.parse(argsStr);
      } catch {
        console.warn(
          `⚠️ Failed to parse arguments for tool '${toolName}': ${argsStr}. Skipping.`
        );
        continue;
      }

      const result = impl(parsedArgs);

      console.log(`🔍 Result from ${toolName}:`);
      console.log(result);

      messages.push({
        role: "tool",
        name: toolName,
        tool_call_id: tc.id,
        content: JSON.stringify(result),
      });
    }
  }

  // Step limit reached -> force a final answer
  const final = await callOpenAi(messages, "none");
  const finalMsg = final.choices[0]?.message;
  console.log("\n⚠️ Max steps reached. Forced final answer:");
  console.log(finalMsg?.content);
}

main().catch((err) => {
  console.error("❌ Error in Day 16 demo:", err);
});
