// day05_inferencing/code.ts
// Demonstrates inferencing basics, multi-provider calls, latency measurement, and cost estimation.
// NOTE: Replace API keys and model names as needed.

import "dotenv/config";

// Simple latency helper
async function measureLatency(fn: () => Promise<any>) {
  const start = Date.now();
  const result = await fn();
  const end = Date.now();
  return { result, latency: end - start };
}

// Simple mock cost estimator
function estimateCost(inputTokens: number, outputTokens: number, ratePer1k: number) {
  return ((inputTokens + outputTokens) / 1000) * ratePer1k;
}

// Provider calls (simplified using fetch)
async function callOpenAI(prompt: string) {
  return measureLatency(async () => {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
      }),
    });
    return res.json();
  });
}

async function callMistral(prompt: string) {
  return measureLatency(async () => {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-small",
        messages: [{ role: "user", content: prompt }],
        max_tokens: 60,
      }),
    });
    return res.json();
  });
}

// Demo
(async () => {
  console.log("=== Inferencing Demo: Multiple Providers ===");

  const prompt = "Explain embeddings in one short sentence.";

  const [openai, mistral] = await Promise.all([
    callOpenAI(prompt),
    callMistral(prompt),
  ]);

  console.log("OpenAI latency:", openai.latency, "ms");
  console.log("Mistral latency:", mistral.latency, "ms");

  console.log("\nSample Output (OpenAI):", openai.result?.choices?.[0]?.message);
  console.log("Sample Output (Mistral):", mistral.result?.choices?.[0]?.message);

  const cost = estimateCost(20, 60, 0.15); // fake example rate
  console.log("\nEstimated Cost:", cost, "USD");
})();
