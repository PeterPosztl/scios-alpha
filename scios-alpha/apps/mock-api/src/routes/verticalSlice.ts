/**
 * POST /api/vertical-slice/run — real pipeline → VerticalSliceResponse.
 */
import type { IncomingMessage, ServerResponse } from "node:http";
import {
  runVerticalSlice,
  toVerticalSliceResponse,
  type VerticalSliceRequest,
} from "@scios/vertical-slice";

export type JsonSender = (
  res: ServerResponse,
  status: number,
  body: unknown
) => void;

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

function validate(
  body: Record<string, unknown>
): { ok: true; value: VerticalSliceRequest } | { ok: false; error: string } {
  const instrumentId =
    typeof body.instrumentId === "string" ? body.instrumentId.trim() : "";
  const horizonSec = Number(body.horizonSec);
  const size = Number(body.size);
  if (!instrumentId || !Number.isFinite(horizonSec) || !Number.isFinite(size)) {
    return {
      ok: false,
      error: "instrumentId, horizonSec and size are required",
    };
  }
  if (horizonSec <= 0 || size <= 0) {
    return { ok: false, error: "horizonSec and size must be positive numbers" };
  }
  return { ok: true, value: { instrumentId, horizonSec, size } };
}

export async function verticalSliceRouter(opts: {
  method: string;
  path: string;
  url: URL;
  req: IncomingMessage;
  res: ServerResponse;
  sendJson: JsonSender;
}): Promise<boolean> {
  if (opts.method !== "POST" || opts.path !== "/api/vertical-slice/run") {
    return false;
  }

  let body: Record<string, unknown>;
  try {
    body = (await readJson(opts.req)) as Record<string, unknown>;
  } catch {
    opts.sendJson(opts.res, 400, { error: "invalid_json" });
    return true;
  }

  const parsed = validate(body);
  if (!parsed.ok) {
    opts.sendJson(opts.res, 400, { error: parsed.error });
    return true;
  }

  try {
    const result = await runVerticalSlice({
      source: "mock-api",
      instrumentId: parsed.value.instrumentId,
      horizonSec: parsed.value.horizonSec,
      size: parsed.value.size,
      payload: {
        size: parsed.value.size,
        horizonSec: parsed.value.horizonSec,
      },
    });
    const format = opts.url.searchParams.get("format");
    opts.sendJson(
      opts.res,
      200,
      format === "internal" ? result : toVerticalSliceResponse(result)
    );
  } catch (err) {
    opts.sendJson(opts.res, 400, {
      error: "slice_run_failed",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
  return true;
}
