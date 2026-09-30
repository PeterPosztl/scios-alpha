import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { randomUUID } from "node:crypto";
import { createLogger, SeededRng } from "@scios/observability";
import type { ExecutionOrder } from "@scios/data-fabric";

const PORT = Number(process.env.PORT ?? 5210);
const BIND = process.env.SCIOS_BIND ?? "127.0.0.1";
const RISK_ENGINE_URL =
  process.env.RISK_ENGINE_URL ?? "http://127.0.0.1:5202/risk/check";
const SCIOS_SEED = Number(process.env.SCIOS_SEED ?? 42);

const log = createLogger("execution-simulator");
const orders: ExecutionOrder[] = [];
const rng = new SeededRng(SCIOS_SEED);

type Side = "buy" | "sell";
type OrderType = "market" | "limit";

interface SubmitBody {
  instrumentId: string;
  side: Side;
  size: number;
  type: OrderType;
  price?: number;
}

function sendJson(res: ServerResponse, status: number, body: unknown): void {
  res.writeHead(status, {
    "content-type": "application/json; charset=utf-8",
    "access-control-allow-origin": "*",
  });
  res.end(JSON.stringify(body));
}

async function readJson(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  if (!raw) return {};
  return JSON.parse(raw) as unknown;
}

async function checkRisk(body: SubmitBody): Promise<{
  allowed: boolean;
  reasons: string[];
  var?: number;
  es?: number;
  drawdown?: number;
}> {
  try {
    const res = await fetch(RISK_ENGINE_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        positions: [],
        newOrderProposal: {
          instrumentId: body.instrumentId,
          side: body.side,
          size: body.size,
          type: body.type,
          price: body.price,
        },
        marketDataSnapshot: {},
      }),
    });
    const data = (await res.json()) as {
      allowed?: boolean;
      reasons?: string[];
      var?: number;
      es?: number;
      drawdown?: number;
    };
    return {
      allowed: Boolean(data.allowed),
      reasons: data.reasons ?? [],
      var: data.var,
      es: data.es,
      drawdown: data.drawdown,
    };
  } catch (err) {
    log.error("risk_engine_unreachable", {
      url: RISK_ENGINE_URL,
      error: err instanceof Error ? err.message : String(err),
    });
    return {
      allowed: false,
      reasons: ["risk_engine_unreachable"],
    };
  }
}

async function handleSubmit(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  let body: SubmitBody;
  try {
    body = (await readJson(req)) as SubmitBody;
  } catch {
    sendJson(res, 400, { error: "invalid_json" });
    return;
  }

  if (
    !body?.instrumentId ||
    !body?.side ||
    typeof body.size !== "number" ||
    !body?.type
  ) {
    sendJson(res, 400, {
      error: "invalid_body",
      expected: {
        instrumentId: "string",
        side: "buy|sell",
        size: "number",
        type: "market|limit",
        price: "number?",
      },
    });
    return;
  }

  const risk = await checkRisk(body);
  if (!risk.allowed) {
    sendJson(res, 403, { allowed: false, reasons: risk.reasons });
    return;
  }

  const now = new Date().toISOString();
  const fillPrice =
    typeof body.price === "number" ? body.price : 100 + rng.range(0, 10);

  const order: ExecutionOrder = {
    orderId: randomUUID(),
    side: body.side,
    size: body.size,
    price: fillPrice,
    status: "filled",
    venue: "ALPHA_PAPER",
    createdAt: now,
    updatedAt: now,
  };

  orders.push(order);
  log.info("order_filled", {
    orderId: order.orderId,
    instrumentId: body.instrumentId,
    size: body.size,
    price: fillPrice,
    seed: SCIOS_SEED,
  });
  sendJson(res, 200, { ...order, instrumentId: body.instrumentId, allowed: true });
}

function handleBook(_req: IncomingMessage, res: ServerResponse): void {
  const mid = 100 + rng.range(0, 1);
  sendJson(res, 200, {
    bids: [
      { price: mid - 0.05, size: 120 },
      { price: mid - 0.1, size: 250 },
      { price: mid - 0.2, size: 400 },
    ],
    asks: [
      { price: mid + 0.05, size: 110 },
      { price: mid + 0.1, size: 230 },
      { price: mid + 0.2, size: 380 },
    ],
  });
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  const method = req.method ?? "GET";

  if (method === "OPTIONS") {
    res.writeHead(204, {
      "access-control-allow-origin": "*",
      "access-control-allow-methods": "GET,POST,OPTIONS",
      "access-control-allow-headers": "content-type",
    });
    res.end();
    return;
  }

  void (async () => {
    if (method === "GET" && path === "/healthz") {
      sendJson(res, 200, { ok: true, service: "@scios/execution-simulator" });
      return;
    }
    if (method === "POST" && path === "/order/submit") {
      await handleSubmit(req, res);
      return;
    }
    if (method === "GET" && path === "/order/book") {
      handleBook(req, res);
      return;
    }
    if (method === "GET" && path === "/orders") {
      sendJson(res, 200, { orders });
      return;
    }
    sendJson(res, 404, { error: "not_found" });
  })().catch((err) => {
    log.error("unhandled", {
      error: err instanceof Error ? err.message : String(err),
    });
    sendJson(res, 500, { error: "internal_error" });
  });
});

server.listen(PORT, BIND, () => {
  log.info("listening", { port: PORT, riskEngineUrl: RISK_ENGINE_URL });
});
