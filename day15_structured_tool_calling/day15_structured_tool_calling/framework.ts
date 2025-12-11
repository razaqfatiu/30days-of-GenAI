import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ChatOpenAI } from '@langchain/openai';
import { tool } from '@langchain/core/tools';
// Avoid importing cross-package message types. Use runtime-friendly plain
// message objects (`any`) to prevent TypeScript errors caused by multiple
// installations/instances of `@langchain/core` under different node_modules
// paths (the OpenAI package may have its own nested copy).

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Calculator tool
 * Demonstrates structured inputs: op ∈ {add, sub, mul, div}, a and b numbers.
 */
const calculator = tool(
  async ({ op, a, b }: { op: string; a: number; b: number }) => {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return 'Calculator error: a and b must be numbers.';
    }
    switch (op) {
      case 'add':
        return x + y;
      case 'sub':
        return x - y;
      case 'mul':
        return x * y;
      case 'div':
        return y === 0 ? 'Calculator error: division by zero.' : x / y;
      default:
        return 'Calculator error: unknown op.';
    }
  },
  {
    name: 'calculator',
    description:
      'Perform arithmetic. Provide op=add|sub|mul|div and numeric a, b.',
    schema: {
      type: 'object',
      properties: {
        op: { type: 'string', enum: ['add', 'sub', 'mul', 'div'] },
        a: { type: 'number' },
        b: { type: 'number' },
      },
      required: ['op', 'a', 'b'],
    },
  }
);

/**
 * Vector search tool
 * Looks up chunks in the Day 9 JSON store by substring.
 */
const vectorSearch = tool(
  async ({ query }: { query: string }) => {
    const storePath = path.join(
      __dirname,
      '..',
      'day09_ingestion_pipeline',
      'day09_local_ingestion_store.json'
    );
    if (!fs.existsSync(storePath)) {
      return `Vector store not found at ${storePath}. Run Day 9 first.`;
    }
    const q = String(query ?? '')
      .trim()
      .toLowerCase();
    if (!q) {
      return 'vector_search error: query is required.';
    }
    const raw = fs.readFileSync(storePath, 'utf-8');
    const store = JSON.parse(raw) as {
      records?: Array<{ id: string; text: string }>;
    };
    const matches = (store.records ?? []).filter((rec) =>
      rec.text?.toLowerCase().includes(q)
    );
    if (!matches.length) {
      return `No matches found for "${q}".`;
    }
    return matches
      .slice(0, 3)
      .map(
        (rec, idx) =>
          `[match ${idx + 1}] id=${rec.id} text="${rec.text
            .replace(/\s+/g, ' ')
            .slice(0, 160)}..."`
      )
      .join('\n');
  },
  {
    name: 'vector_search',
    description:
      'Search the Day 9 JSON store for passages mentioning the query text.',
    schema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Text to look up in the Day 9 store.',
        },
      },
      required: ['query'],
    },
  }
);

/**
 * Current date tool
 */
const currentDate = tool(
  async () => ({
    iso: new Date().toISOString(),
  }),
  {
    name: 'current_date',
    description: 'Get the current ISO date/time.',
    schema: {
      type: 'object',
      properties: {},
    },
  }
);

const tools = [calculator, vectorSearch, currentDate];
const MAX_STEPS = 6;

async function callWithStructuredTools(question: string): Promise<string> {
  const baseModel = new ChatOpenAI({
    model: 'gpt-4o-mini',
    temperature: 0,
  });

  const model = baseModel.bindTools(tools);
  const messages: any[] = [
    {
      role: 'system',
      content: [
        'You are a structured tool-calling assistant.',
        'You can call tools to gather information or perform calculations.',
        'When you do not need a tool, respond directly with the final answer.',
      ].join(' '),
    },
    { role: 'user', content: question },
  ];

  for (let step = 0; step < MAX_STEPS; step++) {
    const aiMessage = await model.invoke(messages);
    // Keep messages array serializable/simple: make assistant content a string.
    messages.push({
      role: 'assistant',
      content:
        typeof aiMessage.content === 'string'
          ? aiMessage.content
          : JSON.stringify(aiMessage.content),
    });

    const toolCalls = aiMessage.tool_calls ?? [];
    if (!toolCalls.length) {
      // No more tool calls, so assume final answer.
      return typeof aiMessage.content === 'string'
        ? aiMessage.content
        : JSON.stringify(aiMessage.content);
    }

    for (const call of toolCalls) {
      const matchedTool = tools.find((toolDef) => toolDef.name === call.name);
      if (!matchedTool) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Unknown tool: ${call.name}`,
        });
        continue;
      }
      try {
        const result = await matchedTool.invoke(call.args);
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      } catch (err: any) {
        messages.push({
          role: 'tool',
          tool_call_id: call.id,
          content: `Tool ${call.name} error: ${err?.message ?? String(err)}`,
        });
      }
    }
  }

  return 'Unable to finish after several tool calls.';
}

async function main() {
  const input =
    "Using our knowledge base, explain briefly what chunking is, tell me today's date, and then compute 4 * 9.";

  console.log('🧑‍💻 Agent input:');
  console.log(input);

  const answer = await callWithStructuredTools(input);

  console.log('\n🤖 Agent final output:');
  console.log(answer);
}

main().catch((err) => {
  console.error('❌ Error in Day 15 structured tool-calling demo:', err);
});
