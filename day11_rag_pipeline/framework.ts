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

  const vectorStore = await Chroma.fromExistingCollection(embeddings, {
    collectionName: COLLECTION_NAME,
    url: CHROMA_URL,
  });

  const retriever = vectorStore.asRetriever({ k: 3 });

  const promptTemplate = [
    'You are a helpful assistant.',
    "Use ONLY the following context to answer the user's question.",
    "If the answer is not contained in the context, say you don't know.",
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

  console.log('Model Answer:\n', answer);

  console.log('\nRetrieved Documents (IDs):');
  docs.forEach((doc, idx) => {
    console.log(
      `#${idx + 1}: id=${doc.metadata.id}, preview="${String(doc.pageContent)
        .slice(0, 100)
        .replace(/\s+/g, ' ')}..."`
    );
  });
}

main().catch(console.error);
