import 'dotenv/config';
import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { StringOutputParser } from '@langchain/core/output_parsers';
import {
  RunnableBranch,
  RunnableParallel,
  RunnableSequence,
} from '@langchain/core/runnables';
import { StateGraph, START, END } from '@langchain/langgraph';
import * as z from 'zod';

/**
 * Day 19 — Agent Orchestration (Frameworks)
 *
 * Shows TWO orchestration styles:
 * 1) LCEL (LangChain Expression Language): Sequence + Branch + Parallel
 * 2) LangGraph: DAG-based workflow with branching via conditional edges
 */

const llm = new ChatOpenAI({ modelName: 'gpt-4o-mini', temperature: 0 });
const parser = new StringOutputParser();

/** ----------------------------
 * 1) LCEL Demo
 * ---------------------------- */
async function lcelDemo() {
  const basePrompt = ChatPromptTemplate.fromTemplate(
    'You are a helpful assistant. Answer in simple terms:\nQuestion: {question}'
  );
  const baseChain = basePrompt.pipe(llm as any).pipe(parser as any);

  const ragPrompt = ChatPromptTemplate.fromTemplate(
    'Use the provided context to answer.\nContext: {context}\nQuestion: {question}'
  );
  const ragChain = ragPrompt.pipe(llm as any).pipe(parser as any);

  // Branching: choose ragChain if question looks like it needs extra context
  const branch = RunnableBranch.from([
    [
      (input: { question: string }) =>
        /metadata|rag|embedding|chunk/i.test(input.question),
      RunnableSequence.from([
        (i: { question: string }) => ({
          ...i,
          context:
            'Chunking splits text into smaller pieces. Metadata helps filter, trace, and debug chunks.',
        }),
        ragChain as any,
      ]) as any,
    ],
    baseChain as any,
  ]);

  // Parallel fan-out: answer + critique
  const critiquePrompt = ChatPromptTemplate.fromTemplate(
    'Critique this answer for clarity (1 sentence):\nAnswer: {answer}'
  );
  const critiqueChain = critiquePrompt.pipe(llm as any).pipe(parser as any);

  const parallel = RunnableParallel.from({
    answer: branch,
    critique: RunnableSequence.from([
      async (input: { question: string }) => ({
        answer: await (branch as any).invoke(input),
      }),
      critiqueChain as any,
    ]) as any,
  });

  const out = await parallel.invoke({
    question: 'Explain chunking and why metadata matters in RAG.',
  });
  console.log('\n=== LCEL OUTPUT ===');
  console.log(out);
}

/** ----------------------------
 * 2) LangGraph Demo
 * ---------------------------- */
async function langGraphDemo() {
  const State = z.object({
    question: z.string(),
    route: z.enum(['direct', 'rag']).optional(),
    context: z.string().optional(),
    answer: z.string().optional(),
  });

  const classifyNode = async (state: z.infer<typeof State>) => {
    const needsRag = /metadata|rag|embedding|chunk/i.test(state.question);
    return { route: needsRag ? 'rag' : 'direct' };
  };

  const fetchContextNode = async (_state: z.infer<typeof State>) => {
    return {
      context:
        'Chunking splits text into smaller chunks. Metadata helps filtering, debugging, and traceability.',
    };
  };

  const answerNode = async (state: z.infer<typeof State>) => {
    const prompt =
      state.route === 'rag' && state.context
        ? `Use context:\n${state.context}\n\nQ: ${state.question}`
        : `Q: ${state.question}`;

    const msg = await llm.invoke([{ role: 'user', content: prompt }]);
    return { answer: String(msg.content) };
  };

  const routeAfterClassify = (state: z.infer<typeof State>) => {
    return state.route === 'rag' ? 'fetch_context' : 'answer';
  };

  const graph = new StateGraph(State as any)
    .addNode('classify', classifyNode)
    .addNode('fetch_context', fetchContextNode)
    .addNode('answer', answerNode)
    .addEdge(START, 'classify')
    .addConditionalEdges('classify', routeAfterClassify)
    .addEdge('fetch_context', 'answer')
    .addEdge('answer', END)
    .compile();

  const result = await graph.invoke({
    question: 'Explain chunking and why metadata matters in RAG.',
  });
  console.log('\n=== LANGGRAPH OUTPUT ===');
  console.log(result);
}

(async () => {
  await lcelDemo();
  await langGraphDemo();
})();
