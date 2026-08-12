"use strict";

const { httpGetJson } = require("./resolve-port.cjs");

async function healthGate(endpoints) {
  const components = {};
  const warnings = [];
  const blockers = [];

  for (const ep of endpoints) {
    const res = await httpGetJson(ep.url, ep.timeoutMs || 2000);
    const live = res.status > 0;
    const healthy = res.status === 200;
    components[ep.name] = {
      url: ep.url,
      live,
      healthy,
      status: res.status,
      body: res.body && typeof res.body === "object" ? res.body : null,
      required: !!ep.required,
      error: res.error || null,
    };
    if (ep.required && !healthy) {
      blockers.push(`${ep.name} not healthy`);
    } else if (!ep.required && !healthy) {
      warnings.push(`${ep.name} unavailable (optional)`);
    }
  }

  const requiredOk = Object.values(components)
    .filter((c) => c.required)
    .every((c) => c.healthy);
  const anyLive = Object.values(components).some((c) => c.live);

  return {
    live: anyLive,
    healthy: requiredOk,
    ready: requiredOk,
    degraded: requiredOk && warnings.length > 0,
    components,
    warnings,
    blockers,
  };
}

module.exports = { healthGate };
