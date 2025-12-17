import "dotenv/config";
import http from "http";
import { URL } from "url";

/**
 * Day 22 — GraphQL (Minimal) + Safety Constraints
 *
 * In real projects you'd use Apollo Server / GraphQL Yoga.
 * Here we keep it minimal for beginners.
 *
 * Supports:
 * - Query: ask(question)
 * - Mutation: refund(paymentId, amount, approvalToken)  (admin + approval required)
 */

const USER_TOKEN = process.env.USER_TOKEN ?? "user-token-123";
const ADMIN_TOKEN = process.env.ADMIN_TOKEN ?? "admin-token-123";

type Role = "user" | "admin";

function roleFromAuth(auth?: string): Role | null {
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice("Bearer ".length).trim();
  if (token === USER_TOKEN) return "user";
  if (token === ADMIN_TOKEN) return "admin";
  return null;
}

function json(res: http.ServerResponse, code: number, body: any) {
  res.writeHead(code, { "Content-Type": "application/json" });
  res.end(JSON.stringify(body, null, 2));
}

async function readBody(req: http.IncomingMessage) {
  return new Promise<string>((resolve, reject) => {
    let d = "";
    req.on("data", (c) => (d += c));
    req.on("end", () => resolve(d));
    req.on("error", reject);
  });
}

async function askResolver(question: string) {
  // In production: call orchestrated pipeline or LLM.
  return `Answer (stub): ${question}`;
}

async function refundResolver(input: { paymentId: string; amount: number; approvalToken?: string }, role: Role) {
  // Safety constraints
  if (role !== "admin") return { ok: false, error: "Forbidden (admin only)" };
  if (input.approvalToken !== "APPROVED_BY_HUMAN") return { ok: false, error: "Missing/invalid approvalToken. HITL required." };
  if (input.amount <= 0) return { ok: false, error: "amount must be > 0" };
  return { ok: true, status: "refunded", ...input };
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");

  if (req.method === "GET" && url.pathname === "/health") return json(res, 200, { ok: true });

  if (req.method === "POST" && url.pathname === "/graphql") {
    const role = roleFromAuth(req.headers.authorization);
    if (!role) return json(res, 401, { error: "Unauthorized" });

    const raw = await readBody(req);
    let payload: any;
    try {
      payload = JSON.parse(raw);
    } catch {
      return json(res, 400, { error: "Invalid JSON" });
    }

    const query: string = payload.query ?? "";
    const vars: any = payload.variables ?? {};

    if (query.includes("ask")) {
      const question = vars.question ?? (query.match(/ask\s*\(\s*question\s*:\s*"(.*?)"\s*\)/)?.[1] ?? "");
      const out = await askResolver(String(question));
      return json(res, 200, { data: { ask: out } });
    }

    if (query.includes("refund")) {
      const input = {
        paymentId: vars.paymentId ?? "pay_demo",
        amount: Number(vars.amount ?? 0),
        approvalToken: vars.approvalToken,
      };
      const out = await refundResolver(input, role);
      return json(res, out.ok ? 200 : 409, { data: { refund: out } });
    }

    return json(res, 400, { error: "Unsupported query/mutation" });
  }

  return json(res, 404, { error: "Not found" });
});

server.listen(4000, () => {
  console.log("✅ Day 22 GraphQL server on http://localhost:4000/graphql");
});