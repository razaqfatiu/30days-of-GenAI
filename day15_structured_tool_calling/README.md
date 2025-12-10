
# Day 15 — Structured Tool Calling (OpenAI Tools API + Agent Tools)

## 🔄 Connection To Previous Days

- **Day 11** – You built a working RAG pipeline.  
- **Day 12** – You measured RAG quality, latency, and cost.  
- **Day 13** – You added guardrails, safety, and fallbacks.  
- **Day 14** – You turned the LLM into an **Agent** using the ReAct pattern.

In Day 14, the LLM wrote tool calls in free-form text like:

```text
Action: calculator
Action Input: {"a": 2, "b": 3, "op": "add"}
```

Great for learning, but risky for production. Today we switch to **structured tool calling**.

---

## 🎯 Goal of Day 15

Teach the model to call tools via **machine-readable JSON**, using the **OpenAI tools API (new style)**.

You’ll learn:

- How to define tools with JSON-like schemas  
- How OpenAI returns `tool_calls`  
- How to dispatch those calls to local TypeScript functions  
- How to send tool results back and force a final answer  
- How LangChain builds on the same concept

We implement three tools:

1. `calculator` – arithmetic  
2. `vector_search` – simple search over Day 9 JSON store  
3. `current_date` – returns current ISO datetime  

---

## 🧩 What Is Structured Tool Calling?

Instead of the LLM guessing a tool call as plain text, we give it **tool definitions**:

```ts
const tools = [
  {
    type: "function",
    function: {
      name: "calculator",
      description: "Perform basic arithmetic",
      parameters: {
        type: "object",
        properties: {
          a: { type: "number" },
          b: { type: "number" },
          op: { type: "string", enum: ["add", "sub", "mul", "div"] }
        },
        required: ["a", "b", "op"]
      }
    }
  }
];
```

The model can now respond with structured tool calls:

```json
{
  "tool_calls": [
    {
      "id": "call_1",
      "type": "function",
      "function": {
        "name": "calculator",
        "arguments": "{\"a\": 3, \"b\": 4, \"op\": \"add\"}"
      }
    }
  ]
}
```

Your TypeScript code:

1. Parses `function.name` and `function.arguments`  
2. Calls your local implementation  
3. Sends a `tool` message back with the result  
4. Calls the model again (with `tool_choice: "none"`) to get the final answer

---

## 🛠️ Tools Implemented Today

### 1️⃣ `calculator`

- **Input:**
  ```json
  { "a": number, "b": number, "op": "add" | "sub" | "mul" | "div" }
  ```
- Handles invalid op and division by zero gracefully.

---

### 2️⃣ `vector_search`

- Reads `../day09_ingestion_pipeline/day09_local_ingestion_store.json`
- **Input:**
  ```json
  { "query": string }
  ```
- Very simple: filters records whose `text` includes the query string (case-insensitive) and returns top 3 matches.

> Note: This is not a full similarity search; the goal here is **tool calling**, not vector math.

---

### 3️⃣ `current_date`

- **Input:**
  ```json
  {}
  ```
- Returns:
  ```json
  { "iso": "2025-12-10T12:34:56.789Z" }
  ```

---

## 📂 Files in `day15_structured_tool_calling`

### ✅ `code.ts` — Vanilla Structured Tool Calling

Flow:

1. Build `messages` with:
   - a system prompt (explaining that tools are available)  
   - a user question that needs multiple tools:
     - explain chunking (docs)
     - provide the current date
     - compute 3 * 7
2. Call OpenAI with:
   - `tools: [...]`
   - `tool_choice: "auto"`
3. If `tool_calls` are present:
   - Run each tool locally (calculator, vector_search, current_date)
   - Append `tool` messages to `messages`
4. Call OpenAI again with:
   - `tool_choice: "none"`
   - so the model must produce a natural language answer using tool results
5. Log:
   - which tools were called
   - their arguments and outputs
   - the final answer

---

### ✅ `framework.ts` — LangChain Agent with Tools

Uses:

- `ChatOpenAI`
- `tool()` from `@langchain/core/tools`
- `createReactAgent` and `AgentExecutor` from `langchain/agents`

LangChain handles:

- selecting tools  
- structuring arguments  
- calling tools  
- injecting observations back into the model  
- returning a final `output` string

You see the same three tools exposed as LangChain tools.

---

## 🚀 How To Run

Add to your root `package.json`:

```jsonc
"dev:day15:vanilla": "tsx day15_structured_tool_calling/code.ts",
"dev:day15:framework": "tsx day15_structured_tool_calling/framework.ts"
```

Then run:

```bash
npm run dev:day15:vanilla
npm run dev:day15:framework
```

Requirements:

- Day 9 JSON file present: `day09_ingestion_pipeline/day09_local_ingestion_store.json`  
- `.env` contains a valid `OPENAI_API_KEY`

---

## 🔑 .env Sample

```bash
OPENAI_API_KEY=your_openai_key_here
```

---

## 📚 References

- OpenAI Tools & Function Calling:  
  https://platform.openai.com/docs/guides/function-calling  

- LangChain JS Tools & Agents:  
  https://js.langchain.com/docs/modules/agents/tools/  
