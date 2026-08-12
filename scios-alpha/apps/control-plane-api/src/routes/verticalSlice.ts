/**
 * Cockpit-facing vertical-slice route handlers.
 * Native http (no Express) — same shape as VerticalSliceRequest/Response.
 * Runs the real ALPHA pipeline; never returns a hardcoded mock APPROVE.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  runVerticalSlice,
  toVerticalSliceResponse,
  type VerticalSliceRequest,
  type VerticalSliceResponse,
} from "@scios/vertical-slice";

export type JsonSender = (
  res: ServerResponse,
  status: number,
  body: unknown
) => void;

export type SliceRunBody = VerticalSliceRequest & {
  source?: string;
  side?: "buy" | "sell";
  tenantId?: string;
  seed?: number;
  eventTime?: string;
  format?: string;
};

export function validateVerticalSliceRequest(
  body: Record<string, unknown>
): { ok: true; value: SliceRunBody } | { ok: false; error: string } {
  const instrumentId =
    typeof body.instrumentId === "string" ? body.instrumentId.trim() : "";
  const horizonSec =
    typeof body.horizonSec === "number" ? body.horizonSec : Number(body.horizonSec);
  const size = typeof body.size === "number" ? body.size : Number(body.size);

  if (!instrumentId || !Number.isFinite(horizonSec) || !Number.isFinite(size)) {
    return {
      ok: false,
      error: "instrumentId, horizonSec and size are required",
    };
  }
  if (horizonSec <= 0 || size <= 0) {
    return {
      ok: false,
      error: "horizonSec and size must be positive numbers",
    };
  }

  return {
    ok: true,
    value: {
      instrumentId,
      horizonSec,
      size,
      source: typeof body.source === "string" ? body.source : undefined,
      side: body.side === "sell" ? "sell" : "buy",
      tenantId: typeof body.tenantId === "string" ? body.tenantId : undefined,
      seed: typeof body.seed === "number" ? body.seed : undefined,
      eventTime: typeof body.eventTime === "string" ? body.eventTime : undefined,
      format: typeof body.format === "string" ? body.format : undefined,
    },
  };
}

export async function executeVerticalSlice(
  body: SliceRunBody,
  format?: string | null
): Promise<VerticalSliceResponse | Awaited<ReturnType<typeof runVerticalSlice>>> {
  const result = await runVerticalSlice({
    source: body.source ?? "cockpit",
    instrumentId: body.instrumentId,
    eventTime: body.eventTime,
    horizonSec: body.horizonSec,
    size: body.size,
    side: body.side ?? "buy",
    tenantId: body.tenantId ?? "default",
    seed: body.seed,
    payload: { size: body.size, horizonSec: body.horizonSec },
  });

  const wantInternal = (format ?? body.format) === "internal";
  return wantInternal ? result : toVerticalSliceResponse(result);
}

/** Shared POST handler for /api/vertical-slice/run and /v1/slice/run */
export async function handleVerticalSliceRun(opts: {
  req: IncomingMessage;
  res: ServerResponse;
  body: Record<string, unknown>;
  formatQuery?: string | null;
  sendJson: JsonSender;
  onError?: (err: unknown) => void;
}): Promise<void> {
  const parsed = validateVerticalSliceRequest(opts.body);
  if (!parsed.ok) {
    opts.sendJson(opts.res, 400, { error: parsed.error });
    return;
  }

  try {
    const response = await executeVerticalSlice(
      parsed.value,
      opts.formatQuery
    );
    opts.sendJson(opts.res, 200, response);
  } catch (err) {
    opts.onError?.(err);
    opts.sendJson(opts.res, 400, {
      error: "slice_run_failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}

async function readJsonBody(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

/**
 * Express-style router mount for vertical-slice paths.
 * Returns true when the request was handled.
 */
export async function verticalSliceRouter(opts: {
  method: string;
  path: string;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  sendJson: JsonSender;
  onError?: (err: unknown) => void;
}): Promise<boolean> {
  if (
    opts.method !== "POST" ||
    (opts.path !== "/api/vertical-slice/run" && opts.path !== "/v1/slice/run")
  ) {
    return false;
  }

  let body: Record<string, unknown>;
  try {
    body = (await readJsonBody(opts.req)) as Record<string, unknown>;
  } catch {
    opts.sendJson(opts.res, 400, { error: "invalid_json" });
    return true;
  }

  if (opts.path === "/api/vertical-slice/run" && body.source == null) {
    body = { ...body, source: "cockpit" };
  } else if (opts.path === "/v1/slice/run" && body.source == null) {
    body = { ...body, source: "api" };
  }

  await handleVerticalSliceRun({
    req: opts.req,
    res: opts.res,
    body,
    formatQuery: opts.url.searchParams.get("format"),
    sendJson: opts.sendJson,
    onError: opts.onError,
  });
  return true;
}
