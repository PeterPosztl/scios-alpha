const CONTROL_URL =
  process.env.CONTROL_URL ?? "http://127.0.0.1:5200";

const payload = {
  instrumentId: "AAPL",
  horizonSec: 3600,
  size: 10,
};

async function main(): Promise<void> {
  console.log(`[demo] POST ${CONTROL_URL}/demo/predict-and-simulate`);
  console.log(`[demo] body`, JSON.stringify(payload));

  const res = await fetch(`${CONTROL_URL}/demo/predict-and-simulate`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });

  const text = await res.text();
  let body: unknown = text;
  try {
    body = JSON.parse(text) as unknown;
  } catch {
    /* keep raw */
  }

  console.log(`[demo] status ${res.status}`);
  console.log(JSON.stringify(body, null, 2));

  if (!res.ok) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error("[demo] failed:", err);
  process.exit(1);
});
