# Day 22 — Deployment, APIs & Scaling AI Systems (REST • GraphQL • SQL • 3rd‑Party APIs • Auth • Safety Constraints)

## 🔄 Connection to Day 21
Day 21 introduced **guardrails** (input/output policies, reliability patterns, HITL).
Day 22 shows how to **ship** an AI system as a service:
- expose it via APIs (**REST + GraphQL**),
- integrate tools (**SQL + third‑party APIs**),
- secure it (**auth/RBAC**),
- and **constrain external actions** (approvals, allowlists, audit-friendly design).

---

## 0) The Big Picture
A production “AI agent” usually has layers:

1) **API layer** (REST/GraphQL) — receives requests
2) **Orchestration layer** — routes, calls tools, builds prompts
3) **Tooling layer** — DBs, third‑party APIs, internal services
4) **Safety layer** — policies, allowlists, approvals, HITL
5) **Observability** — traces/metrics (Day 20)

---

## 1) REST API (default choice)
REST is great because it’s simple and widely supported.

### Example endpoints
- `POST /ask` — answer a question
- `POST /tools/sql` — run safe SQL read queries (**admin only**)
- `POST /tools/refund` — high-risk action (**admin + approval token**)

In `code.ts`, we build a tiny REST server using Node’s `http` module (no framework) so you see exactly what happens.

---

## 2) GraphQL API (flexible queries)
GraphQL is great when clients need different shapes of data, but it adds complexity (schema, resolvers, security).

In `framework.ts`, we show a minimal GraphQL server with:
- `ask(question)` query
- `refund(...)` mutation that demonstrates **safety constraints**

(We keep parsing minimal on purpose for beginner clarity.)

---

## 3) SQL as a Tool (safe patterns)
**Never** let an LLM generate arbitrary SQL and execute it.

Safe patterns:
- allowlist **SELECT only**
- table/column allowlists
- LIMIT required
- parameterized queries (real DB)
- timeouts and row limits
- row-level security (real systems)

In today’s code:
- we implement a “SQL tool” that blocks write ops and only allows `FROM users`.

---

## 4) Third‑party APIs as Tools (payments/email/CRM)
Examples:
- Stripe/Paystack (payments)
- Twilio (SMS)
- SES/SendGrid (email)
- Zendesk (tickets)

Risks: real-world side effects (fraud, data leaks).

Safe patterns:
- RBAC + tool allowlists
- **two-step confirmation**
- HITL approvals for high-risk tools
- idempotency keys for safe retries
- audit logging of tool calls (redacting secrets)

In today’s code:
- `refundPayment` requires `approvalToken === "APPROVED_BY_HUMAN"`

---

## 5) Auth (who can do what?)
We implement simple Bearer tokens for demo:
- `user` can call `/ask`
- `admin` can call `/tools/sql` and `/tools/refund`
- `support` can be added similarly (tickets)

---

## 6) Safety constraints for external actions
If an agent can call tools with side effects, enforce:
- prompt-injection checks before tool calls
- input validation/normalization
- approvals for high risk actions
- fallback behavior + clear user messaging
- audit-friendly logs

---

## 📂 Files
- `README.md` — this guide
- `code.ts` — Vanilla TS REST server + auth + SQL tool + third-party tool + safety constraints
- `framework.ts` — Minimal GraphQL server + auth + safe mutation constraints

---

## 🚀 package.json scripts
```jsonc
"dev:day22:vanilla": "tsx day22_deployment_scaling/code.ts",
"dev:day22:framework": "tsx day22_deployment_scaling/framework.ts"
```

---

## 🔑 .env
```bash
OPENAI_API_KEY=your_key
USER_TOKEN=user-token-123
ADMIN_TOKEN=admin-token-123
SUPPORT_TOKEN=support-token-123
```

---

## 🧪 Quick test (REST)
```bash
curl -X POST http://localhost:3000/ask \
  -H "Authorization: Bearer user-token-123" \
  -H "Content-Type: application/json" \
  -d '{"question":"Explain chunking and metadata in RAG."}'

curl -X POST http://localhost:3000/tools/sql \
  -H "Authorization: Bearer admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{"query":"SELECT id,email FROM users LIMIT 2"}'

curl -X POST http://localhost:3000/tools/refund \
  -H "Authorization: Bearer admin-token-123" \
  -H "Content-Type: application/json" \
  -d '{"paymentId":"pay_123","amount":5000,"approvalToken":"APPROVED_BY_HUMAN"}'
```

---

## 📚 References
- OWASP LLM Top 10: https://owasp.org/www-project-top-10-for-large-language-model-applications/
- OpenAI Safety: https://platform.openai.com/docs/guides/safety
- GraphQL basics: https://graphql.org/learn/
- REST API design: https://restfulapi.net/
- SQL injection prevention: https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html