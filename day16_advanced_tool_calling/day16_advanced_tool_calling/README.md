# Day 16 — Advanced Tool Calling & Multi-Tool Decisions

## 🔄 Connection to Day 15

Yesterday, you learned **structured tool calling** — how to define tools with schemas so the model can call them reliably.

But Day 15 focused on _one tool call at a time_.

Now we extend to:

> **Multi-step, multi-tool reasoning:**  
> When the task requires more than one tool, the model must call tools sequentially and intelligently.

---

# 🎯 What You Learn Today

1. How LLMs decide **which tool** to call.
2. How LLMs decide **whether** to call a tool at all.
3. How to support **multiple tool calls in a single conversation**.
4. How to prevent infinite loops or incorrect tool sequencing.
5. How LangChain automatically manages multi-step tool workflows.

---

# 🧠 Why Multi-Tool Reasoning Matters

Most production AI workflows require combining skills:

Example:

> “Search for chunking examples, summarize them, compute 3 × 7, and tell me the current date.”

This requires **three tools**:

1. vector_search
2. calculator
3. current_date

The agent must:  
✔ Plan  
✔ Sequence the tools  
✔ Interpret intermediate output  
✔ Produce a final grounded answer

---

# 🛠 Tools Used (Same as Day 15)

### 1️⃣ calculator

Adds, subtracts, multiplies, divides.

### 2️⃣ vector_search

Searches Day 9’s local ingestion store.

### 3️⃣ current_date

Returns the current ISO timestamp.

---

# 🔧 How The Multi-Step Loop Works

### 1️⃣ First call

We send:

- The user question
- The tool list
- `tool_choice: "auto"`

The model chooses tools _if needed_.

### 2️⃣ Execute tools in TypeScript

For each tool call:

- Parse args
- Run local function
- Append a `tool` message to history

### 3️⃣ Second LLM call

Force:

- `tool_choice: "none"`  
  So the model returns a final natural-language answer.

### 4️⃣ Iteration

We allow multiple rounds of:

- tool call → tool result → LLM rewrite  
  Until we reach:
- A Final Answer
- Or max iteration limit

---

# 📂 Files Included

### ✔ `code.ts` (Vanilla)

- Multi-step structured tool-calling orchestrator.
- Supports:
  - Multiple sequential tool calls
  - Loop limits
  - Automatic result injection
  - Final forced LLM answer

### ✔ `framework.ts` (LangChain)

- Uses LangChain’s agent framework
- Automatically handles:
  - Tool selection
  - Tool sequencing
  - Observations

---

# 🚀 package.json Scripts

```jsonc
"dev:day16:vanilla": "tsx day16_advanced_tool_calling/code.ts",
"dev:day16:framework": "tsx day16_advanced_tool_calling/framework.ts"
```

---

## 📚 References

- OpenAI Tools & Function Calling:  
  https://platform.openai.com/docs/guides/function-calling

- LangChain JS Tools & Agents:  
  https://js.langchain.com/docs/modules/agents/tools/
