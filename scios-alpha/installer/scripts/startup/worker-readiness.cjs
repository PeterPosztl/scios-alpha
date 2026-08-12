"use strict";

/**
 * Worker readiness for ALPHA.
 * Queue workers ABSENT unless REDIS_URL configured and heartbeat exists.
 */
function assessWorkerReadiness(opts = {}) {
  const redis = opts.redis || {};
  const requiredWorkers = opts.requiredWorkers || [];
  const optionalWorkers = opts.optionalWorkers || [
    "prediction-engine",
    "risk-engine",
    "execution-simulator",
  ];

  const workers = {};
  for (const name of requiredWorkers) {
    workers[name] = {
      required: true,
      ready: false,
      heartbeat: null,
      status: "ABSENT",
      failureClass: "WORKER_CRASHED",
    };
  }
  for (const name of optionalWorkers) {
    workers[name] = {
      required: false,
      ready: false,
      heartbeat: null,
      status: redis.configured ? "OPTIONAL_UNSTARTED" : "ABSENT_NO_REDIS",
      lastSuccessfulJobAt: null,
      consumerRegistered: false,
      failureCounter: 0,
      dlqStatus: "n/a",
    };
  }

  const requiredReady = requiredWorkers.every((n) => workers[n]?.ready);
  const optionalDown = optionalWorkers.filter((n) => !workers[n]?.ready);

  return {
    redisConfigured: !!redis.configured,
    redisReachable: !!redis.reachable,
    workers,
    requiredReady,
    readiness: requiredReady,
    degraded: requiredReady && optionalDown.length > 0,
    status: requiredWorkers.length
      ? requiredReady
        ? "READY"
        : "NOT_READY"
      : "ABSENT_QUEUE_WORKERS",
    note: "ALPHA has no BullMQ workers; optional FastAPI engines are not supervised here",
    affectedUiActions: optionalDown.length
      ? ["legacy_http_predict_path"]
      : [],
  };
}

module.exports = { assessWorkerReadiness };
