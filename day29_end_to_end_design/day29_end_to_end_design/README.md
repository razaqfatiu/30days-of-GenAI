# Day 29 — End-to-End GenAI System Design (Capstone)

## 🔄 How This Connects to Previous Days
- Day 26: Cost, latency, and optimization trade-offs
- Day 27: Deployment & scaling
- Day 28: Monitoring, reliability, and incident response
- Day 29: Designing a complete GenAI system from idea to production

This day ties everything together.

---

## 1. Framing the Problem Correctly
Before architecture, ask:
- Is this problem probabilistic or deterministic?
- Does it require reasoning, language understanding, or creativity?
- Where does GenAI add value vs traditional code?

Example:
- Pricing logic → rules engine
- Knowledge lookup → RAG + LLM

---

## 2. Defining Success Criteria
Define:
- Latency targets
- Cost ceilings
- Quality thresholds
- Failure tolerance

---

## 3. Architecture Principles
- Stateless APIs
- Externalized memory & vectors
- Replaceable models/providers
- Clear layer boundaries

---

## 4. Reference Architecture Layers
1. Client
2. API Gateway
3. Intent & routing
4. Retrieval pipeline
5. Prompt assembly
6. Model routing
7. Tools & actions
8. Memory updates
9. Observability
10. Guardrails

---

## 5. End-to-End Request Flow
User → Intent → Retrieval → Prompt → Model → Tools → Response → Logs

---

## 6. Trade-offs
- RAG vs fine-tuning
- Single vs multi-model
- Agents vs pipelines

---

## 7. Evolution Strategy
MVP → RAG → Tools → Agents → Multi-model

---

## 8. Human-in-the-Loop
Approval flows and feedback loops.

---

## 9. Observability-Driven Design
Traceability and replayability.

---

## 10. Security & Compliance
Auth, RBAC, audit logs.

---

## Code Overview
- code.ts: Vanilla pipeline
- framework.ts: Modular architecture

---

## References
- Designing ML Systems — Chip Huyen
- https://martinfowler.com