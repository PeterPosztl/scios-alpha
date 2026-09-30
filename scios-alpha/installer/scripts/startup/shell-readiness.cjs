"use strict";

/**
 * User-surface shell readiness — TCP alone is insufficient.
 */
const http = require("http");
const { shellEntryUrl, urlFor, controlPlaneUrl } = require("./runtime-services.cjs");

function get(urlString, timeoutMs = 2500) {
  return new Promise((resolve) => {
    let u;
    try {
      u = new URL(urlString);
    } catch (e) {
      return resolve({ status: 0, error: String(e.message || e) });
    }
    const req = http.get(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        timeout: timeoutMs,
        family: 4,
      },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          resolve({
            status: res.statusCode || 0,
            body: Buffer.concat(chunks).toString("utf8"),
            contentType: res.headers["content-type"] || "",
          });
        });
      }
    );
    req.on("error", (e) => resolve({ status: 0, error: e.message }));
    req.on("timeout", () => {
      req.destroy();
      resolve({ status: 0, error: "timeout" });
    });
  });
}

/**
 * @returns {Promise<{ready:boolean, checks:object, shellUrl:string}>}
 */
async function probeShellReady(config) {
  const shellUrl = shellEntryUrl(config);
  const healthz = urlFor("shell", config, "/healthz");
  const cpHealth = urlFor("control-plane", config, "/healthz");
  const cpReady = urlFor("control-plane", config, "/readyz");
  const homeApi = urlFor("control-plane", config, "/v1/home");
  const sessionApi = urlFor("control-plane", config, "/v1/os/session");

  const [hz, root, cph, cpr, home, session] = await Promise.all([
    get(healthz),
    get(shellUrl),
    get(cpHealth),
    get(cpReady),
    get(homeApi),
    get(sessionApi),
  ]);

  let hzBody = null;
  try {
    hzBody = JSON.parse(hz.body || "{}");
  } catch {
    /* */
  }

  const checks = {
    shellProcessHealthy: hz.status === 200 && !!hzBody?.ok && hzBody?.shell === true,
    rootRouteHtml:
      root.status === 200 &&
      /text\/html/i.test(root.contentType || "") &&
      /SCI OS/i.test(root.body || "") &&
      !/not_found/i.test(root.body || ""),
    controlPlaneReachable: cph.status === 200,
    controlPlaneReady: cpr.status === 200 && /"ready"\s*:\s*true/.test(cpr.body || ""),
    productHomeApi: home.status === 200,
    sessionBootstrap: session.status === 200,
  };

  const ready = Object.values(checks).every(Boolean);

  return {
    ready,
    SHELL_READY: ready,
    USER_SHELL_REACHABLE: checks.rootRouteHtml,
    HOME_RENDERED: checks.rootRouteHtml,
    shellUrl,
    controlPlaneUrl: controlPlaneUrl(config),
    checks,
  };
}

module.exports = { probeShellReady, get };
