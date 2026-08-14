import { isUtcIso, utcIsoNow } from "./utc";

describe("utc ISO discipline", () => {
  it("emits Z-suffixed ISO-8601", () => {
    const now = utcIsoNow();
    expect(isUtcIso(now)).toBe(true);
  });

  it("rejects local-offset and date-only strings", () => {
    expect(isUtcIso("2026-08-14T00:00:00+02:00")).toBe(false);
    expect(isUtcIso("2026-08-14")).toBe(false);
    expect(isUtcIso("")).toBe(false);
  });
});
