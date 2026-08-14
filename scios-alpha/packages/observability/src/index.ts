type LogLevel = "info" | "warn" | "error" | "debug";

const SECRET_KEY =
  /password|secret|api[_-]?key|token|authorization|credential/i;

export function redactLogMeta(
  meta?: Record<string, unknown>
): Record<string, unknown> | undefined {
  if (!meta) return meta;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(meta)) {
    out[k] = SECRET_KEY.test(k) ? "[REDACTED]" : v;
  }
  return out;
}

function emit(
  service: string,
  level: LogLevel,
  message: string,
  meta?: Record<string, unknown>
): void {
  const line = JSON.stringify({
    ts: new Date().toISOString(),
    service,
    level,
    message,
    ...redactLogMeta(meta),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function createLogger(service: string) {
  return {
    info: (message: string, meta?: Record<string, unknown>) =>
      emit(service, "info", message, meta),
    warn: (message: string, meta?: Record<string, unknown>) =>
      emit(service, "warn", message, meta),
    error: (message: string, meta?: Record<string, unknown>) =>
      emit(service, "error", message, meta),
    debug: (message: string, meta?: Record<string, unknown>) =>
      emit(service, "debug", message, meta),
  };
}

const counters = new Map<string, number>();
const timings = new Map<string, number[]>();

export const metrics = {
  inc(name: string, by = 1): void {
    counters.set(name, (counters.get(name) ?? 0) + by);
  },
  timing(name: string, ms: number): void {
    const arr = timings.get(name) ?? [];
    arr.push(ms);
    timings.set(name, arr);
  },
  snapshot(): {
    counters: Record<string, number>;
    timings: Record<string, number[]>;
  } {
    return {
      counters: Object.fromEntries(counters),
      timings: Object.fromEntries(timings),
    };
  },
  reset(): void {
    counters.clear();
    timings.clear();
  },
};

export * from "./event-bus.js";
export * from "./seeded-rng.js";
