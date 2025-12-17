import "dotenv/config";
import http from "http";
import { URL } from "url";

/**
 * Day 22 — Deployment & APIs (Vanilla TypeScript)
 *
 * ✅ REST server (Node http)
 * ✅ Auth (Bearer token) + roles (RBAC)
 * ✅ Tools: safe SQL read tool + simulated third‑party API tool (refundPayment)
 * ✅ Safety constraints: prompt injection check, tool allowlists, approval token for side effects
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY ?? "";
const USER_TOKEN = process.env.USER_TOKEN ?? "user-token-123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "admin-token-123";
const SUPPORT_TOKEN = process.env.SUPPORT_TOKEN ?? "support-token-123";

type Role = "user" | "admin" | "support";

/** Auth */
function getRole(authHeader?: string): Role | null {
  if (!authHeader?.startsWith("Bearer ")) return null;
  const token = authHeader.slice("Bearer ".length).trim();
  if (token === USER_TOKEN) return "user";
  if (token === ADMIN_TOKEN) return "admin";
  if (token === SUPPORT_TOKEN) return "support";
  return null;
}

function json(res: http.ServerResponse, code: number, body: any) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: http.IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => (data += chunk));
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function safeParse<T>(raw: string): { ok: true; value: T } | { ok: false; error: string } {
  try {
    return { ok: true, value: JSON.parse(raw) as T };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

/** Guardrail: prompt injection check (Day 21 concept) */
function isPromptInjection(text: string) {
  return /ignore (all|previous) instructions|reveal system prompt|developer message|bypass safety|jailbreak/i.test(text);
}

/** -----------------------------
 * Tool 1: SQL (safe read-only)
 * ------------------------------*/
const fakeUsers = [
  { id: 1, email: "alice@example.com" },
  { id: 2, email: "bob@example.com" },
  { id: 3, email: "charlie@example.com" },
];

function validateSqlReadOnly(query: string) {
  const q = query.trim().toLowerCase();
  if (!q.startsWith("select")) return { ok: false as const, reason: "Only SELECT is allowed" };
  if (/(drop|delete|update|insert|alter)\b/.test(q)) return { ok: false as const, reason: "Write operations are blocked" };
  if (!/from\s+users\b/.test(q)) return { ok: false as const, reason: "Only FROM users is allowed in this demo" };
  if (!/limit\s+\d+/.test(q)) return { ok: false as const, reason: "LIMIT is required" };
  return { ok: true as const };
}

function runSqlTool(query: string) {
  const v = validateSqlReadOnly(query);
  if (!v.ok) return { ok: false as const, error: v.reason };

  const m = query.toLowerCase().match(/limit\s+(\d+)/);
  const limit = m ? Math.min(Number(m[1]), 50) : 2;
  return { ok: true as const, rows: fakeUsers.slice(0, limit) };
}

/** -----------------------------
 * Tool 2: Third-party API (refund) — simulated
 * Safety: requires approval token (HITL)
 * ------------------------------*/
async function refundPaymentTool(input: { paymentId: string; amount: number; approvalToken?: string }) {
  if (!input.paymentId) return { ok: false as const, error: "paymentId is required" };
  if (input.amount <= 0) return { ok: false as const, error: "amount must be > 0" };

  // HITL approval gate
  if (input.approvalToken !== "APPROVED_BY_HUMAN") {
    return { ok: false as const, error: "Missing/invalid approvalToken. Escalate to human." };
  }

  // Simulate provider call (Stripe/Paystack/etc)
  return { ok: true as const, status: "refunded", provider: "SIMULATED_PAYMENTS", ...input };
}

/** -----------------------------
 * Minimal LLM call (optional)
 * ------------------------------*/
async function llmAnswer(question: string) {
  if (!OPENAI_API_KEY) {
    return "(No OPENAI_API_KEY configured. Set it in .env to enable real responses.)";
  }

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        { role: "system", content: "You are a helpful assistant for beginners. Keep answers short and clear." },
        { role: "user", content: question },
      ],
    }),
  });

  if (!res.ok) return `LLM_ERROR: ${await res.text()}`;
  const json = await res.json();
  return json.choices[0].message.content as string;
}

/** -----------------------------
 * REST server routes
 * ------------------------------*/
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  const role = getRole(req.headers.authorization);

  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });

  if (req.method === "POST" && url.pathname === "/ask") {
    if (!role) return json(res, 401, { error: "Unauthorized" });

    const raw = await readBody(req);
    const parsed: any = safeParse<{ question: string }>(raw);
    if (!parsed.ok) return json(res, 400, { error: "Invalid JSON", detail: parsed.error });

    const question = String(parsed.value.question ?? "");
    if (isPromptInjection(question)) return json(res, 400, { error: "Blocked: prompt injection detected" });

    const answer = await llmAnswer(question);
    return json(res, 200, { role, answer });
  }

  if (req.method === "POST" && url.pathname === "/tools/sql") {
    // Admin-only SQL tool
    if (role !== "admin") return json(res, 403, { error: "Forbidden (admin only)" });

    const raw = await readBody(req);
    const parsed: any = safeParse<{ query: string }>(raw);
    if (!parsed.ok) return json(res, 400, { error: "Invalid JSON", detail: parsed.error });

    const out = runSqlTool(String(parsed.value.query ?? ""));
    return json(res, out.ok ? 200 : 400, out);
  }

  if (req.method === "POST" && url.pathname === "/tools/refund") {
    // Admin-only + approval token for safety
    if (role !== "admin") return json(res, 403, { error: "Forbidden (admin only)" });

    const raw = await readBody(req);
    const parsed: any = safeParse<{ paymentId: string; amount: number; approvalToken?: string }>(raw);
    if (!parsed.ok) return json(res, 400, { error: "Invalid JSON", detail: parsed.error });

    const out = await refundPaymentTool(parsed.value);
    return json(res, out.ok ? 200 : 409, out);
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(3000, () => {
  console.log("✅ Day 22 REST server running on http://localhost:3000");
});