
# Day 3 — Models & LLMs: Tokens, Context, Temperature & All Key Parameters

## 🎯 Goal
Understand what a **model** is, what makes an **LLM** unique, and how key inference parameters (temperature, top‑p, penalties, stop sequences, etc.) shape the model’s behavior.

---

## 🤖 What is a Model?
A **model** is a trained mathematical function that makes predictions.

Examples:
- Vision model → predicts objects in images  
- Speech model → predicts words  
- Recommendation model → predicts user interests  
- Language model → predicts the next text token  

Models learn patterns from training data and generalize to new situations.

---

## 🧠 What is an LLM?
An **LLM (Large Language Model)** is a type of model trained on huge text datasets to predict the next token.

LLMs don’t truly “understand.” They:
- recognize patterns  
- map tokens to probabilities  
- generate the most likely continuation  

---

## 🧩 Tokens
Tokens are sub‑word pieces like “Hel”, “lo”, “world”.  
Token usage controls:
- cost  
- speed  
- context usage  
- memory allocation  

---

## 🧵 Context Window
An LLM can only “remember” a fixed number of tokens.  
If exceeded, earlier tokens get truncated.

---

## 🎨 Temperature
Controls randomness:
- Lower (0–0.3) → precise  
- Medium (~0.7) → balanced  
- High (1.0+) → creative  

---

## 🔧 Additional LLM Inference Parameters

### **Top‑p (Nucleus Sampling)**
Choose from tokens whose combined probabilities sum to p.  
Small p → safer, more focused.

### **Top‑k**
Choose only from the top k tokens.  
Smaller k → more deterministic.

### **Max Tokens**
Maximum length of the model's response.

### **Stop Sequences**
Force the model to stop when a pattern appears.

### **Frequency Penalty**
Reduces repetition in output.

### **Presence Penalty**
Encourages introducing new topics.

### **Logit Bias**
Adjust likelihood of specific tokens (force or suppress words).

### **Latency**
Total time it takes for the model to respond, influenced by:
- model size  
- token count  
- network latency  
- output length  

---

## 🧪 Demos Included

### 1) Vanilla TypeScript Demo
Simulates:
- tokenization  
- context truncation  
- temperature sampling  
- simple latency estimation  

Run:
```bash
npm run dev:day3:vanilla
```

### 2) LangChain Framework Demo
Shows:
- temperature 0 vs temperature 1  
- shorter outputs using `maxTokens`  

Run:
```bash
npm run dev:day3:framework
```

---

## 📚 References
- OpenAI Text Generation Parameters — https://platform.openai.com/docs/guides/text-generation  
- HuggingFace Generation Tutorial — https://huggingface.co/blog/how-to-generate  
- Anthropic API Parameters — https://docs.anthropic.com/en/api/messages  
- Top‑k & Top‑p Sampling Research — https://arxiv.org/abs/1904.09751  

---