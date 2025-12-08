import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { PromptTemplate } from '@langchain/core/prompts';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';

function validate(q: string) {
  const bad = ['hack', 'malware'];
  if (bad.some((b) => q.toLowerCase().includes(b))) {
    throw new Error('Unsafe or forbidden query.');
  }
}

function sanitize(output: string) {
  if (/http(s?):\/\//i.test(output)) return "I don't know. (URL removed)";
  return output;
}

async function main() {
  const question = 'Explain chunking in RAG.';

  validate(question);

  const embeddings = new OpenAIEmbeddings({ model: 'text-embedding-3-small' });
  const model = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });

  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: 'day09_ingestion',
    url: CHROMA_URL,
  });

  const retriever = vectorStore.asRetriever({ k: 3 });

  const promptTemplate = [
    'You MUST follow:',
    '- Only use context.',
    '- No hallucinations.',
    '- Say "I don\'t know" if not found.',
    '- Cite chunk IDs with [chunk:id].',
    '',
    'Context:',
    '{context}',
    '',
    'Question: {question}',
  ].join('\n');

  const prompt = PromptTemplate.fromTemplate(promptTemplate);

  // Retrieve docs, build context, and call the model sequentially (avoids Runnable typing issues)
  const docs = await retriever.invoke(question);
  const context = docs
    .map(
      (d) =>
        `[chunk:${d.metadata.id}] ${String(d.pageContent).replace(/\s+/g, ' ')}`
    )
    .join('\n\n');

  const promptStr = await prompt.format({ context, question });
  const response = await model.invoke(promptStr as any);
  let answer = (response as any).content ?? String(response);
  answer = sanitize(String(answer));

  console.log('\n💬 Answer with Guardrails:');
  console.log(answer);
}

main();
