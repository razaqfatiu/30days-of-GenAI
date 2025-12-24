# Day 27 — Deployment & Scaling GenAI Systems (Expanded, Production-Focused)

## 🔄 Connection to Day 26
Day 26 optimized the *inside* of your system (tokens, caching, routing, cost, latency).
Day 27 is about the *outside*: **how this system runs safely under real traffic**.

If Day 26 is “make it efficient,” Day 27 is:
✅ make it deployable  
✅ make it scalable  
✅ make it observable  
✅ make it resilient  

---

# What You’ll Build Today
A mini **production-style architecture simulator** that demonstrates:
- server vs serverless vs hybrid deployment patterns
- containers + secrets handling
- stateless API design + external state placement
- async job queues + workers (and retries)
- backpressure + load shedding
- load balancing + routing policies
- environment separation (dev/staging/prod)
- model + prompt versioning, canary and blue/green releases
- multi-region routing and failover
- cost-aware autoscaling decisions
- security boundaries for tools/external actions
- observability (logs, metrics, traces) + alert examples
- operational runbooks (“what to do when X happens”)

This is not Kubernetes YAML — it’s the **core engineering logic** you must understand
before you copy/paste infra templates.

---

# 1) Deployment Patterns

## A) Server-Based (VMs/Containers)
**You run a long-lived service** (Node API, container on ECS/K8s).

✅ Pros: stable, predictable, easy connections, good for WebSockets  
⚠️ Cons: you manage scaling + deployments

Use when:
- always-on APIs
- custom routing + caching layers
- lower cold-start tolerance

---

## B) Serverless (Lambda/Cloud Functions)
**Functions run on-demand** per request.

✅ Pros: simple scaling, pay-per-use  
⚠️ Cons: cold starts, connection reuse hard, heavier observability

Use when:
- spiky traffic
- simple inference endpoints
- async processing pipelines

---

## C) Hybrid (Recommended for GenAI)
Typical split:
- **sync API** (chat, low latency)
- **async workers** (long agents, ingestion, heavy tools)

Why:
- avoids timeouts
- improves reliability and cost control

---

# 2) Containerization & Secrets
Containers:
- make builds reproducible
- isolate dependencies

Secrets:
- never commit keys
- load from environment managers (GitHub Actions secrets, AWS Secrets Manager, etc.)
- separate secrets per environment

In code, treat secrets like:
- read-only at runtime
- rotated without redeploying (when possible)

---

# 3) Scaling Strategies
## Horizontal scaling
Run more instances of the API under load.

## Async workers
Push heavy jobs to queues.
Scale workers independently from the API.

Rule:
> Scale the bottleneck, not everything.

---

# 4) Load Balancing & Routing
A load balancer routes requests across instances.

Routing policies you’ll see in production:
- round-robin
- least-connections
- region-aware routing
- feature-aware routing (route “expensive” endpoints to special pools)

---

# 5) Stateful vs Stateless Design
**Stateless API** = easier to scale:
- any instance can handle any request
- state lives in external stores (DB/Redis/vector DB)

**Stateful** is harder:
- sticky sessions
- scaling becomes complex
- failover is painful

GenAI rule:
> Keep the API stateless. Put memory and vectors outside.

---

# 6) Memory & Vector DB Placement
Where memory lives:
- **Redis**: fast session/task state
- **Postgres/Mongo**: durable structured state (profiles, configs)
- **Vector DB**: semantic memory + retrieval

Placement decisions:
- co-locate vector DB per region to reduce latency
- replicate critical memory across regions
- beware egress costs

---

# 7) Environment Separation (dev/staging/prod)
Why separate:
- experiments in staging
- stable experience in prod
- cheap models in dev (save money)

Typical:
- `DEV`: cheapest model, verbose logs
- `STAGING`: close to prod, canaries enabled
- `PROD`: guarded, strict rate limits, on-call alerts

---

# 8) Model & Prompt Versioning
In production, treat prompts like code:
- `prompt_v1`, `prompt_v2`
- pin model versions where possible
- store config in a registry (DB/JSON)

Why:
- “silent” behavior changes are common
- rollback is essential

---

# 9) Canary & Blue-Green Deployments
## Canary
- send 5% traffic to new version
- compare metrics
- ramp up if good

## Blue-Green
- deploy new version (green)
- switch traffic instantly
- keep old version (blue) ready for rollback

For GenAI, canary should compare:
- quality (Day 12 metrics)
- cost (Day 26)
- latency (Day 26)

---

# 10) Async Pipelines & Queues
Queue patterns:
- enqueue job
- workers consume
- retries with backoff
- dead-letter queue for poison jobs

Use for:
- document ingestion
- long tool chains
- multi-agent workflows

---

# 11) Backpressure & Load Shedding
Backpressure prevents overload:
- limit queue size
- reject low-priority work
- degrade features (e.g., turn off reranking)

Load shedding example:
- if queue > threshold → return “try again later”
- if tokens cost > threshold → route to cheaper model

---

# 12) Multi-Region Deployment
Why:
- reduce latency (closer to users)
- resilience (region outage)

Patterns:
- active-active (both regions live)
- active-passive (failover)

Routing:
- geo-DNS
- region health checks
- data locality awareness (memory/vector DB)

---

# 13) Cost-Aware Autoscaling
Classic autoscaling looks at CPU/RAM.
GenAI autoscaling should also consider:
- tokens/min
- cost/min
- queue depth
- latency SLO breaches

Example:
- scale workers when queue depth grows
- throttle expensive endpoints when cost spikes

---

# 14) Security & Access Control
Production AI security includes:
- auth (JWT, API keys)
- RBAC (“admin can run tool X”)
- tool permission boundaries (allowlist)
- outbound network restrictions for tool calls
- audit logs for external actions

---

# 15) Observability & Alerts
You need:
- logs (structured)
- metrics (latency, cost, cache hit rate, queue depth)
- traces (request spanning API→retrieval→LLM→tools)

Alerts:
- latency SLO breach
- cost spike
- queue backlog
- error rate spike
- model/provider down

---

# 16) Operational Runbooks
Runbooks answer:
- “what do we do when it breaks?”

Examples:
- latency spike → check retrieval/cache/provider
- cost spike → check prompt size, cache hit rate, model routing
- queue backlog → scale workers or shed load
- provider outage → failover to backup provider/model

---

## 🚀 Scripts
```jsonc
"dev:day27:vanilla": "tsx day27_deployment_scaling/code.ts",
"dev:day27:framework": "tsx day27_deployment_scaling/framework.ts"
```

---

## 📚 References
- Twelve-Factor App: https://12factor.net/
- OWASP API Security: https://owasp.org/www-project-api-security/
- Resilience patterns: https://learn.microsoft.com/en-us/azure/architecture/patterns/
- Blue/Green deployments: https://martinfowler.com/bliki/BlueGreenDeployment.html
- Canary releases: https://martinfowler.com/bliki/CanaryRelease.html