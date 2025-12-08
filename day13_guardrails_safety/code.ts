
import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

interface LocalVectorRecord {
  id: string;
  text: string;
  metadata: any;
  embedding: number[];
}

interface LocalVectorStore {
  totalRecords: number;
  records: LocalVectorRecord[];
}

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
if (!OPENAI_API_KEY) throw new Error("Missing OPENAI_API_KEY");

/** Cosine similarity */
function cosineSimilarity(a: number[], b: number[]) {
  const dot = a.reduce((s, ai, i) => s + ai * (b[i] ?? 0), 0);
  const magA = Math.sqrt(a.reduce((s, ai) => s + ai * ai, 0));
  const magB = Math.sqrt(b.reduce((s, bi) => s + bi * bi, 0));
  return !magA || !magB ? 0 : dot / (magA * magB);
}

/** Input guardrails */
function validateQuestion(q: string) {
  const forbidden = ["hack", "malware", "bypass", "delete database"];
  const lower = q.toLowerCase();
  if (forbidden.some(f => lower.includes(f))) {
    return { valid: false, reason: "Unsafe or forbidden query." };
  }
  if (q.length < 3) return { valid: false, reason: "Query too short." };
  return { valid: true };
}

/** Embed text */
async function embed(text: string): Promise<number[]> {
  const res = await fetch("https://api.openai.com/v1/embeddings", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({ model: "text-embedding-3-small", input: text })
  });
  const json = await res.json();
  return json.data[0].embedding;
}

/** Ask LLM with instruction anchoring */
async function ask(question: string, context: string): Promise<string> {
  const system = `
You MUST follow these instructions:
- Use ONLY the provided context.
- If answer is not in the context, say "I don't know."
- Never create URLs or facts.
- Always cite chunk ids using [chunk:id].
`;

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: system },
        { role: "user", content: `Context:\n${context}\n\nQuestion: ${question}` }
      ]
    })
  });

  const json = await res.json();
  return json.choices[0].message.content.trim();
}

/** Output sanitization */
function sanitize(output: string) {
  if (/http(s?):\/\//i.test(output)) return "I don't know. (Unsafe URL removed)";
  return output;
}

/** Main */
async function main() {
  const question = "Explain why chunking improves retrieval.";

  const validation = validateQuestion(question);
  if (!validation.valid) {
    console.log("❌ Invalid:", validation.reason);
    return;
  }

  const storePath = path.join(__dirname, "..", "day09_ingestion_pipeline", "day09_local_ingestion_store.json");
  const store: LocalVectorStore = JSON.parse(fs.readFileSync(storePath, "utf-8"));

  const qEmbed = await embed(question);

  const scored = store.records.map(r => ({
    rec: r,
    score: cosineSimilarity(qEmbed, r.embedding)
  })).sort((a, b) => b.score - a.score);

  const top3 = scored.slice(0, 3);
  const avg = top3.reduce((s, x) => s + x.score, 0) / top3.length;

  if (avg < 0.35) {
    console.log("⚠️ Low confidence. Fallback: I don't know.");
    return;
  }

  const context = top3.map(x => `[chunk:${x.rec.id}] ${x.rec.text.replace(/\s+/g, " ")}`).join("\n\n");
  let answer = await ask(question, context);
  answer = sanitize(answer);

  console.log("\n💬 Final Answer:");
  console.log(answer);
}

main();
