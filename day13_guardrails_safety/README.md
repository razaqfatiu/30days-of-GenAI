
# Day 13 — Guardrails, Safety, and Robust Prompting in RAG Systems

## 🔄 Connection To Previous Days
- Day 11 → You built a functioning RAG pipeline  
- Day 12 → You added evaluation (quality, latency, cost)  

Now Day 13 makes RAG **safe, reliable, and production-ready**  
by adding:  
- Input validation  
- Output guardrails  
- Instruction anchoring  
- Fallback logic  
- Confidence scoring  

---

## 🎯 What You’ll Learn
### ✅ 1. Input Guardrails  
Block unsafe or irrelevant queries.  
We implement keyword filtering and domain restriction.

### ✅ 2. Output Guardrails  
Post-process LLM outputs to prevent:  
- hallucinated URLs  
- invented facts  
- domain violations  

### ✅ 3. Instruction Anchoring  
System prompt enforces:  
- cite chunk IDs  
- never make up facts  
- answer ONLY from context  

### ✅ 4. Fallback Logic  
If retrieval confidence is low → respond with  
**"I don't know."**

### ✅ 5. Confidence Scoring  
Score = average cosine similarity of retrieved chunks.  
If too low → fallback.

---

## 📂 Files Included
- `code.ts` (Vanilla TS RAG + Guardrails)
- `framework.ts` (LangChain RAG + Guardrails)
- `README.md`

---

## 🚀 Scripts to Add
```jsonc
"dev:day13:vanilla": "tsx day13_guardrails_safety/code.ts",
"dev:day13:framework": "tsx day13_guardrails_safety/framework.ts"
```

---

## 📚 References
- OpenAI Safety Best Practices — https://platform.openai.com/docs/guides/safety  
- OWASP LLM Security — https://owasp.org/www-project-top-10-for-large-language-model-applications/  
- LangChain Guardrails — https://js.langchain.com/docs/guides/production/guardrails  
