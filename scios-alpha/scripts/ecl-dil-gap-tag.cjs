/**
 * Overlay only — does NOT rewrite 01-GAP-CATALOG or completion-work-units.json.
 * Tags every GAP + WU into ecl | dil | ui | risk | docs | engine for the ECL/DIL rocket.
 */
const fs = require("node:fs");
const path = require("node:path");

const root = path.resolve(__dirname, "..");
const box = path.join(root, "docs", "enterprise", "v1-command-box");
const gaps = JSON.parse(fs.readFileSync(path.join(box, "gap-catalog.json"), "utf8"));
const wus = JSON.parse(fs.readFileSync(path.join(box, "completion-work-units.json"), "utf8"));

const CATS = ["ecl", "dil", "ui", "risk", "docs", "engine"];

function tagsFor(text, layer = "", module = "") {
  const t = `${text} ${layer} ${module}`.toLowerCase();
  const tags = new Set();
  if (/pnl|bankroll|finance|sap|reporting console|\becl\b|instrument|position|trade |session|drawdown engine/.test(t))
    tags.add("ecl");
  if (
    /polymarket|kalshi|prediction|forecast|implied|probability|dil\b|whale|mispric|edge score|decision intelligence|gw1/.test(
      t
    )
  )
    tags.add("dil");
  if (/design-system|token|cockpit|shell|professional ui|technical console|ui-|nav|layout|molecule|organism/.test(t))
    tags.add("ui");
  if (/risk|guardrail|kelly|drawdown|exposure|concentrat|var\b/.test(t)) tags.add("risk");
  if (/doc|readme|spec |architecture|policy|catalog/.test(t)) tags.add("docs");
  if (/engine|adapter|model-registry|governance|observab|workflow|job/.test(t)) tags.add("engine");
  if (!tags.size) {
    if (/professional ui|design-system|shell/i.test(layer)) tags.add("ui");
    else if (/engines/i.test(layer)) tags.add("engine");
    else if (/technical/i.test(layer)) tags.add("ui");
    else tags.add("engine");
  }
  return [...tags];
}

function primary(tags) {
  for (const c of CATS) if (tags.includes(c)) return c;
  return "engine";
}

const gapOverlay = gaps.gaps.map((g) => {
  const blob = `${g.title} ${g.missing} ${g.shouldSee} ${g.why} ${g.nearest}`;
  const tags = tagsFor(blob, g.layer, g.module);
  return {
    id: g.id,
    klass: g.klass,
    wave: g.wave,
    priority: g.priority,
    finishMode: g.finishMode,
    layer: g.layer,
    tags,
    primary: primary(tags),
  };
});

const wuOverlay = wus.units.map((u) => {
  const blob = `${u.step} ${u.help} ${u.layer} ${u.module}`;
  const tags = tagsFor(blob, u.layer, u.module);
  return {
    id: u.id,
    gapId: u.gapId,
    unitName: u.unitName,
    wave: u.wave,
    priority: u.priority,
    tags,
    primary: primary(tags),
  };
});

function countBy(rows, key) {
  const out = {};
  for (const r of rows) {
    const k = r[key];
    out[k] = (out[k] || 0) + 1;
  }
  return out;
}

function countTags(rows) {
  const out = Object.fromEntries(CATS.map((c) => [c, 0]));
  for (const r of rows) for (const t of r.tags) out[t] += 1;
  return out;
}

const overlay = {
  schema: "sci-os-ecl-dil-gap-overlay/v1",
  label: "ALPHA_NON_PRODUCTION",
  note: "Additive overlay. Original catalogs unchanged. Not a READY score. Categories are routing hints for ECL/DIL/UI rocket — orphans are tagged engine.",
  sourceCatalogAt: gaps.at,
  gapCount: gapOverlay.length,
  wuCount: wuOverlay.length,
  gapsByClass: countBy(gapOverlay, "klass"),
  gapsByWave: countBy(gapOverlay, "wave"),
  gapsByPrimary: countBy(gapOverlay, "primary"),
  gapTagHits: countTags(gapOverlay),
  wusByWave: countBy(wuOverlay, "wave"),
  wusByPriority: countBy(wuOverlay, "priority"),
  wusByPrimary: countBy(wuOverlay, "primary"),
  wuTagHits: countTags(wuOverlay),
  orphans: {
    gapsWithoutTag: gapOverlay.filter((g) => !g.tags.length).map((g) => g.id),
    wusWithoutTag: wuOverlay.filter((u) => !u.tags.length).map((u) => u.id).slice(0, 20),
  },
  gaps: gapOverlay,
  units: wuOverlay,
};

fs.writeFileSync(path.join(box, "ecl-dil-gap-overlay.json"), JSON.stringify(overlay, null, 2));

const md = `# ECL/DIL gap overlay (additive)

**Label:** \`ALPHA_NON_PRODUCTION\`  
Does **not** overwrite \`01-GAP-CATALOG.md\` / \`gap-catalog.json\` / work-unit files.

Every GAP and WU is tagged into at least one of: **ecl · dil · ui · risk · docs · engine**.
Primary = first matching category. Multi-tag allowed (a WU can be ui+risk).

## GAP primary

${Object.entries(overlay.gapsByPrimary)
  .map(([k, n]) => `- **${k}:** ${n}`)
  .join("\n")}

## GAP tag hits (multi)

${Object.entries(overlay.gapTagHits)
  .map(([k, n]) => `- **${k}:** ${n}`)
  .join("\n")}

## WU primary

${Object.entries(overlay.wusByPrimary)
  .map(([k, n]) => `- **${k}:** ${n}`)
  .join("\n")}

## WU tag hits (multi)

${Object.entries(overlay.wuTagHits)
  .map(([k, n]) => `- **${k}:** ${n}`)
  .join("\n")}

## Wave × this rocket

| Wave | Meaning | ECL/DIL action |
|------|---------|----------------|
| W0 | Lock live OS | Boot/Shell/CP stay; overlay mapping only |
| W1 | UI tokens/core/layout | design-system + cockpit chrome |
| W2 | Engine adapters | \`@scios/ecl-dil\` + CP routes |
| W3 | Composed consoles | Intelligence + Reporting views |
| W4 | P2 enterprise | OIDC/OTLP/durable — later, honest UNKNOWN |

Machine file: \`ecl-dil-gap-overlay.json\`. Orphans: ${overlay.orphans.gapsWithoutTag.length} GAPs, sample WU ${overlay.orphans.wusWithoutTag.length}.
`;

fs.writeFileSync(path.join(box, "05-ECL-DIL-GAP-MAPPING.md"), md);
console.log(
  JSON.stringify(
    {
      gaps: overlay.gapCount,
      wus: overlay.wuCount,
      gapPrimary: overlay.gapsByPrimary,
      wuPrimary: overlay.wusByPrimary,
      orphans: overlay.orphans.gapsWithoutTag.length,
    },
    null,
    2
  )
);
