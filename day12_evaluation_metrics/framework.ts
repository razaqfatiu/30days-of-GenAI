import 'dotenv/config';
import { ChatOpenAI, OpenAIEmbeddings } from '@langchain/openai';
import { Chroma } from '@langchain/community/vectorstores/chroma';
import { Document } from '@langchain/core/documents';
import { StringOutputParser } from '@langchain/core/output_parsers';
import { PromptTemplate } from '@langchain/core/prompts';

const CHROMA_URL = process.env.CHROMA_URL || 'http://localhost:8000';
const COLLECTION_NAME = 'day09_ingestion';

async function main() {
  const model = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.2,
  });

  const embeddings = new OpenAIEmbeddings({
    model: 'text-embedding-3-small',
  });

  console.log(
    `Connecting to Chroma at ${CHROMA_URL} (collection="${COLLECTION_NAME}")...`
  );

  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: COLLECTION_NAME,
    url: CHROMA_URL,
  });

  const retriever = vectorStore.asRetriever({
    k: 3,
  });

  const promptTemplate = [
    'You are a helpful AI assistant.',
    "Use ONLY the following context to answer the user's question.",
    "If the answer is not contained in the context, say you don't know.",
    'When helpful, reference chunk ids in square brackets, e.g. [chunk:xyz].',
    '',
    'Context:',
    '{context}',
    '',
    'Question:',
    '{question}',
  ].join('\n');

  const prompt = PromptTemplate.fromTemplate(promptTemplate);

  const question =
    'Explain, in simple terms, why chunking improves retrieval quality in a RAG system.';

  console.log('\n🧑‍💻 Question:');
  console.log(question);

  const t0 = Date.now();

  const docs = await retriever.invoke(question);
  const context = docs
    .map(
      (doc) =>
        `[chunk:${doc.metadata.id}] ${String(doc.pageContent)
          .replace(/\s+/g, ' ')
          .slice(0, 800)}`
    )
    .join('\n\n');

  const promptStr = await prompt.format({ context, question });
  const response = await model.invoke(promptStr);
  const answer = response.content;

  const t1 = Date.now();

  const totalMs = t1 - t0;

  console.log('\n💬 Answer:');
  console.log(answer);

  console.log(`\n⏱️ Total RAG pipeline latency (framework): ${totalMs} ms`);

  console.log('\n🔎 Retrieved documents:');
  docs.forEach((doc, idx) => {
    console.log(
      `#${idx + 1} id=${doc.metadata.id}, strategy=${
        doc.metadata.strategy
      }, preview="${String(doc.pageContent)
        .slice(0, 120)
        .replace(/\s+/g, ' ')}..."`
    );
  });
}

main().catch((err) => {
  console.error('❌ Error in Day 12 framework metrics demo:', err);
});
