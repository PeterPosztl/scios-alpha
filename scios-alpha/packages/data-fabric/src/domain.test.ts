import { BitemporalRecordSchema } from "./domain";

describe("BitemporalRecordSchema", () => {
  it("parses a valid BitemporalRecord", () => {
    const record = {
      id: "bt-001",
      source: "market-feed",
      eventTime: "2026-07-16T12:00:00.000Z",
      ingestionTime: "2026-07-16T12:00:01.000Z",
      validFrom: "2026-07-16T12:00:00.000Z",
      revisionId: "rev-1",
    };

    const parsed = BitemporalRecordSchema.parse(record);
    expect(parsed.id).toBe("bt-001");
    expect(parsed.source).toBe("market-feed");
    expect(parsed.revisionId).toBe("rev-1");
    expect(parsed.validTo).toBeUndefined();
  });
});
