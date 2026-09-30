/**
 * Product fill settings — local session only.
 * Theme stays SCI tokens. Data-source toggle cannot enable live GO.
 * ALPHA_NON_PRODUCTION
 */

import { normalizeLocale } from "./i18n.js";

export const HOME_CARD_IDS = [
  "work",
  "analyses",
  "intelligence",
  "reporting",
  "analysis",
  "detective",
  "decisions",
  "evidence",
  "risks",
  "system",
];

export const SCI_THEME_VARIANTS = ["SCI_STANDARD", "SCI_HIGH_CONTRAST", "SCI_FOG"];
export const SCI_LAYOUT_MODES = ["STANDARD", "COMPACT", "WIDE"];

export function defaultProductPrefs() {
  return {
    locale: "en-US",
    density: "STANDARD",
    disclosure: "L3",
    reducedMotion: false,
    dataSourceIntent: "simulated_alpha",
    themeVariant: "SCI_STANDARD",
    layoutMode: "STANDARD",
    notifyAlerts: true,
    notifyJobs: true,
    homeCardOrder: HOME_CARD_IDS.slice(),
    homeHiddenCards: [],
  };
}

export function normalizeHomeCards(order, hidden) {
  const seen = [];
  (Array.isArray(order) ? order : []).forEach((id) => {
    if (HOME_CARD_IDS.indexOf(id) >= 0 && seen.indexOf(id) < 0) seen.push(id);
  });
  HOME_CARD_IDS.forEach((id) => {
    if (seen.indexOf(id) < 0) seen.push(id);
  });
  const hide = [];
  (Array.isArray(hidden) ? hidden : []).forEach((id) => {
    if (HOME_CARD_IDS.indexOf(id) >= 0 && hide.indexOf(id) < 0 && id !== "system") hide.push(id);
  });
  if (hide.length >= HOME_CARD_IDS.length) hide.length = 0;
  return { order: seen, hidden: hide };
}

export function moveHomeCard(order, id, dir) {
  const o = (order && order.slice ? order.slice() : HOME_CARD_IDS.slice());
  const i = o.indexOf(id);
  const j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= o.length) return o;
  const tmp = o[i];
  o[i] = o[j];
  o[j] = tmp;
  return o;
}

export function mergeProductPrefs(raw) {
  const base = defaultProductPrefs();
  const src = raw && typeof raw === "object" ? raw : {};
  const density = src.density === "COMFORTABLE" || src.density === "EXPERT" ? src.density : "STANDARD";
  const disclosure = src.disclosure === "L1" ? "L1" : "L3";
  const themeVariant = SCI_THEME_VARIANTS.indexOf(src.themeVariant) >= 0 ? src.themeVariant : "SCI_STANDARD";
  const layoutMode = SCI_LAYOUT_MODES.indexOf(src.layoutMode) >= 0 ? src.layoutMode : "STANDARD";
  const cards = normalizeHomeCards(src.homeCardOrder, src.homeHiddenCards);
  return {
    locale: normalizeLocale(src.locale || base.locale),
    density: density,
    disclosure: disclosure,
    reducedMotion: src.reducedMotion === true,
    dataSourceIntent: "simulated_alpha",
    themeVariant: themeVariant,
    layoutMode: layoutMode,
    notifyAlerts: src.notifyAlerts !== false,
    notifyJobs: src.notifyJobs !== false,
    homeCardOrder: cards.order,
    homeHiddenCards: cards.hidden,
  };
}

export function applyProductPrefs(prefs) {
  const p = mergeProductPrefs(prefs);
  if (typeof document === "undefined") return p;
  document.documentElement.lang = p.locale.slice(0, 2);
  document.body.setAttribute("data-density", p.density);
  document.body.setAttribute("data-disclosure", p.disclosure);
  document.body.setAttribute("data-reduced-motion", p.reducedMotion ? "1" : "0");
  document.body.setAttribute("data-theme", p.themeVariant);
  document.body.setAttribute("data-layout", p.layoutMode);
  document.body.setAttribute("data-notify-alerts", p.notifyAlerts ? "1" : "0");
  return p;
}

export function renderProductSettings(root, ctx) {
  if (!root) return;
  clearNode(root);
  const locale = ctx.locale || "en-US";
  const prefs = mergeProductPrefs(ctx.prefs);
  const infra = (ctx.infra && (ctx.infra.data || ctx.infra)) || {};
  const actual = infra.actual || {};
  const hooks = infra.hooks || {};
  const tab = ctx.tab || "user";

  const tabs = appendEl(root, "div", "settings-tabs");
  [
    ["user", t(locale, "settings.user")],
    ["system", t(locale, "settings.system")],
    ["theme", t(locale, "settings.theme")],
    ["locale", t(locale, "settings.locale")],
    ["datasource", t(locale, "settings.datasource")],
    ["notifications", t(locale, "settings.notifications")],
    ["workspace", t(locale, "settings.workspace")],
  ].forEach(([id, label]) => {
    const b = appendEl(tabs, "button", "ghost" + (tab === id ? " on" : ""), label);
    b.type = "button";
    b.setAttribute("data-action-id", "settings.tab." + id);
    b.onclick = () => ctx.onTab && ctx.onTab(id);
  });

  const panel = appendEl(root, "div", "pro-card");
  if (tab === "user") {
    appendEl(panel, "p", "level", t(locale, "settings.user"));
    appendEl(panel, "h3", null, t(locale, "settings.localeLabel"));
    const sel = document.createElement("select");
    sel.setAttribute("aria-label", t(locale, "hdr.language"));
    SCI_LOCALES.forEach((code) => {
      const o = document.createElement("option");
      o.value = code;
      o.textContent = code;
      if (code === prefs.locale) o.selected = true;
      sel.appendChild(o);
    });
    sel.onchange = () => ctx.onChange && ctx.onChange({ locale: sel.value });
    panel.appendChild(sel);
    appendEl(panel, "p", "hint", t(locale, "settings.roleNote"));
    appendEl(panel, "p", "model-truth", t(locale, "settings.localOnly"));
  } else if (tab === "system") {
    appendEl(panel, "p", "level", t(locale, "settings.system"));
    appendEl(panel, "h3", null, "SCI OS ×10");
    const exec = (hooks.executionEngine || {});
    const rows = [
      [t(locale, "settings.boot"), actual.boot || "start-sci-os.cjs"],
      ["Control Plane", actual.controlPlane || ":3000"],
      ["Shell", actual.shell || "apps/cockpit-ui :4000"],
      [t(locale, "settings.autoTrade"), "false"],
      [t(locale, "settings.oidc"), actual.oidc || infra.oidc || "ABSENT"],
      [t(locale, "settings.otlp"), actual.otlp || infra.otlp || "ABSENT"],
      [t(locale, "settings.ledger"), actual.ledger || infra.ledger || "in-memory"],
      [t(locale, "settings.calib"), actual.liveCalibration || "UNKNOWN"],
      [t(locale, "settings.execution"), exec.status || "SIMULATION_ONLY"],
      ["Enterprise hooks", infra.enabled === false ? "PREPARED · enabled=false" : "UNKNOWN"],
    ];
    rows.forEach((r) => appendEl(panel, "p", "hint", r[0] + ": " + r[1]));
    appendEl(panel, "p", "model-truth", "P2 placeholders prepared, not enabled. Live execution=false. Not READY.");
  } else if (tab === "theme") {
    appendEl(panel, "p", "level", t(locale, "settings.theme"));
    appendEl(panel, "h3", null, t(locale, "settings.themeVariant"));
    const theme = document.createElement("select");
    theme.setAttribute("aria-label", t(locale, "settings.themeVariant"));
    SCI_THEME_VARIANTS.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d.replace(/_/g, " ");
      if (d === prefs.themeVariant) o.selected = true;
      theme.appendChild(o);
    });
    theme.onchange = () => ctx.onChange && ctx.onChange({ themeVariant: theme.value });
    panel.appendChild(theme);
    appendEl(panel, "h3", null, t(locale, "settings.density"));
    const dens = document.createElement("select");
    dens.setAttribute("aria-label", t(locale, "settings.density"));
    ["COMFORTABLE", "STANDARD", "EXPERT"].forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      if (d === prefs.density) o.selected = true;
      dens.appendChild(o);
    });
    dens.onchange = () => ctx.onChange && ctx.onChange({ density: dens.value });
    panel.appendChild(dens);
    appendEl(panel, "p", "level", t(locale, "settings.disclosure"));
    const disc = document.createElement("select");
    disc.setAttribute("aria-label", t(locale, "settings.disclosure"));
    ["L1", "L3"].forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      if (d === prefs.disclosure) o.selected = true;
      disc.appendChild(o);
    });
    disc.onchange = () => ctx.onChange && ctx.onChange({ disclosure: disc.value });
    panel.appendChild(disc);
    const mot = document.createElement("label");
    const cb = document.createElement("input");
    cb.type = "checkbox";
    cb.checked = prefs.reducedMotion === true;
    cb.onchange = () => ctx.onChange && ctx.onChange({ reducedMotion: cb.checked });
    mot.appendChild(cb);
    mot.appendChild(document.createTextNode(" " + t(locale, "settings.motion")));
    panel.appendChild(mot);
    appendEl(panel, "p", "hint", t(locale, "settings.palette"));
  } else if (tab === "locale") {
    appendEl(panel, "p", "level", t(locale, "settings.locale"));
    appendEl(panel, "h3", null, t(locale, "settings.localeLabel"));
    SCI_LOCALES.forEach((code) => {
      const b = appendEl(panel, "button", "ghost" + (prefs.locale === code ? " on" : ""), code);
      b.type = "button";
      b.onclick = () => ctx.onChange && ctx.onChange({ locale: code });
    });
    appendEl(panel, "p", "hint", t(locale, "settings.localOnly"));
  } else if (tab === "datasource") {
    appendEl(panel, "p", "level", t(locale, "settings.datasource"));
    appendEl(panel, "h3", null, t(locale, "settings.feed"));
    appendEl(panel, "p", "val", t(locale, "settings.feedSim"));
    appendEl(panel, "p", "hint", t(locale, "settings.feedLive"));
    appendEl(panel, "p", "hint", t(locale, "settings.oidc") + ": " + (actual.oidc || "ABSENT"));
    appendEl(panel, "p", "hint", t(locale, "settings.otlp") + ": " + (actual.otlp || "ABSENT"));
    appendEl(panel, "p", "hint", t(locale, "settings.ledger") + ": " + (actual.ledger || "in-memory"));
    appendEl(panel, "p", "hint", t(locale, "settings.execution") + ": SIMULATION_ONLY · live=false");
    appendEl(panel, "p", "model-truth", "Live adapter cannot be enabled from this panel. Not a trade. Not READY.");
  } else if (tab === "notifications") {
    appendEl(panel, "p", "level", t(locale, "settings.notifications"));
    appendEl(panel, "h3", null, t(locale, "settings.notifyLocal"));
    [
      ["notifyAlerts", t(locale, "settings.notifyAlerts")],
      ["notifyJobs", t(locale, "settings.notifyJobs")],
    ].forEach(([key, label]) => {
      const mot = document.createElement("label");
      const cb = document.createElement("input");
      cb.type = "checkbox";
      cb.checked = prefs[key] !== false;
      cb.onchange = () => {
        const patch = {};
        patch[key] = cb.checked;
        ctx.onChange && ctx.onChange(patch);
      };
      mot.appendChild(cb);
      mot.appendChild(document.createTextNode(" " + label));
      panel.appendChild(mot);
    });
    appendEl(panel, "p", "hint", t(locale, "settings.notifyNote"));
  } else {
    appendEl(panel, "p", "level", t(locale, "settings.workspace"));
    appendEl(panel, "h3", null, t(locale, "settings.layout"));
    const lay = document.createElement("select");
    lay.setAttribute("aria-label", t(locale, "settings.layout"));
    SCI_LAYOUT_MODES.forEach((d) => {
      const o = document.createElement("option");
      o.value = d;
      o.textContent = d;
      if (d === prefs.layoutMode) o.selected = true;
      lay.appendChild(o);
    });
    lay.onchange = () => ctx.onChange && ctx.onChange({ layoutMode: lay.value });
    panel.appendChild(lay);
    appendEl(panel, "h3", null, t(locale, "settings.homeCards"));
    appendEl(panel, "p", "hint", t(locale, "settings.homeCardsHint"));
    prefs.homeCardOrder.forEach((id, idx) => {
      const row = appendEl(panel, "div", "settings-card-row");
      const hidden = prefs.homeHiddenCards.indexOf(id) >= 0;
      appendEl(row, "span", null, t(locale, "home.card." + id) + (hidden ? " · hidden" : ""));
      const up = appendEl(row, "button", "ghost", "↑");
      up.type = "button";
      up.disabled = idx === 0;
      up.onclick = () =>
        ctx.onChange && ctx.onChange({ homeCardOrder: moveHomeCard(prefs.homeCardOrder, id, "up") });
      const down = appendEl(row, "button", "ghost", "↓");
      down.type = "button";
      down.disabled = idx === prefs.homeCardOrder.length - 1;
      down.onclick = () =>
        ctx.onChange && ctx.onChange({ homeCardOrder: moveHomeCard(prefs.homeCardOrder, id, "down") });
      if (id !== "system") {
        const vis = appendEl(row, "button", "ghost", hidden ? t(locale, "settings.show") : t(locale, "settings.hide"));
        vis.type = "button";
        vis.onclick = () => {
          const next = prefs.homeHiddenCards.slice();
          const at = next.indexOf(id);
          if (at >= 0) next.splice(at, 1);
          else next.push(id);
          ctx.onChange && ctx.onChange({ homeHiddenCards: next });
        };
      }
    });
    appendEl(panel, "p", "model-truth", t(locale, "settings.localOnly"));
  }
}

export const PRODUCT_SETTINGS_BROWSER_SOURCE =
  "const HOME_CARD_IDS = " +
  JSON.stringify(HOME_CARD_IDS) +
  ";\nconst SCI_THEME_VARIANTS = " +
  JSON.stringify(SCI_THEME_VARIANTS) +
  ";\nconst SCI_LAYOUT_MODES = " +
  JSON.stringify(SCI_LAYOUT_MODES) +
  ";\n" +
  [
    defaultProductPrefs,
    normalizeHomeCards,
    moveHomeCard,
    mergeProductPrefs,
    applyProductPrefs,
    renderProductSettings,
  ]
    .map((fn) => fn.toString())
    .join("\n");
