# Day 14 — Introduction to Agents (ReAct, Tool Use, & Decision-Based LLMs)

## 🔄 Connection To Previous Days

- Day 11 → You built a functioning RAG pipeline
- Day 12 → You measured its performance
- Day 13 → You added guardrails & safety

**Day 14 is the next evolution: turning an LLM into an Agent.**

Agents can **think, decide, and act** using tools such as:

- vector search
- calculators
- APIs
- your RAG pipeline

---

## 🤖 What Is an Agent?

A model that performs **Reasoning + Acting** steps, not just answering.

An Agent is an LLM that does:

1. **Reasoning** — the “Thought”
2. **Action selection** — choosing a tool
3. **Acting** — executing a tool
4. **Observing** tool output
5. **Iterating** until ready
6. Producing a **Final Answer**

This makes the LLM a _decision-maker_, not just a text generator.

### Example:

```
Thought: I need more info about chunking.
Action: vector_search
Action Input: {"query": "chunking meaning"}

Observation: Found 3 relevant chunks.

Thought: Now I can answer.
Final Answer: Chunking is...
```

---

## 🧠 The ReAct Pattern

ReAct = **Reason** + **Act**

### Loop:

1. LLM produces a _Thought_
2. LLM selects an _Action_
3. System executes the tool
4. System sends back _Observation_
5. LLM continues reasoning

Stops when:

- `Final Answer` appears
- OR max iterations reached

# Sample reasoning loop:

```
Thought: I need more detail about chunking.
Action: vector_search
Action Input: {"query": "chunking"}

Observation: Found 2 relevant passages.

Thought: Now I can explain chunking.
Action: calculator
Action Input: {"a": 2, "b": 3, "op": "add"}

Observation: 5

Final Answer: Chunking helps retrieval... and 2 + 3 = 5.
```

This pattern allows complex workflows and multi-step decision making.

---

## 🛠️ Tools Implemented Today

- **calculator** → Performs basic arithmetic:
  - add
  - subtract
  - multiply
  - divide

Useful for symbolic reasoning tasks LLMs are bad at.

- **vector_search** → search text from Day 9 JSON store
- **noop** → fallback tool

---

## 🧪 Vanilla Implementation (`code.ts`)

The vanilla ReAct agent shows you how agents work internally:

1. Build instructions telling the LLM how to structure:
   - Thought
   - Action
   - Action Input
2. Ask the model to follow the pattern
3. Parse its response
4. Execute the selected tool in TypeScript
5. Feed back the “Observation” to the LLM
6. Continue the loop until:
   - `Final Answer:` appears
   - OR max iterations reached

This is the **most transparent** way to understand agents.

---

## ⚙️ Framework Implementation (`framework.ts`)

Using LangChain’s built-in agent executor:

- Define tools with `tool()`
- Create a ReAct agent:
  ```ts
  createReactAgent({ llm, tools });
  ```
- LangChain handles:
  - planning loop
  - tool calling
  - observations
  - final answer extraction

This is the **fastest** way to build production agents.

## 🚀 Add Scripts

```jsonc
"dev:day14:vanilla": "tsx day14_intro_agents/code.ts",
"dev:day14:framework": "tsx day14_intro_agents/framework.ts"
```

---

## 📚 References

- ReAct Paper (Google): https://arxiv.org/abs/2210.03629
- LangChain Agents: https://js.langchain.com/docs/modules/agents/
- OpenAI Function Calling: https://platform.openai.com/docs/guides/function-calling
