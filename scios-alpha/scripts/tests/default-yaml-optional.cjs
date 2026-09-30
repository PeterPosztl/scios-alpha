/**
 * default.yaml is OPTIONAL development config — must not warn as if mandatory.
 */
const path = require("path");
const { pathToFileURL } = require("url");

async function main() {
  const p = path.resolve(
    __dirname,
    "../../installer/scripts/startup/validate-config.cjs"
  );
  const mod = require(p);
  if (typeof mod.validateConfig !== "function" && typeof mod !== "function") {
    const src = require("fs").readFileSync(p, "utf8");
    const ok =
      src.includes('optionalMissing.push("infra/config/default.yaml")') &&
      !/warnings\.push\("default.yaml missing"\)/.test(src);
    if (!ok) {
      console.error("default.yaml still pushed as operator warning");
      process.exit(1);
    }
    console.log(
      JSON.stringify({
        ok: true,
        classification: "OPTIONAL_DEVELOPMENT",
        warningRemoved: true,
      })
    );
    return;
  }
}

main();
