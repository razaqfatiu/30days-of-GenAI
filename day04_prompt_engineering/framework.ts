// day04_prompt_engineering/framework.ts
// LangChain prompt engineering demo using:
// - system roles
// - anchored instruction
// - JSON output constraints

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const model = new ChatOpenAI({
  model: process.env.MODEL_NAME || 'gpt-4o-mini',
  temperature: 0.2,
});

async function run() {
  const messages = [
    {
      role: 'system' as const,
      content: 'You are an expert educator. Be concise and beginner-friendly.',
    },
    {
      role: 'user' as const,
      content: `
IMPORTANT: Explain embeddings in JSON format.

Context:
Embeddings convert text into numbers so computers understand meaning.

Format:
{
  "definition": "...",
  "simple_example": "...",
  "real_use_case": "...",
  "analogy": "..."
}

Remember: Return JSON ONLY.
  `,
    },
  ];

  const res = await model.invoke(messages);
  console.log(res.content);
}

run().catch((err) => console.error('Error:', err));
