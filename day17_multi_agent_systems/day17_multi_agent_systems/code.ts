import "dotenv/config";
import * as fs from "fs";
import * as path from "path";

function message(sender: string, task: string, input: any, output: any) {
  return { sender, task, input, output, status: "success" };
}

/** Research Agent */
function researchAgent(query: string) {
  const storePath = path.join(
    __dirname,
    "..",
    "day09_ingestion_pipeline",
    "day09_local_ingestion_store.json"
  );

  if (!fs.existsSync(storePath))
    return message("research_agent", "fetch_knowledge", query, "No store found.");

  const store = JSON.parse(fs.readFileSync(storePath, "utf-8"));

  const results = store.records
    .filter((r: any) => r.text.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 2)
    .map((r: any) => r.text);

  return message("research_agent", "fetch_knowledge", query, results);
}

/** Math Agent */
function mathAgent(expr: string) {
  try {
    const result = eval(expr.replace("÷", "/"));
    return message("math_agent", "calculate", expr, result);
  } catch {
    return message("math_agent", "calculate", expr, "Invalid expression.");
  }
}

/** Date Agent */
function dateAgent() {
  return message("date_agent", "current_time", null, new Date().toISOString());
}

/** Writer Agent */
function writerAgent(msgs: any[]) {
  const research = msgs.find((m) => m.sender === "research_agent")?.output;
  const math = msgs.find((m) => m.sender === "math_agent")?.output;
  const date = msgs.find((m) => m.sender === "date_agent")?.output;

  return `
Chunking Summary:
${research}

Math Result: ${math}
Today's date: ${date}
  `.trim();
}

/** Supervisor Agent */
async function supervisorAgent(user: string) {
  const messages: any[] = [];

  if (/chunk/i.test(user)) messages.push(researchAgent("chunking"));
  if (/12.*3|12 ÷ 3/.test(user)) messages.push(mathAgent("12 / 3"));
  if (/today|date|time/i.test(user)) messages.push(dateAgent());

  return writerAgent(messages);
}

// Run demo
(async () => {
  const q = "Explain chunking, compute 12 ÷ 3, and tell me today's date.";
  console.log(await supervisorAgent(q));
})();
