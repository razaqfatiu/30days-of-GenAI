/**
 * Day 28 — Production Monitoring & Reliability (Vanilla)
 */

type Metric = { latencyMs: number; costUsd: number; quality: number };

class Observability {
  logs: any[] = [];
  log(event: any) {
    this.logs.push(event);
    console.log("LOG:", event);
  }
}

class QualityMonitor {
  isLowQuality(m: Metric) {
    return m.quality < 0.6;
  }
}

class KillSwitch {
  tools = true;
  disableTools() { this.tools = false; }
}

class IncidentManager {
  constructor(
    private quality: QualityMonitor,
    private kill: KillSwitch,
    private obs: Observability
  ) {}

  evaluate(metrics: Metric) {
    if (this.quality.isLowQuality(metrics)) {
      this.kill.disableTools();
      this.obs.log({ incident: "Low quality detected", metrics });
    }
  }
}

// Demo
const obs = new Observability();
const quality = new QualityMonitor();
const kill = new KillSwitch();
const incident = new IncidentManager(quality, kill, obs);

incident.evaluate({ latencyMs: 900, costUsd: 0.03, quality: 0.4 });