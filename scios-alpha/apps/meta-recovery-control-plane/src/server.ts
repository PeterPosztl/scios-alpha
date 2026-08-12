/**
 * Meta-Recovery Control Plane — Recovery Shell / operator workspace (Profile D)
 * Independent of PostgreSQL / Redis / full desktop.
 */
import http from "node:http";
import { readFileSync, existsSync } from "node:fs";
import { join, resolve } from "node:path";

const PORT = Number(process.env.META_RECOVERY_PORT || 5299);
const APP_ROOT = resolve(process.env.SCI_APP_ROOT || join(import.meta.dirname, "../../.."));

function readMeta(name: string) {
  const p = join(APP_ROOT, "diagnostics-export", "meta-recovery", name);
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function htmlPage() {
  const proof = readMeta("meta-recovery-proof.json");
  const twin = readMeta("startup-digital-twin.json");
  const ranking = readMeta("root-cause-ranking.json");
  const attempts = readMeta("repair-attempts.json");
  const blockers = readMeta("external-blocker-report.json");
  const memory = readMeta("recovery-memory.json");
  const graph = readMeta("dependency-graph.json");

  const verdict = proof?.verdict ?? "UNKNOWN";
  const successBeforeProof = false;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>SCI OS ×10 — Meta-Recovery Cockpit</title>
  <style>
    :root { --snow:#F7F8FA; --fog:#E8ECF0; --graphite:#2C333A; --navy:#0B1F33; --red:#C8102E; --ice:#4A90A4; }
    * { box-sizing: border-box; }
    body { margin:0; font-family: "SF Pro Text", "Segoe UI", system-ui, sans-serif; background: linear-gradient(165deg,#0B1F33 0%,#1a2f45 40%,#F7F8FA 40%); color: var(--graphite); min-height:100vh; }
    header { padding: 2rem 2.5rem 1rem; color: #F7F8FA; }
    header h1 { font-size: 1.75rem; font-weight: 600; letter-spacing: -0.02em; margin:0; }
    header p { opacity:0.85; margin:0.4rem 0 0; font-size:0.95rem; }
    .verdict { display:inline-block; margin-top:1rem; padding:0.35rem 0.75rem; border:1px solid rgba(255,255,255,0.35); font-size:0.8rem; letter-spacing:0.04em; }
    main { padding: 1.5rem 2.5rem 3rem; display:grid; grid-template-columns: repeat(auto-fill,minmax(280px,1fr)); gap:1rem; }
    section { background: var(--snow); border:1px solid var(--fog); padding:1rem 1.1rem; }
    section h2 { margin:0 0 0.6rem; font-size:0.75rem; text-transform:uppercase; letter-spacing:0.08em; color: var(--ice); }
    pre { margin:0; font-size:0.72rem; white-space:pre-wrap; word-break:break-word; max-height:220px; overflow:auto; color: var(--navy); }
    .note { grid-column:1/-1; font-size:0.85rem; color:#555; }
  </style>
</head>
<body>
  <header>
    <h1>SCI OS ×10 Meta-Recovery</h1>
    <p>Recovery Shell — Profile D · no Postgres/Redis required</p>
    <div class="verdict">VERDICT: ${verdict}${successBeforeProof ? "" : ""}</div>
  </header>
  <main>
    <section><h2>1. Startup State</h2><pre>${esc(JSON.stringify(proof?.state ?? "NO_PROOF", null, 2))}</pre></section>
    <section><h2>2. Capability Graph</h2><pre>${esc(JSON.stringify(graph?.nodes ?? [], null, 2))}</pre></section>
    <section><h2>3. Dependency Failures</h2><pre>${esc(JSON.stringify(twin?.missingRequired ?? [], null, 2))}</pre></section>
    <section><h2>4. Root-Cause Hypotheses</h2><pre>${esc(JSON.stringify((ranking?.ranked ?? []).slice(0, 5), null, 2))}</pre></section>
    <section><h2>5–7. Repair / Rollback</h2><pre>${esc(JSON.stringify(attempts?.attempts ?? [], null, 2))}</pre></section>
    <section><h2>8. Recovery Memory</h2><pre>${esc(JSON.stringify({ entries: (memory?.entries ?? []).length }, null, 2))}</pre></section>
    <section><h2>9. External Blockers</h2><pre>${esc(JSON.stringify(blockers?.blockers ?? [], null, 2))}</pre></section>
    <section><h2>10–12. Proof / Safe Mode / Bundle</h2><pre>${esc(JSON.stringify({ verdict, proofAt: proof?.at, out: "diagnostics-export/meta-recovery/" }, null, 2))}</pre></section>
    <p class="note">Success UI is never shown before proof artifacts exist. Canonical startup pack remains installer/scripts/start-sci-os.cjs.</p>
  </main>
</body>
</html>`;
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const server = http.createServer((req, res) => {
  if (req.url === "/healthz") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify({ ok: true, service: "meta-recovery-control-plane" }));
    return;
  }
  if (req.url === "/api/proof") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(readMeta("meta-recovery-proof.json") ?? { verdict: "UNKNOWN" }));
    return;
  }
  res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
  res.end(htmlPage());
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`Meta-Recovery Control Plane http://127.0.0.1:${PORT}`);
});
