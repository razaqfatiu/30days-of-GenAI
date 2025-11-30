// day05_inferencing/framework.ts
// LangChain example: multi-provider routing & parallel inferencing.

import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatAnthropic } from '@langchain/anthropic';
import { SystemMessage, HumanMessage } from '@langchain/core/messages';

const openai = new ChatOpenAI({
  model: 'gpt-4o-mini',
  temperature: 0.2,
});

const claude = new ChatAnthropic({
  model: 'claude-3-haiku-20240307',
  temperature: 0.2,
});

async function run() {
  const messages = [
    { role: 'system' as const, content: 'Be concise and clear.' },
    { role: 'user' as const, content: 'Explain embeddings in simple terms.' },
  ];

  console.log('Calling both OpenAI and Claude in parallel...');

  const start = Date.now();

  const [oRes, cRes] = await Promise.all([
    openai.invoke(messages),
    claude.invoke(messages),
  ]);

  const end = Date.now();

  console.log('\n=== OpenAI Response ===');
  console.log(oRes.content);

  console.log('\n=== Claude Response ===');
  console.log(cRes.content);

  console.log('\nTotal Parallel Latency:', end - start, 'ms');
}

run().catch((err) => console.error('Error:', err));
