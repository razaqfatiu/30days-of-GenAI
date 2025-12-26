/**
 * Day 28 — Production Monitoring & Reliability (Framework Style)
 */

class ObservabilityService {
  log(event: any) {
    console.log("OBS:", event);
  }
}

class QualityService {
  score(answer: string) {
    return answer.includes("not sure") ? 0.3 : 0.9;
  }
}

class KillSwitchRegistry {
  tools = true;
  disable(feature: "tools") {
    this[feature] = false;
  }
}

class IncidentService {
  constructor(
    private obs: ObservabilityService,
    private quality: QualityService,
    private kill: KillSwitchRegistry
  ) {}

  handle(answer: string) {
    const score = this.quality.score(answer);
    if (score < 0.5) {
      this.kill.disable("tools");
      this.obs.log({ incident: "Quality regression", score });
    }
  }
}

// Demo
const obs = new ObservabilityService();
const quality = new QualityService();
const kill = new KillSwitchRegistry();
const incident = new IncidentService(obs, quality, kill);

incident.handle("I'm not sure about this");