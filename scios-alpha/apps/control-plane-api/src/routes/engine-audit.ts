/**
 * HTTP adapter for analog audit+limit eval.
 * Composes into Control Plane eclDil router — not a second Express app.
 * ALPHA_NON_PRODUCTION
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  parseAuditLimitInput,
  type AuditLimitInput,
} from "@scios/ecl-dil";

export type SendJson = (res: ServerResponse, status: number, body: unknown) => void;

export async function postAuditEval(opts: {
  body: unknown;
  evaluate: (input: AuditLimitInput) => unknown;
  res: ServerResponse;
  sendJson: SendJson;
  envelope: (data: unknown, extra?: Record<string, unknown>) => unknown;
}): Promise<boolean> {
  const parsed = parseAuditLimitInput(opts.body);
  if (!parsed.ok) {
    opts.sendJson(opts.res, 400, { error: parsed.error, label: "ALPHA_NON_PRODUCTION", autoTrade: false });
    return true;
  }
  const data = opts.evaluate(parsed.input);
  opts.sendJson(
    opts.res,
    200,
    opts.envelope(data, {
      persisted: false,
      executable: false,
      autoTrade: false,
      governance: "AGENT → PROPOSAL → HUMAN → DECISION",
    })
  );
  return true;
}

/** IncomingMessage kept so the file matches the requested handler shape without Express. */
export type AuditEvalRequest = IncomingMessage;
