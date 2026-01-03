/**
 * Day 30 — AI Engineer Mindset (Vanilla)
 */

type Problem = {
  requiresReasoning: boolean;
  deterministic: boolean;
  scale: "low" | "high";
};

function shouldUseGenAI(p: Problem): boolean {
  if (p.deterministic) return false;
  if (!p.requiresReasoning) return false;
  return true;
}

// Demo
const problem: Problem = {
  requiresReasoning: true,
  deterministic: false,
  scale: "high",
};

console.log("Use GenAI?", shouldUseGenAI(problem));