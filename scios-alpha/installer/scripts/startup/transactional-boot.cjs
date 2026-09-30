"use strict";

/**
 * Transactional boot state machine — observable stages for SCI OS ×10.
 * Extends start-sci-os; does not replace ProcessSupervisor.
 * ALPHA_NON_PRODUCTION
 */

const fs = require("fs");
const path = require("path");
const http = require("http");
const { TIMEOUT_BUDGET_MS } = require("./timeout-budget.cjs");

const BOOT_STAGES = [
  "PRE_FLIGHT",
  "RESOLVE_RUNTIME",
  "RESOLVE_APP_ROOT",
  "VALIDATE_CONFIG",
  "CLAIM_RESOURCES",
  "START_CORE",
  "VERIFY_CORE",
  "START_EXPERIENCE",
  "VERIFY_HOME",
  "COMMIT_BOOT",
];

const FAILURE_PHASES = [
  "CLASSIFY",
  "ROLLBACK",
  "RELEASE_RESOURCES",
  "RECOVERY_SAFE_MODE",
  "EVIDENCE",
];

class TransactionalBoot {
  constructor(opts = {}) {
    this.correlationId = opts.correlationId || null;
    this.appRoot = opts.appRoot || null;
    this.diagDir = opts.diagDir || null;
    this.stages = [];
    this.current = null;
    this.failed = false;
    this.failure = null;
    this.browserAllowed = false;
    this.committed = false;
  }

  begin(stage, detail = {}) {
    const rec = {
      stage,
      status: "RUNNING",
      at: new Date().toISOString(),
      detail,
    };
    this.current = rec;
    this.stages.push(rec);
    return rec;
  }

  pass(detail = {}) {
    if (!this.current) return;
    this.current.status = "PASS";
    this.current.completedAt = new Date().toISOString();
    this.current.detail = { ...this.current.detail, ...detail };
    this.current = null;
  }

  fail(classification, detail = {}) {
    this.failed = true;
    if (this.current) {
      this.current.status = "FAIL";
      this.current.completedAt = new Date().toISOString();
      this.current.detail = { ...this.current.detail, ...detail, classification };
    }
    this.failure = {
      phases: FAILURE_PHASES,
      classification,
      detail,
      at: new Date().toISOString(),
    };
  }

  /** Home readiness probe — required before browser handoff. */
  async verifyHome({ cockpitPort, apiPort, timeoutMs = TIMEOUT_BUDGET_MS.homeVerify }) {
    this.begin("VERIFY_HOME", { cockpitPort, apiPort });
    const homeOk = await probe(`http://127.0.0.1:${cockpitPort}/`, timeoutMs, {
      expected: [200],
      requireHtmlSciOs: true,
    });
    const apiHome = await probe(`http://127.0.0.1:${apiPort}/v1/home`, timeoutMs, {
      expected: [200],
      requireJsonSchema: "sci-os-home/v1",
    });
    if (!homeOk.ok) {
      this.fail("HOME_SHELL_UNREACHABLE", { homeOk, apiHome });
      this.browserAllowed = false;
      return { ok: false, homeOk, apiHome };
    }
    if (!apiHome.ok) {
      this.fail("HOME_API_UNREACHABLE", { homeOk, apiHome });
      this.browserAllowed = false;
      return { ok: false, homeOk, apiHome };
    }
    this.pass({ homeOk, apiHome });
    this.browserAllowed = true;
    return { ok: true, homeOk, apiHome };
  }

  /** Mark boot failed / rolled back — never COMMITTED after this. */
  markRolledBack(classification, detail = {}) {
    this.failed = true;
    this.committed = false;
    this.browserAllowed = false;
    this.failure = {
      phases: FAILURE_PHASES,
      classification,
      detail,
      at: new Date().toISOString(),
      state: "ROLLED_BACK",
    };
  }

  commit(detail = {}) {
    this.begin("COMMIT_BOOT", detail);
    if (this.failed) {
      this.fail("COMMIT_REJECTED_PRIOR_FAILURE", detail);
      this.committed = false;
      return false;
    }
    this.pass({ ...detail, browserHandoffAllowed: this.browserAllowed });
    this.committed = true;
    return true;
  }

  snapshot() {
    return {
      schema: "sci-os-transactional-boot/v1",
      label: "ALPHA_NON_PRODUCTION",
      correlationId: this.correlationId,
      appRoot: this.appRoot,
      expectedStages: BOOT_STAGES,
      stages: this.stages,
      failed: this.failed,
      failure: this.failure,
      browserAllowed: this.browserAllowed,
      committed: this.committed,
      policy: "No browser handoff before VERIFY_HOME PASS",
    };
  }

  writeEvidence() {
    if (!this.diagDir) return null;
    try {
      fs.mkdirSync(this.diagDir, { recursive: true });
      const fp = path.join(this.diagDir, "transactional-boot.json");
      fs.writeFileSync(fp, JSON.stringify(this.snapshot(), null, 2) + "\n");
      return fp;
    } catch {
      return null;
    }
  }
}

function acceptedStatus(statusCode, expected = [200]) {
  return expected.includes(Number(statusCode));
}

function probe(url, timeoutMs, opts = {}) {
  const expected = opts.expected || [200];
  return new Promise((resolve) => {
    const t = setTimeout(
      () => resolve({ ok: false, error: "timeout", url, status: 0 }),
      timeoutMs
    );
    try {
      const req = http.get(url, { timeout: timeoutMs }, (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () => {
          clearTimeout(t);
          const status = res.statusCode || 0;
          const body = Buffer.concat(chunks).toString("utf8");
          const contentType = String(res.headers["content-type"] || "");
          let ok = acceptedStatus(status, expected);
          let reason = null;
          if (!ok) {
            reason = status === 404 ? "HTTP_404_NOT_READY" : `HTTP_${status}_NOT_READY`;
          }
          if (ok && opts.requireHtmlSciOs) {
            if (!/text\/html/i.test(contentType) || !/SCI OS/i.test(body)) {
              ok = false;
              reason = "HOME_HTML_CONTRACT_FAIL";
            }
          }
          if (ok && opts.requireJsonSchema) {
            try {
              const j = JSON.parse(body || "{}");
              if (j.schema !== opts.requireJsonSchema) {
                ok = false;
                reason = "HOME_API_SCHEMA_FAIL";
              }
            } catch {
              ok = false;
              reason = "HOME_API_JSON_FAIL";
            }
          }
          resolve({ ok, status, url, bodyPreview: body.slice(0, 200), reason });
        });
      });
      req.on("error", (e) => {
        clearTimeout(t);
        resolve({
          ok: false,
          error: String(e.message || e),
          url,
          status: 0,
          reason: "CONNECTION_REFUSED_OR_ERROR",
        });
      });
    } catch (e) {
      clearTimeout(t);
      resolve({
        ok: false,
        error: String(e.message || e),
        url,
        status: 0,
        reason: "PROBE_EXCEPTION",
      });
    }
  });
}

module.exports = {
  BOOT_STAGES,
  FAILURE_PHASES,
  TransactionalBoot,
  acceptedStatus,
  probe,
};
