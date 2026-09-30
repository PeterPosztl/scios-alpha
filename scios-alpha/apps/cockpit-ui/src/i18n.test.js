import assert from "node:assert/strict";
import { test } from "node:test";
import { SCI_LOCALES, SCI_I18N, normalizeLocale, t } from "./i18n.js";
import { defaultProductPrefs, mergeProductPrefs } from "./product-settings.js";

test("locales are en-US, hu-HU, de-DE and unknown falls back", () => {
  assert.deepEqual(SCI_LOCALES, ["en-US", "hu-HU", "de-DE"]);
  assert.equal(normalizeLocale("hu-HU"), "hu-HU");
  assert.equal(normalizeLocale("xx"), "en-US");
  assert.equal(t("hu-HU", "nav.home"), "Kezdőlap");
  assert.equal(t("de-DE", "nav.settings"), "Einstellungen");
  assert.equal(t("xx", "nav.home"), t("en-US", "nav.home"));
  assert.equal(t("en-US", "missing.key"), "missing.key");
});

test("every locale pack covers en-US chrome keys", () => {
  const keys = Object.keys(SCI_I18N["en-US"]);
  for (const loc of SCI_LOCALES) {
    for (const k of keys) {
      assert.ok(t(loc, k) && t(loc, k) !== k, loc + " missing " + k);
    }
  }
});

test("product prefs cannot enable live feed or hide every Home card", () => {
  const p = mergeProductPrefs({
    locale: "de-DE",
    density: "EXPERT",
    dataSourceIntent: "live_unverified",
    autoTrade: true,
    themeVariant: "palantir-dark",
    layoutMode: "chaos",
    homeCardOrder: ["bogus", "intelligence", "work"],
    homeHiddenCards: ["work", "analyses", "intelligence", "reporting", "analysis", "detective", "decisions", "evidence", "risks", "system"],
  });
  assert.equal(p.locale, "de-DE");
  assert.equal(p.density, "EXPERT");
  assert.equal(p.dataSourceIntent, "simulated_alpha");
  assert.equal(p.themeVariant, "SCI_STANDARD");
  assert.equal(p.layoutMode, "STANDARD");
  assert.equal(p.homeCardOrder[0], "intelligence");
  assert.ok(p.homeCardOrder.includes("system"));
  assert.ok(p.homeCardOrder.includes("analysis"));
  assert.ok(p.homeCardOrder.includes("detective"));
  assert.ok(!p.homeHiddenCards.includes("system"));
  assert.equal(defaultProductPrefs().dataSourceIntent, "simulated_alpha");
});
