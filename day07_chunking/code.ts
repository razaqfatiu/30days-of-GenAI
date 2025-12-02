
// day07_chunking/code.ts
// Flexible chunking strategies + heuristic grouping.
// Writes chunks to day07_chunks.json in JSON format.
// Run: npx tsx day07_chunking/code.ts [strategy]
// strategy: "characters" | "sentences" | "recursive"

import * as fs from "fs";
import * as path from "path";

type ChunkStrategy = "characters" | "sentences" | "recursive";

interface ChunkOptions {
  strategy: ChunkStrategy;
  chunkSize: number; // in characters
  overlap: number;   // in characters
}

interface ChunkMeta {
  id: string;
  index: number;
  startIndex: number;
  endIndex: number;
  strategy: ChunkStrategy;
}

interface Chunk {
  meta: ChunkMeta;
  text: string;
}

// Try to load corpus.txt if present, otherwise use inline sample corpus.
function loadCorpus(): string {
  const corpusPath = path.join(__dirname, "corpus.txt");
  if (fs.existsSync(corpusPath)) {
    return fs.readFileSync(corpusPath, "utf-8");
  }
  return '# Getting Started with RAG\n\nRetrieval-Augmented Generation (RAG) is a pattern where we combine a language model with an external knowledge source. \nInstead of asking the model to "remember" everything, we let it retrieve relevant information and then generate an answer using that context.\n\nFor example, imagine building a "chat with your documentation" feature. \nWhen a user asks a question, you first search through your docs, pick the most relevant passages, and then feed those into the model as additional context.\n\n## Why Chunking Matters\n\nMost documentation files are long. \nIf you try to embed an entire PDF or markdown file as a single piece of text, the embedding will be blurry and less useful.\nInstead, we break the document into smaller, meaningful pieces called chunks.\n\nGood chunks:\n- are not too long, not too short\n- stay on a single topic\n- can stand on their own when retrieved\n\nPoor chunking leads to poor retrieval, which leads to bad answers, no matter how good your model is.\n\n## From Raw Text to Chunks\n\nA typical pipeline looks like this:\n1. Load raw text (from files, APIs, databases).\n2. Normalize and clean the text.\n3. Split the text into chunks with some overlap.\n4. Attach metadata (source, section, page, etc.) to each chunk.\n5. Generate embeddings for those chunks and store them in a vector database.\n\nIn the next stages, queries will be embedded and compared to these chunk embeddings to find the most relevant pieces of information.';
}

// Basic sentence splitter based on punctuation.
function splitIntoSentences(text: string): string[] {
  const parts = text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return parts;
}

// Fixed-size character chunking with overlap.
function characterChunks(text: string, options: ChunkOptions): Chunk[] {
  const chunks: Chunk[] = [];
  const { chunkSize, overlap, strategy } = options;
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const substring = text.slice(start, end);
    chunks.push({
      meta: {
        id: `char-{index}`,
        index,
        startIndex: start,
        endIndex: end,
        strategy,
      },
      text: substring,
    });
    index++;
    if (end === text.length) break;
    start = end - overlap;
  }

  return chunks;
}

// Sentence-based chunking grouped by approximate character size.
function sentenceChunks(text: string, options: ChunkOptions): Chunk[] {
  const sentences = splitIntoSentences(text);
  const chunks: Chunk[] = [];
  const { chunkSize, strategy } = options;
  let current = "";
  let startIndex = 0;
  let index = 0;

  for (const sentence of sentences) {
    const candidate = current ? current + " " + sentence : sentence;
    if (candidate.length > chunkSize && current) {
      const endIndex = startIndex + current.length;
      chunks.push({
        meta: {
          id: `sent-{index}`,
          index,
          startIndex,
          endIndex,
          strategy,
        },
        text: current,
      });
      index++;
      startIndex = endIndex + 1;
      current = sentence;
    } else {
      current = candidate;
    }
  }

  if (current) {
    const endIndex = startIndex + current.length;
    chunks.push({
      meta: {
        id: `sent-{index}`,
        index,
        startIndex,
        endIndex,
        strategy,
      },
      text: current,
    });
  }

  return chunks;
}

// Simple "recursive" style chunking: paragraphs -> sentences.
function recursiveChunks(text: string, options: ChunkOptions): Chunk[] {
  const paragraphs = text.split(/\n\n+/).map((p) => p.trim()).filter(Boolean);
  const chunks: Chunk[] = [];
  const { chunkSize, overlap, strategy } = options;
  let globalIndex = 0;
  let globalPos = 0;

  for (const para of paragraphs) {
    if (para.length <= chunkSize) {
      const startIndex = text.indexOf(para, globalPos);
      const endIndex = startIndex + para.length;
      chunks.push({
        meta: {
          id: `para-{globalIndex}`,
          index: globalIndex,
          startIndex,
          endIndex,
          strategy,
        },
        text: para,
      });
      globalPos = endIndex;
      globalIndex++;
    } else {
      const inner = sentenceChunks(para, { strategy, chunkSize, overlap });
      inner.forEach((chunk) => {
        const localStart = para.indexOf(chunk.text);
        const startIndex = text.indexOf(para, globalPos) + localStart;
        const endIndex = startIndex + chunk.text.length;
        chunks.push({
          meta: {
            id: `rec-{globalIndex}`,
            index: globalIndex,
            startIndex,
            endIndex,
            strategy,
          },
          text: chunk.text,
        });
        globalIndex++;
      });
      globalPos = text.indexOf(para, globalPos) + para.length;
    }
  }

  return chunks;
}

function chunkText(text: string, options: ChunkOptions): Chunk[] {
  switch (options.strategy) {
    case "characters":
      return characterChunks(text, options);
    case "sentences":
      return sentenceChunks(text, options);
    case "recursive":
    default:
      return recursiveChunks(text, options);
  }
}

async function main() {
  const strategyArg = (process.argv[2] as ChunkStrategy) || "recursive";
  const text = loadCorpus();

  const options: ChunkOptions = {
    strategy: strategyArg,
    chunkSize: 500,
    overlap: 50,
  };

  console.log(`Using strategy: ${options.strategy} (chunkSize=${options.chunkSize}, overlap=${options.overlap})`);
  const chunks = chunkText(text, options);

  const output = {
    strategy: options.strategy,
    chunkSize: options.chunkSize,
    overlap: options.overlap,
    totalChunks: chunks.length,
    chunks,
  };

  const outPath = path.join(__dirname, "day07_chunks.json");
  fs.writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`Wrote ${chunks.length} chunks to ${outPath}`);
}

main().catch((err) => {
  console.error("Chunking demo failed:", err);
});
