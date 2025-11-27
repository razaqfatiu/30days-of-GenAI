// day2_ai_ecosystem/code.ts
// Simulate collaboration between Data Scientists, ML Engineers, and AI Engineers.

interface DataScientist {
  analyzeData(data: number[]): string;
}

interface MLEngineer {
  deployModel(modelName: string): string;
}

interface AIEngineer {
  integrateModel(modelName: string, app: string): string;
}

class DataScientistImpl implements DataScientist {
  analyzeData(data: number[]): string {
    const mean = data.reduce((a, b) => a + b, 0) / data.length;
    return `📊 Data Scientist → Processed ${data.length} samples (mean = ${mean.toFixed(2)}).`;
  }
}

class MLEngineerImpl implements MLEngineer {
  deployModel(modelName: string): string {
    return `🚀 ML Engineer → Deployed model '${modelName}' to cloud serving.`;
  }
}

class AIEngineerImpl implements AIEngineer {
  integrateModel(modelName: string, app: string): string {
    return `🤖 AI Engineer → Integrated '${modelName}' into the ${app} frontend for live use.`;
  }
}

function simulateTeam() {
  const ds = new DataScientistImpl();
  const ml = new MLEngineerImpl();
  const ai = new AIEngineerImpl();

  console.log(ds.analyzeData([10, 20, 30, 40, 50]));
  console.log(ml.deployModel("InsightGen-v1"));
  console.log(ai.integrateModel("InsightGen-v1", "Business Dashboard"));
}

simulateTeam();