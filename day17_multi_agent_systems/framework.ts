import "dotenv/config";
import { ChatOpenAI } from "@langchain/openai";
import * as fs from "fs";
import * as path from "path";

const llm = new ChatOpenAI({ modelName: "gpt-4o-mini", temperature: 0 });

function message(sender: string, task: string, input: any, output: any) {
  return { sender, task, input, output };
}

/** Research Agent */
function researchAgent(q: string) {
  const storePath = path.join(
    __dirname,
    "..",
    "day09_ingestion_pipeline",
    "day09_local_ingestion_store.json"
  );

  if (!fs.existsSync(storePath))
    return message("research_agent", "fetch", q, "Store missing.");

  const store = JSON.parse(fs.readFileSync(storePath, "utf-8"));
  const results = store.records
    .filter((r: any) => r.text.toLowerCase().includes(q.toLowerCase()))
    .slice(0, 2)
    .map((r: any) => r.text);

  return message("research_agent", "fetch", q, results);
}

/** Math Agent */
function mathAgent() {
  return message("math_agent", "calculate", "12 ÷ 3", 12 / 3);
}

/** Date Agent */
function dateAgent() {
  return message("date_agent", "now", null, new Date().toISOString());
}

/** Writer Agent — LangChain LLM */
async function writerAgent(msgs: any[]) {
  const prompt = `
You are the WRITER_AGENT. Combine the following structured messages:

${JSON.stringify(msgs, null, 2)}

Write a friendly explanation covering:
- What chunking is
- The math result
- Today's date
  `.trim();

  const out = await llm.invoke([{ role: "user", content: prompt }]);
  return out.content;
}

/** Supervisor Agent */
async function supervisorAgent(user: string) {
  const msgs: any[] = [];

  if (/chunk/i.test(user)) msgs.push(researchAgent("chunking"));
  if (/12.*3|12 ÷ 3/.test(user)) msgs.push(mathAgent());
  if (/today|date|time/i.test(user)) msgs.push(dateAgent());

  return writerAgent(msgs);
}

// Run
(async () => {
  const q = "Explain chunking, compute 12 ÷ 3, and tell me today's date.";
  console.log(await supervisorAgent(q));
})();
