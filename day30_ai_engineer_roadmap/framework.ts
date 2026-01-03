/**
 * Day 30 — AI Engineer Mindset (Framework Style)
 */

class AIEngineer {
  decide(problem: {
    reasoning: boolean;
    deterministic: boolean;
    costSensitive: boolean;
  }) {
    if (problem.deterministic) return "Use traditional code";
    if (!problem.reasoning) return "Use rules or search";
    if (problem.costSensitive) return "Use RAG + cheap model";
    return "Use strong model with guardrails";
  }
}

// Demo
const engineer = new AIEngineer();
console.log(
  engineer.decide({
    reasoning: true,
    deterministic: false,
    costSensitive: true,
  })
);