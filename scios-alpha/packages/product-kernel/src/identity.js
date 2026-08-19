/**
 * Canonical object identity — one logical object → one id across SCI OS.
 * ALPHA_NON_PRODUCTION
 */

export function canonicalId(type, key) {
  const t = String(type || "Object").trim();
  const k = String(key || "")
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9._-]+/g, "_");
  return `${t}:${k || "UNKNOWN"}`;
}

export function createObjectShell(type, key, extra = {}) {
  const now = new Date().toISOString();
  const id = canonicalId(type, key);
  return {
    id,
    type,
    version: extra.version || 1,
    title: extra.title || String(key),
    status: extra.status || "UNKNOWN",
    createdAt: extra.createdAt || now,
    updatedAt: extra.updatedAt || now,
    asOf: extra.asOf || now,
    owner: extra.owner || null,
    source: extra.source || "product-kernel",
    permissions: extra.permissions || [],
    relationships: extra.relationships || [],
    evidenceRefs: extra.evidenceRefs || [],
    lineageRefs: extra.lineageRefs || [],
    ...extra,
  };
}

export class IdentityResolver {
  constructor() {
    this.aliases = new Map();
  }

  register(canonical, aliasList = []) {
    this.aliases.set(canonical, new Set(aliasList.map(String)));
    for (const a of aliasList) {
      this.aliases.set(String(a), new Set([canonical]));
    }
  }

  resolve(anyId) {
    const key = String(anyId);
    if (this.aliases.has(key) && key.includes(":")) return key;
    const hit = this.aliases.get(key);
    if (hit) {
      for (const v of hit) {
        if (String(v).includes(":")) return v;
      }
    }
    return key;
  }
}
