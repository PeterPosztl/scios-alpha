import { createServer } from "node:http";

const PORT = Number(process.env.PORT ?? process.env.SCIOS_COCKPIT_PORT ?? 4000);
const CONTROL_URL =
  process.env.CONTROL_URL ?? "http://127.0.0.1:3000";

const HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>SCI OS ×10 — Cockpit 2.0</title>
  <style>
    :root {
      --snow:#F7F8FA; --fog:#E8ECF0; --graphite:#2C333A; --navy:#0B1F33;
      --ice:#D6E4F0; --red:#C8102E; --ok:#1B7A4E; --warn:#B45309;
    }
    * { box-sizing: border-box; }
    body { margin:0; font-family:"SF Pro Text","Segoe UI",system-ui,sans-serif; color:var(--navy);
      background: linear-gradient(180deg,var(--snow),var(--fog)); min-height:100vh; }
    header { display:flex; justify-content:space-between; align-items:flex-end; gap:1rem;
      padding:1.25rem 1.5rem 0.75rem; border-bottom:1px solid var(--fog); background:#fff; }
    header h1 { margin:0; font-size:1.25rem; font-weight:600; letter-spacing:-0.02em; }
    header p { margin:0.2rem 0 0; font-size:0.78rem; color:var(--graphite); }
    .badge { font-size:0.7rem; letter-spacing:0.06em; padding:0.25rem 0.5rem; border:1px solid var(--fog); }
    .badge.ok { color:var(--ok); } .badge.warn { color:var(--warn); } .badge.err { color:var(--red); }
    nav { display:flex; gap:0.25rem; padding:0.5rem 1.5rem; background:#fff; border-bottom:1px solid var(--fog); flex-wrap:wrap; }
    nav button { border:0; background:transparent; padding:0.45rem 0.7rem; cursor:pointer; font-size:0.78rem;
      letter-spacing:0.04em; text-transform:uppercase; color:var(--graphite); }
    nav button.on { color:var(--navy); border-bottom:2px solid var(--navy); }
    main { max-width:1200px; margin:0 auto; padding:1.25rem 1.5rem 3rem; }
    .view { display:none; } .view.on { display:block; }
    .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:0.85rem; }
    .card { background:#fff; border:1px solid var(--fog); padding:0.9rem 1rem; }
    .card h2 { margin:0 0 0.6rem; font-size:0.72rem; text-transform:uppercase; letter-spacing:0.08em; color:var(--graphite); }
    pre { margin:0; font:0.72rem/1.45 ui-monospace,Menlo,Consolas,monospace; white-space:pre-wrap; word-break:break-word;
      max-height:280px; overflow:auto; }
    .pipe { display:flex; flex-wrap:wrap; gap:0.35rem; }
    .stage { font-size:0.68rem; padding:0.3rem 0.45rem; background:var(--ice); }
    .stage.done { background:#d9efe3; }
    form { display:grid; grid-template-columns:repeat(3,1fr) auto; gap:0.6rem; align-items:end; margin-bottom:1rem; }
    label { display:grid; gap:0.25rem; font-size:0.7rem; text-transform:uppercase; letter-spacing:0.05em; color:var(--graphite); }
    input { border:1px solid var(--fog); padding:0.55rem 0.65rem; }
    button.go { background:var(--navy); color:#fff; border:0; padding:0.6rem 1rem; cursor:pointer; height:2.4rem; }
    .why { font-size:0.85rem; color:var(--graphite); margin:0.5rem 0 0; }
    .banner { padding:0.6rem 1rem; background:#fff3f3; border:1px solid #f0c9c9; color:var(--red); margin-bottom:1rem; display:none; }
    @media (max-width:800px) { form { grid-template-columns:1fr; } }
  </style>
</head>
<body>
  <header>
    <div>
      <h1>SCI OS ×10 Cockpit 2.0</h1>
      <p id="flow">raw_event → … → cockpit_view</p>
    </div>
    <div id="verdict" class="badge warn">UNKNOWN</div>
  </header>
  <nav>
    <button class="on" data-v="dash">Dashboard</button>
    <button data-v="slice">Vertical Slice</button>
    <button data-v="lineage">Lineage Explorer</button>
    <button data-v="risk">Risk / Gov Studio</button>
    <button data-v="exec">Execution Monitor</button>
    <button data-v="health">System Health</button>
  </nav>
  <main>
    <div class="banner" id="banner"></div>

    <div class="view on" id="dash">
      <div class="grid">
        <div class="card"><h2>Readiness</h2><pre id="dashReady">—</pre></div>
        <div class="card"><h2>Worker</h2><pre id="dashWorker">—</pre></div>
        <div class="card"><h2>Last runs</h2><pre id="dashRuns">—</pre></div>
        <div class="card"><h2>Pipeline</h2><div class="pipe" id="dashPipe"></div></div>
      </div>
    </div>

    <div class="view" id="slice">
      <form id="form">
        <label>Instrument <input id="instrumentId" value="AAPL" required /></label>
        <label>Horizon (sec) <input id="horizonSec" type="number" value="3600" min="1" /></label>
        <label>Size <input id="size" type="number" value="10" step="0.01" /></label>
        <button class="go" type="submit" id="go">Run slice</button>
      </form>
      <p class="why" id="status"></p>
      <div class="grid">
        <div class="card"><h2>Normalized</h2><pre id="normalized">—</pre></div>
        <div class="card"><h2>PIT features</h2><pre id="features">—</pre></div>
        <div class="card"><h2>Prediction</h2><pre id="prediction">—</pre></div>
        <div class="card"><h2>Risk</h2><pre id="risk">—</pre></div>
        <div class="card"><h2>Governance</h2><pre id="decision">—</pre></div>
        <div class="card"><h2>Execution + outcome</h2><pre id="execution">—</pre></div>
      </div>
    </div>

    <div class="view" id="lineage">
      <div class="card"><h2>Immutable lineage</h2><pre id="lineagePre">Run a slice first.</pre></div>
    </div>
    <div class="view" id="risk">
      <div class="card"><h2>Risk decision + explanation</h2><pre id="riskStudio">—</pre></div>
      <p class="why" id="riskWhy">Every decision must cite the gate. No silent override.</p>
    </div>
    <div class="view" id="exec">
      <div class="card"><h2>Execution monitor</h2><pre id="execMon">SIMULATION_ONLY — no live money.</pre></div>
    </div>
    <div class="view" id="health">
      <div class="card"><h2>System snapshot</h2><pre id="healthPre">—</pre></div>
    </div>
  </main>
  <script>
    const CONTROL = ${JSON.stringify(CONTROL_URL)};
    const views = document.querySelectorAll(".view");
    document.querySelectorAll("nav button").forEach((b) => {
      b.onclick = () => {
        document.querySelectorAll("nav button").forEach((x) => x.classList.remove("on"));
        b.classList.add("on");
        views.forEach((v) => v.classList.toggle("on", v.id === b.dataset.v));
      };
    });
    function show(id, v) {
      const el = document.getElementById(id);
      if (el) el.textContent = v == null ? "—" : JSON.stringify(v, null, 2);
    }
    async function refresh() {
      try {
        const [ready, snap, flow, health, readiness] = await Promise.all([
          fetch(CONTROL + "/readyz").then((r) => r.json()),
          fetch(CONTROL + "/v1/system/snapshot").then((r) => r.json()),
          fetch(CONTROL + "/v1/flow").then((r) => r.json()),
          fetch(CONTROL + "/api/system/health").then((r) => r.json()),
          fetch(CONTROL + "/api/system/startup-readiness").then((r) => r.json()),
        ]);
        document.getElementById("flow").textContent = flow.arrow || "";
        const v = document.getElementById("verdict");
        const ok = !!ready.ready;
        v.textContent = ok ? "CORE READY (ALPHA)" : "NOT READY";
        v.className = "badge " + (ok ? "ok" : "err");
        document.getElementById("banner").style.display = ok ? "none" : "block";
        document.getElementById("banner").textContent = ok
          ? ""
          : "Recovery: backend not ready. Open Recovery Shell if startup failed. No silent data repair.";
        show("dashReady", { ready: ready.ready, profile: ready.profile, riskControl: ready.riskControl });
        show("dashWorker", ready.foundationWorkerDetail || ready.components);
        show("dashRuns", snap.runs);
        show("healthPre", { health, readiness, snapshot: snap });
        const pipe = document.getElementById("dashPipe");
        pipe.innerHTML = "";
        (flow.stages || []).forEach((s) => {
          const d = document.createElement("span");
          d.className = "stage";
          d.textContent = s;
          pipe.appendChild(d);
        });
      } catch (e) {
        document.getElementById("verdict").textContent = "UNREACHABLE";
        document.getElementById("verdict").className = "badge err";
        document.getElementById("banner").style.display = "block";
        document.getElementById("banner").textContent =
          "Control plane unreachable at " + CONTROL + " — Recovery Shell :5299";
      }
    }
    refresh();
    setInterval(refresh, 8000);

    document.getElementById("form").addEventListener("submit", async (e) => {
      e.preventDefault();
      const go = document.getElementById("go");
      const statusEl = document.getElementById("status");
      go.disabled = true;
      statusEl.textContent = "Running…";
      try {
        const res = await fetch(CONTROL + "/api/vertical-slice/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            instrumentId: document.getElementById("instrumentId").value.trim(),
            horizonSec: Number(document.getElementById("horizonSec").value),
            size: Number(document.getElementById("size").value),
          }),
        });
        const data = await res.json();
        show("normalized", data.normalizedEvent);
        show("features", data.pitFeatures);
        show("prediction", data.predictionEnvelope);
        show("risk", data.riskDecision);
        show("decision", data.governanceDecision);
        show("execution", data.executionOutcome);
        show("lineagePre", data.lineage);
        show("riskStudio", {
          risk: data.riskDecision,
          governance: data.governanceDecision,
          status: data.status,
        });
        show("execMon", data.executionOutcome);
        document.getElementById("riskWhy").textContent =
          (data.governanceDecision && data.governanceDecision.explanation) ||
          (data.governanceDecision && data.governanceDecision.verdict) ||
          "No explanation returned";
        statusEl.textContent = res.ok
          ? "OK " + data.runId + " — " + (data.status || data.governanceDecision?.verdict)
          : "HTTP " + res.status;
      } catch (err) {
        statusEl.textContent = String(err && err.message ? err.message : err);
      } finally {
        go.disabled = false;
      }
    });
  </script>
</body>
</html>
`;

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);

  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(HTML);
    return;
  }

  if (req.method === "GET" && url.pathname === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "@scios/cockpit-ui", controlUrl: CONTROL_URL, ux: "2.0" }));
    return;
  }

  res.writeHead(404, { "content-type": "application/json" });
  res.end(JSON.stringify({ error: "not_found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(
    JSON.stringify({
      ts: new Date().toISOString(),
      service: "cockpit-ui",
      level: "info",
      message: "listening",
      port: PORT,
      controlUrl: CONTROL_URL,
      ux: "2.0",
    })
  );
});
