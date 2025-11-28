// day03_llm_mind/code.ts
// Goal: Build intuition for tokens, context window truncation, temperature sampling, and latency.
// Run: npx tsx day03_llm_mind/code.ts

// --- Helpers ---------------------------------------------------------------

// Approximate tokenizer: split on whitespace and basic punctuation.
// Real tokenizers (e.g., tiktoken) differ, but this is enough for intuition.
function tokenizeApprox(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\s'-]+/g, ' ') // drop punctuation (keeps apostrophes/hyphens/underscores)
    .split(/\s+/)
    .filter(Boolean);
}

// Truncate tokens to a max context window (e.g., 128 for demo)
function truncateToContext(tokens: string[], maxContext: number): string[] {
  if (tokens.length <= maxContext) return tokens;
  return tokens.slice(tokens.length - maxContext); // keep the tail (like when long history pushes out older turns)
}

// Softmax with temperature over a small fake logits vector
function softmaxWithTemperature(logits: number[], temperature: number): number[] {
  const t = Math.max(temperature, 1e-6); // avoid divide-by-zero
  const exps = logits.map((z) => Math.exp(z / t));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map((e) => e / sum);
}

// Sample an index from a categorical distribution
function sampleIndex(probs: number[]): number {
  const r = Math.random();
  let acc = 0;
  for (let i = 0; i < probs.length; i++) {
    acc += probs[i];
    if (r <= acc) return i;
  }
  return probs.length - 1; // fallback
}

// Simple latency estimator: assume X ms per token for prompt+output
function estimateLatencyMs(promptTokens: number, outputTokens: number, msPerToken = 5): number {
  return (promptTokens + outputTokens) * msPerToken;
}

// Async sleep utility
const sleep = (ms: number) => new Promise((res) => setTimeout(res, ms));

// --- Demo 1: Tokens & Context --------------------------------------------

const prompt = `You are an assistant. Summarize this paragraph in one sentence:
Large Language Models (LLMs) operate on tokens, not words. Token counts determine cost, speed, and the effective memory (context window). When inputs exceed the window, earlier tokens fall off.`;

const tokens = tokenizeApprox(prompt);
console.log(`Tokens (approx):`, tokens.length);

const MAX_CONTEXT = 32;
const truncated = truncateToContext(tokens, MAX_CONTEXT);
console.log(`Context window = ${MAX_CONTEXT} tokens; kept last ${truncated.length} tokens.`);

// --- Demo 2: Temperature sampling ----------------------------------------

// Fake logits for three next-token options: "yes", "no", "maybe"
const logits = [3.0, 2.0, 1.0];
const vocab = ["yes", "no", "maybe"];

function sampleWithTemp(temp: number) {
  const probs = softmaxWithTemperature(logits, temp);
  const idx = sampleIndex(probs);
  return { temp, probs, choice: vocab[idx] };
}

console.log("Sampling with temperature 0.2, 1.0, 1.5:");
[0.2, 1.0, 1.5].forEach((t) => {
  const { probs, choice } = sampleWithTemp(t);
  console.log(`  T=${t}: probs=${probs.map(p=>p.toFixed(2)).join(", ")} -> "${choice}"`);
});

// --- Demo 3: Latency estimation ------------------------------------------

const desiredOutputTokens = 40;
const estMs = estimateLatencyMs(tokens.length, desiredOutputTokens, 4);
console.log(`Estimated latency ~${estMs}ms (at 4ms/token) for ${tokens.length}+${desiredOutputTokens} tokens.`);

(async () => {
  process.stdout.write("Simulating latency ");
  for (let i = 0; i < 5; i++) {
    process.stdout.write(".");
    await sleep(200);
  }
  console.log(" done!");
})();