/** First-release timestamps are UTC ISO-8601 with Z suffix. ALPHA_NON_PRODUCTION */

const UTC_ISO =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,9})?Z$/;

export function utcIsoNow(): string {
  return new Date().toISOString();
}

export function isUtcIso(value: string): boolean {
  return typeof value === "string" && UTC_ISO.test(value);
}
