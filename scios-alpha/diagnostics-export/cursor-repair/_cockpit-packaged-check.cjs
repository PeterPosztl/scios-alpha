
process.env.SCIOS_COCKPIT_AUTOSTART = "0";
const { pathToFileURL } = require("node:url");
const fs = require("node:fs");
const vm = require("node:vm");
const entry = process.argv[2];
const out = process.argv[3];
import(pathToFileURL(entry).href).then((mod) => {
  if (!mod.HTML || typeof mod.HTML !== "string") {
    console.error("COCKPIT_HTML_EXPORT_MISSING");
    process.exit(2);
  }
  const scripts = [];
  const re = /<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi;
  let m;
  while ((m = re.exec(mod.HTML))) {
    const attrs = m[0].slice(0, m[0].indexOf(">")).toLowerCase();
    if (/\bsrc\s*=/.test(attrs)) continue;
    scripts.push(m[1]);
  }
  if (!scripts.length) {
    console.error("COCKPIT_INLINE_SCRIPT_MISSING");
    process.exit(3);
  }
  scripts.forEach((source, index) => {
    new vm.Script(source, { filename: "packaged-inline-" + index + ".js" });
  });
  fs.writeFileSync(out, JSON.stringify({ scriptCount: scripts.length, htmlBytes: mod.HTML.length }));
  process.exit(0);
}).catch((e) => {
  console.error(String(e && e.message ? e.message : e));
  process.exit(1);
});
