# Day 17 — Multi-Agent Systems: Architectures, Roles, Messaging & Supervision

## 🔄 Connecting Day 16 → Day 17

Day 16 showed how one agent can call many tools.

But in real-world AI engineering, we rarely rely on a single agent with all responsibilities.
Instead, we build **teams of agents**, each one specializing in a specific skill, orchestrated by a **supervisor**.

This is the foundation behind:

- OpenAI Agents
- LangGraph
- CrewAI
- AutoGen
- Devin (AI engineer)
- Anthropic’s Constitutional AI setups

---

# 🧠 Why Multi-Agent Systems?

Single agents struggle with:

- Hallucination
- Over-generalization
- Inconsistent reasoning
- Hard-to-debug workflows

Multi-agent systems solve these by:

- Breaking complex tasks into roles
- Reducing cognitive load per agent
- Applying routing & specialization
- Enabling parallelism
- Improving transparency

---

# 🏗️ Architectural Pattern

User Request  
↓  
Supervisor Agent  
↓─────────────┬─────────────┬──────────────┐  
Research Agent Math Agent Date Agent Writer Agent  
↓─────────────┴─────────────┴──────────────┘  
Final synthesized answer

## Roles:

### 🧑‍💼 Supervisor Agent

- Understands the user request
- Chooses which agent(s) to delegate to
- Merges results
- Ensures message format consistency

### 🧑‍🔬 Research Agent

- Retrieves factual data
- Reads chunked documents
- Interfaces with vector search (Day 9)

### 🔢 Math Agent

- Performs deterministic calculations
- Eliminates hallucinated math

### 📅 Date Agent

- Supplies current ISO time
- Guaranteed correctness

### ✍️ Writer Agent

- Crafts final answer
- Ensures tone, clarity, formatting
- Summarizes other agents’ outputs

---

# 📨 Messaging Protocol

Agents communicate using **structured messages**:

```jsonc
{
  "sender": "research_agent",
  "task": "fetch_domain_knowledge",
  "input": "chunking",
  "output": ["Chunking divides text into smaller units..."],
  "status": "success"
}
```

---

# 📂 Files in Day 17

- README.md — this guide
- code.ts — pure TypeScript multi-agent orchestrator
- framework.ts — LangChain-based supervisor + writer agent

---

# 🚀 Run Scripts

```jsonc
"dev:day17:vanilla": "tsx day17_multi_agent_systems/code.ts",
"dev:day17:framework": "tsx day17_multi_agent_systems/framework.ts"
```

---

# 📚 References

- LangGraph Agents  
  https://js.langchain.com/docs/langgraph
- AutoGen Multi-Agent Framework  
  https://microsoft.github.io/autogen
- CrewAI Agent Patterns  
  https://www.crewai.com/
- OpenAI Agents  
  https://platform.openai.com/docs
