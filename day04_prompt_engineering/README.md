
# Day 4 — Prompt Engineering 101: How to Talk to LLMs Effectively

## 🔄 Connection to Day 3
Yesterday you learned **how LLMs think**: tokens, context windows, temperature, and other parameters.
Today we build on that foundation by learning **how to communicate with LLMs** so they give the responses you want.

Understanding model behavior (Day 3) makes prompt engineering (Day 4) far easier.

---

## 🎯 Goal
Teach you the core principles of prompt engineering — the art of shaping LLM outputs using structured instructions.

You’ll learn:
- Why prompts matter  
- Types of prompts  
- When to choose each  
- How to reduce hallucination  
- How to design prompts for reliability  
- How to structure system vs user messages  
- How to use constraints, formats, and examples
- Instruction anchoring  
- LLM context (what to include & exclude)  

---

## 🧠 What Is Prompt Engineering?
A prompt is **the set of instructions** you give to an LLM.

A good prompt is:
- clear  
- structured  
- specific  
- scoped  
- testable  

A bad prompt leaves room for randomness and misinterpretation.

---

## 🧰 Core Prompt Types

### 1. **Instruction Prompt**
Tell the model exactly what to do.  
Use when: You want a specific task completed.

Example:
```
Explain this text in simple terms for a 10‑year‑old.
```

### 2. **Context-Enriched Prompt**
Provide background or data.  
Use when: The model needs details to answer properly.

### 3. **Demonstration Prompt (Few-Shot)**
Give examples first.  
Use when: You want the model to mimic style/format.

### 4. **Role Prompt**
Assign the model a persona (e.g., tutor, lawyer).  
Use when: Tone or expertise matters.

### 5. **Chain-of-Thought Prompt**
Ask the model to think step-by-step.  
Use when: Problem solving requires reasoning.

### 6. **Constrained Prompt**
Force the model to follow strict rules.  
Use for: structured output (JSON, tables, bullet points).

### 7. **Refinement Prompt**
Iterate on previous output.  
Use when: You want improvements, polishing, or corrections.

---


## 🎯 How to Choose the Right Technique

| Goal | Best Technique |
|------|---------------|
| Precision | Instruction + Constraints |
| Expert tone | Role Prompt |
| Strict formatting | Constrained / Few-Shot |
| Reasoning | Chain-of-Thought |
| Staying on topic | Context Prompt |
| Prevent drift | Instruction Anchoring |

---


## 🧵 LLM Context: What to Include  
- Task  
- Audience  
- Constraints  
- Relevant data  
- Examples (if needed)

### Avoid:
- Long irrelevant text  
- Buried instructions  
- Noisy details  

---

## 🔒 Instruction Anchoring
Always repeat the main instruction at:
- the **start**, and  
- the **end**  

Models follow recency and priority—anchoring prevents drift.

---

## 🧱 Best Practices for Newbies
- Be explicit (don’t assume the model knows intent).  
- Define audience, tone, and format.  
- Ask for structured output.  
- Use examples if format matters.  
- Use constraints to avoid rambling.  
- Limit the scope (one task per prompt).  
- Reuse prompts — don’t rewrite from scratch.  
- Keep system prompts short and reusable.

---

## 🧪 Included Demos

### 1) Vanilla TypeScript
Shows simple prompting logic, template prompts, and step-by-step generation.

Run:
```bash
npm run dev:day4:vanilla
```

### 2) LangChain Framework Demo
Shows:
- system + human messages  
- role prompting  
- constrained output (JSON)

Run:
```bash
npm run dev:day4:framework
```

---

## 📚 References
- OpenAI Prompting Guide: https://platform.openai.com/docs/guides/prompt-engineering
- Anthropic Prompting Guide: https://docs.anthropic.com/en/docs/prompting
- DeepLearning.AI Prompting Course
- Microsoft Prompt Engineering Playbook

---
