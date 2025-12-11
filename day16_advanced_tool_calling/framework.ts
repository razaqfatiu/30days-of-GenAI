// Day 16 — Advanced Tool Calling with LangChain
import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { createAgent, tool } from 'langchain';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const calculator = tool(
  ({ a, b, op }) => {
    const x = Number(a);
    const y = Number(b);
    if (Number.isNaN(x) || Number.isNaN(y)) {
      return 'Calculator error: a and b must be numbers.';
    }
    switch (op) {
      case 'add':
        return String(x + y);
      case 'sub':
        return String(x - y);
      case 'mul':
        return String(x * y);
      case 'div':
        return y === 0 ? 'Calculator error: division by zero.' : String(x / y);
      default:
        return 'Calculator error: unknown op.';
    }
  },
  {
    name: 'calculator',
    description:
      'Perform arithmetic. Provide op=add|sub|mul|div and numeric a, b.',
    schema: z.object({
      op: z
        .enum(['add', 'sub', 'mul', 'div'])
        .describe('Arithmetic operation to perform.'),
      a: z.number().describe('First operand.'),
      b: z.number().describe('Second operand.'),
    }),
  }
);

const vectorSearch = tool(
  ({ query }) => {
    const storePath = path.join(
      __dirname,
      '..',
      'day09_ingestion_pipeline',
      'day09_local_ingestion_store.json'
    );
    if (!fs.existsSync(storePath)) {
      return `Vector store not found at ${storePath}. Run Day 9 first.`;
    }
    const q = query.trim().toLowerCase();
    if (!q) {
      return 'vector_search error: query is required.';
    }
    const store = JSON.parse(fs.readFileSync(storePath, 'utf8')) as {
      records?: Array<{ id: string; text: string }>;
    };
    const matches = (store.records ?? []).filter((rec) =>
      rec.text?.toLowerCase().includes(q)
    );
    if (!matches.length) {
      return `No matches found for "${query}".`;
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
      'Search the Day 9 ingestion store for passages mentioning the query text.',
    schema: z.object({
      query: z.string().describe('Text to look up in the Day 9 JSON store.'),
    }),
  }
);

const currentDate = tool(
  () => ({
    iso: new Date().toISOString(),
  }),
  {
    name: 'current_date',
    description: 'Return the current ISO date/time.',
    schema: z.object({}),
  }
);

async function main() {
  const agent = createAgent({
    model: 'openai:gpt-4o-mini',
    tools: [calculator, vectorSearch, currentDate],
    systemPrompt: [
      'You are a helpful agent that can search our knowledge base,',
      'perform arithmetic, and report the current date when needed.',
      'Think step-by-step and call tools whenever necessary before replying.',
    ].join(' '),
  });

  const input =
    'Search for chunking info, summarize it, compute 12 ÷ 3, and tell me today’s date.';

  console.log('🔵 User input:');
  console.log(input);

  const finalState = await agent.invoke({
    messages: [{ role: 'user', content: input }],
  });

  const lastMessage = finalState.messages?.[finalState.messages.length - 1];
  const output =
    typeof lastMessage?.content === 'string'
      ? lastMessage.content
      : JSON.stringify(lastMessage?.content ?? '');

  console.log('\n🟩 Agent Output:');
  console.log(output);
}

main().catch((err) => {
  console.error('❌ Error in Day 16 LangChain framework demo:', err);
});
