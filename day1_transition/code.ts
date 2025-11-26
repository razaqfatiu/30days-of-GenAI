// day1_transition/code.ts
// Goal: Show the difference between deterministic programming and probabilistic (AI-like) behavior
// Run: npx ts-node day1_transition/code.ts

// 1) Traditional deterministic function: same input -> same output
function greetUser(name: string): string {
  // We return a fixed template string; no randomness or learning happens here
  return `Hello, ${name}!`;
}

// 2) "AI-like" behavior (simulated): same input -> possibly different outputs
//    We emulate variability using random selection to illustrate non-determinism.
function aiGreetUser(name: string, mood: "happy" | "sad"): string {
  // A tiny "response table" keyed by mood; in real AI this would be learned behavior
  const responses = {
    happy: [
      `Hey ${name}! Great to see you 😄`,
      `Hello ${name}! Feeling awesome today?`,
      `Hi ${name}! Hope your day's going great!`,
    ],
    sad: [
      `Hi ${name}... hope you're okay 💛`,
      `Hey ${name}, sending good vibes your way.`,
      `Hello ${name}. I'm here if you need a boost.`,
    ],
  } as const;

  // Select the appropriate array using the mood provided
  const choices = responses[mood];

  // Pick a random index between 0 and choices.length - 1
  const idx = Math.floor(Math.random() * choices.length);

  // Return that randomly selected response
  return choices[idx];
}

// --- Demo ---

// Deterministic: will always print the same exact string
console.log(greetUser("Ada"));

// Probabilistic (simulated): could print one of several options
console.log(aiGreetUser("Ada", "happy"));
console.log(aiGreetUser("Ada", "sad"));