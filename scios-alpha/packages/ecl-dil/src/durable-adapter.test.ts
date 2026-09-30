import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createEclDilRuntime } from "./runtime.js";
import { DURABLE_ADAPTER_HOOKS } from "./durable-adapter.js";
import { CLIENT_SUITE_HOOKS } from "./client-suite.js";

const require = createRequire(import.meta.url);
const adapterPath = join(dirname(fileURLToPath(import.meta.url)), "../../data-fabric/adapter/ecl-ledger-adapter.cjs");

test("durable adapter retry + infra stays DEGRADED without live Postgres", async () => {
  const { createEclLedgerAdapter, withRetry } = require(adapterPath) as {
    createEclLedgerAdapter: (opts?: object) => {
      connect: () => Promise<{ optionalInfra: string; ready: boolean; autoTrade: boolean; livePostgres: boolean; fabric: string }>;
      insertLedger: (row: object) => Promise<{ durable: boolean }>;
      status: () => { optionalInfra: string; ready: boolean };
    };
    withRetry: <T>(fn: (i: number) => Promise<T>, opts: { attempts: number; baseMs: number; maxMs: number }) => Promise<T>;
  };

  let fails = 0;
  const value = await withRetry(
    async () => {
      fails += 1;
      if (fails < 3) throw new Error("transient");
      return 7;
    },
    { attempts: 3, baseMs: 1, maxMs: 4 }
  );
  assert.equal(value, 7);
  assert.equal(fails, 3);

  const adapter = createEclLedgerAdapter({ connectionString: "" });
  const st = await adapter.connect();
  assert.equal(st.ready, false);
  assert.equal(st.autoTrade, false);
  assert.equal(st.livePostgres, false);
  assert.equal(st.optionalInfra, "OPTIONAL_INFRA_DEGRADED");
  assert.equal(st.fabric, "ALPHA_ADAPTER");
  const insert = await adapter.insertLedger({ ts: new Date().toISOString(), kind: "DECISION", instrumentId: "x", payload: {} });
  assert.equal(insert.durable, false);

  const rt = createEclDilRuntime();
  const infra = rt.durableInfra();
  assert.equal(infra.ready, false);
  assert.equal(infra.autoTrade, false);
  assert.equal(infra.betaFabric, false);
  assert.equal(infra.optionalInfra, "OPTIONAL_INFRA_DEGRADED");
  assert.equal(infra.pgDriver, "ABSENT");
  assert.equal(infra.durableLineage, false);
  assert.equal(infra.daemon.running, false);
  assert.equal(infra.daemon.enabledInBoot, false);
  assert.equal(DURABLE_ADAPTER_HOOKS.ready, false);
  assert.equal(CLIENT_SUITE_HOOKS.daemon.wiredIntoBoot, false);
  assert.equal(CLIENT_SUITE_HOOKS.desktop.appHostOverride, false);
  assert.equal(CLIENT_SUITE_HOOKS.desktop.status, "REFUSED");
  assert.equal(CLIENT_SUITE_HOOKS.cli.suite, "SCI_CLI_SUITE_V2");
});
