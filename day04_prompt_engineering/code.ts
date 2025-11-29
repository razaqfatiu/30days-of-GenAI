// day04_prompt_engineering/code.ts
// Goal: Show how to DESIGN good prompts in vanilla TypeScript.
// This file does NOT call an LLM directly — it focuses on building
// clear, reusable prompt templates that you could send to any model.
//
// Run: npx tsx day04_prompt_engineering/code.ts

type PromptType =
  | 'instruction'
  | 'role'
  | 'context'
  | 'few_shot'
  | 'constrained';

interface PromptOptions {
  role?: string;
  audience?: string;
  formatHint?: string;
  examples?: { input: string; output: string }[];
}

// Build a reusable prompt template
function buildPrompt(
  type: PromptType,
  task: string,
  options: PromptOptions = {}
): string {
  const { role, audience, formatHint, examples } = options;

  const header = role ? `You are ${role}.` : 'You are a helpful assistant.';

  const audienceLine = audience ? `Target audience: ${audience}.` : '';

  const formatLine = formatHint ? `Format: ${formatHint}.` : '';

  let examplesBlock = '';
  if (examples && examples.length > 0) {
    examplesBlock =
      'Here are some examples: ' +
      examples
        .map(
          (ex, i) =>
            `Example ${i + 1}: User: ${ex.input} Assistant: ${ex.output}`
        )
        .join('');
  }

  return (
    header +
    audienceLine +
    formatLine +
    examplesBlock +
    `Your task: ${task}` +
    'Answer step-by-step only if necessary.'
  );
}

console.log('=== Instruction Prompt ===');
console.log(
  buildPrompt(
    'instruction',
    'Explain what a machine learning model is in simple terms.'
  )
);

console.log('\n=== Role + Audience Prompt ===');
console.log(
  buildPrompt('role', 'Explain embeddings in one short paragraph.', {
    role: 'an AI tutor',
    audience: 'a beginner software engineer',
  })
);

console.log('\n=== Few-Shot + Constrained Prompt ===');
console.log(
  buildPrompt(
    'few_shot',
    "Classify the sentiment of the next review as 'positive' or 'negative' only.",
    {
      formatHint: 'Respond with a single word: positive or negative.',
      examples: [
        {
          input: 'I love this product, it works perfectly.',
          output: 'positive',
        },
        {
          input: 'It kept crashing and wasted my time.',
          output: 'negative',
        },
      ],
    }
  )
);

// In a real app, you would send these prompt strings to an LLM via an API
// (e.g., OpenAI / Anthropic / local model). Here we only design prompts
// so you can clearly see the structure without any framework magic.
