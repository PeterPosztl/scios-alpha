export interface ExperimentRun {
  runId: string;
  name: string;
  startedAt: string;
  endedAt?: string;
  metrics: Record<string, number[]>;
  status: "running" | "completed";
}

export class InMemoryExperimentTracker {
  private runs = new Map<string, ExperimentRun>();
  private seq = 0;

  startRun(name: string): string {
    const runId = `run-${++this.seq}`;
    this.runs.set(runId, {
      runId,
      name,
      startedAt: new Date().toISOString(),
      metrics: {},
      status: "running",
    });
    return runId;
  }

  logMetric(runId: string, name: string, value: number): void {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    if (!run.metrics[name]) run.metrics[name] = [];
    run.metrics[name].push(value);
  }

  endRun(runId: string): ExperimentRun {
    const run = this.runs.get(runId);
    if (!run) throw new Error(`Unknown run: ${runId}`);
    run.status = "completed";
    run.endedAt = new Date().toISOString();
    return run;
  }

  getRun(runId: string): ExperimentRun | undefined {
    return this.runs.get(runId);
  }
}

export const experimentTracker = new InMemoryExperimentTracker();
