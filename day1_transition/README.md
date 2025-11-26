# Day 1 — The Shift: Software Engineer → AI Engineer

## 🧠 What we're doing today
Contrast **deterministic** code with **probabilistic** (LLM-driven) behavior to build intuition for AI systems.

## 🛠 Setup Steps
1. Ensure Node.js (>=18) is installed.
3. Install deps and configure env:
   ```bash
   npm install
   cp .env.sample .env   # add your OPENAI_API_KEY
   ```

## ▶️ Run the examples
- **Vanilla TS (no external API):**
  ```bash
  npm run dev:day1:vanilla
  ```
- **Framework (LangChain + OpenAI):**
  ```bash
  npm run dev:day1:framework
  ```

## 🤔 Why both vanilla and framework?
- **Vanilla TypeScript** keeps fundamentals transparent (no magic).
- **Frameworks** (e.g., LangChain) provide production-ready building blocks (prompt templates, chains, memory, tools).

## 📄 Files
- `code.ts` — deterministic vs. simulated non-deterministic greeting.
- `framework.ts` — real LLM inference via LangChain with **updated imports**:

```ts
import { ChatOpenAI } from "@langchain/openai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
```

## 📚 Learn More
- OpenAI Docs: https://platform.openai.com/docs
- LangChain (JS): https://js.langchain.com/docs/
- “State of GPT” (Karpathy): https://www.youtube.com/watch?v=bZQun8Y4L2A

> Tip: Both files are heavily commented line-by-line for clarity.