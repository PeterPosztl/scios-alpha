#!/usr/bin/env node
/**
 * Local Postgres for FD-002 when Docker is unavailable.
 * Matches infra/docker/docker-compose.infra.yml credentials.
 */
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const DATA_DIR = path.join(ROOT, ".local-postgres");
const PORT = Number(process.env.SCIOS_PG_PORT || 5432);
const PID_FILE = path.join(DATA_DIR, "postgres.pid");
const LOG_FILE = path.join(DATA_DIR, "postgres.log");

async function main() {
  const modPath = path.join(__dirname, "pg-runner", "node_modules", "embedded-postgres", "dist", "index.js");
  const { default: EmbeddedPostgres } = await import(pathToFileURL(modPath).href);
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (fs.existsSync(PID_FILE)) {
    const old = Number(fs.readFileSync(PID_FILE, "utf8").trim());
    if (old && !Number.isNaN(old)) {
      try {
        process.kill(old, 0);
        console.log(JSON.stringify({ ok: true, alreadyRunning: true, port: PORT, pid: old }));
        return;
      } catch {
        fs.unlinkSync(PID_FILE);
      }
    }
  }

  const pg = new EmbeddedPostgres({
    databaseDir: path.join(DATA_DIR, "data"),
    user: "scios",
    password: "scios_local",
    port: PORT,
    persistent: true,
  });

  await pg.initialise();
  await pg.start();
  await pg.createDatabase("scios");

  const client = pg.getPgClient("scios");
  await client.connect();
  await client.query("SELECT 1");
  await client.end();

  fs.writeFileSync(PID_FILE, String(process.pid));
  fs.appendFileSync(
    LOG_FILE,
    `[${new Date().toISOString()}] embedded postgres started pid=${process.pid} port=${PORT}\n`
  );

  console.log(
    JSON.stringify({
      ok: true,
      port: PORT,
      databaseUrl: `postgresql://scios:scios_local@localhost:${PORT}/scios`,
      pid: process.pid,
      dataDir: DATA_DIR,
    })
  );

  const shutdown = async () => {
    try {
      await pg.stop();
    } catch {
      /* ignore */
    }
    try {
      fs.unlinkSync(PID_FILE);
    } catch {
      /* ignore */
    }
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);

  if (process.argv.includes("--detach")) {
    const child = spawn(process.execPath, [fileURLToPath(import.meta.url)], {
      detached: true,
      stdio: "ignore",
      env: process.env,
      cwd: ROOT,
    });
    child.unref();
    return;
  }

  setInterval(() => {}, 60_000);
}

main().catch((e) => {
  console.error(JSON.stringify({ ok: false, error: e instanceof Error ? e.message : String(e) }));
  process.exit(1);
});
