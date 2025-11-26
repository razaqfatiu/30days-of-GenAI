# Day 1 — The Shift: Software Engineer → AI Engineer

## 🧠 What we're doing today
We contrast **deterministic** code (classic functions) with **probabilistic** behavior (LLM-powered responses).
This helps build intuition for how AI systems "decide" outputs.

## 🛠 Setup Steps
1. Ensure Node.js (>=18) is installed.
2. Initialize a project and install TypeScript and ts-node:
   ```bash
   npm init -y
   npm install -D typescript ts-node @types/node
   npx tsc --init
   ```
3. (Optional, for framework example) Install LangChain and the OpenAI SDK:
   ```bash
   npm install langchain openai
   ```
4. Copy `.env.sample` to `.env` and set `OPENAI_API_KEY` if you plan to run the framework example.

## ▶️ Run the examples
- **Vanilla TS (no external API):**
  ```bash
  npx ts-node day1_transition/code.ts
  ```
- **Framework (LangChain + OpenAI):**
  ```bash
  # Requires OPENAI_API_KEY in .env
  npx ts-node day1_transition/framework.ts
  ```

## 🤔 Why both vanilla and framework?
- **Vanilla TypeScript** makes the core ideas transparent. No magic, just code you can follow line-by-line.
- **Frameworks** (e.g., LangChain) add building blocks (prompt templates, chains, memory, tools) so you can
  assemble production pipelines faster, with less boilerplate.

## 📚 Learn More
- Generative AI overview (LLMs, tokens, temperature): High-level intuition from reputable blogs and docs.
- LangChain Concepts: Chains, prompt templates, memory, tools.
- OpenAI SDK Reference: Usage, models, and parameters.

> Tip: Skim the comments inside both `code.ts` and `framework.ts` — every line is annotated to clarify what's happening.