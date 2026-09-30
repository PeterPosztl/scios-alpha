/**
 * Cockpit output encoding — XSS payloads must stay inert text.
 * ALPHA_NON_PRODUCTION
 */
const path = require("path");
const fs = require("fs");
const { pathToFileURL } = require("url");

const ROOT = path.resolve(__dirname, "../..");
const PAYLOADS = [
  "<script>alert(1)</script>",
  "<img src=x onerror=alert(1)>",
  '"><svg onload=alert(1)>',
];

async function main() {
  const mod = await import(
    pathToFileURL(path.join(ROOT, "apps/cockpit-ui/src/safe-dom.js")).href
  );
  const { escapeText } = mod;
  const src = fs.readFileSync(
    path.join(ROOT, "apps/cockpit-ui/src/index.js"),
    "utf8"
  );
  const innerHtml = (src.match(/\.innerHTML\s*=/g) || []).length;
  const results = PAYLOADS.map((p) => {
    const encoded = escapeText(p);
    const hasRawAngle = /[<>]/.test(encoded);
    return {
      payload: p,
      encoded,
      hasRawAngle,
      inert: !hasRawAngle,
    };
  });
  const ok = innerHtml === 0 && results.every((r) => r.inert);
  const out = {
    schema: "sci-os-cockpit-output-encoding-test/v1",
    label: "ALPHA_NON_PRODUCTION",
    ok,
    innerHtmlAssigns: innerHtml,
    surfaces: ["search", "entity", "analysis metadata", "evidence", "notifications"],
    results,
  };
  if (!ok) {
    console.error(JSON.stringify(out, null, 2));
    process.exit(1);
  }
  console.log(JSON.stringify(out, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
