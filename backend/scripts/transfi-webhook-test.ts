/**
 * TransFi webhook route integration test.
 *
 * Drives the REAL HTTP route against a running backend, which is the only way to
 * exercise the parts that unit tests cannot reach:
 *
 *   - route registration (file-routed discovery of webhook.post.ts)
 *   - `requiresAuth: false` actually making the route public
 *   - raw-body capture surviving the uWS chunk pipeline, including a body with
 *     multi-byte UTF-8 (the regression this platform had: each chunk was decoded
 *     separately, so a split sequence became U+FFFD and the HMAC never matched)
 *   - signature rejection producing a NON-200, which is what makes TransFi retry
 *
 * Usage:  cd backend && npx tsx scripts/transfi-webhook-test.ts [baseUrl]
 */

import "../module-alias-setup";
import "../load-env";
import crypto from "crypto";

const BASE = process.argv[2] || process.env.APP_BACKEND_URL || "http://localhost:4000";
const URL_PATH = "/api/finance/deposit/fiat/transfi/webhook";
const SECRET = process.env.APP_TRANSFI_WEBHOOK_SECRET || "";

let pass = 0;
let fail = 0;
const failures: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? ` — ${detail}` : ""}`);
  } else {
    fail++;
    failures.push(name);
    console.log(`  FAIL  ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

function sign(body: string): string {
  return crypto.createHmac("sha256", Buffer.from(SECRET, "utf8")).update(body, "utf8").digest("hex");
}

async function post(body: string, signature?: string) {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (signature !== undefined) headers["X-Transfi-Hmac-Hash"] = signature;
  const res = await fetch(`${BASE}${URL_PATH}`, { method: "POST", headers, body });
  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    json = { _raw: text.slice(0, 300) };
  }
  return { status: res.status, json };
}

function payload(over: Record<string, any> = {}) {
  return JSON.stringify({
    eventId: `EV-${Date.now()}${Math.floor(performance.now() % 1000)}`,
    eventType: "order",
    entityId: "OR-nonexistent-e2e",
    status: "initiated",
    order: {
      orderId: "OR-nonexistent-e2e",
      orderType: "payin",
      status: "initiated",
      depositCurrency: "KES",
      depositAmount: 1000,
    },
    ...over,
  });
}

async function main() {
  console.log(`\nTarget: ${BASE}${URL_PATH}`);
  if (!SECRET) {
    console.error("APP_TRANSFI_WEBHOOK_SECRET is not set; cannot sign anything.");
    process.exit(1);
  }

  console.log("\n=== Reachability ===");
  // Build the body ONCE. `payload()` mints a fresh eventId per call, so signing
  // a second invocation signs a different body and the request 401s.
  const probeBody = payload();
  const probe = await post(probeBody, sign(probeBody));
  check(
    "route is registered and public (no auth challenge)",
    probe.status !== 404 && probe.status !== 401,
    `HTTP ${probe.status} ${JSON.stringify(probe.json).slice(0, 160)}`
  );
  if (probe.status === 404) {
    console.error("\nRoute not found — is the backend running and the route compiled?");
    process.exit(1);
  }

  console.log("\n=== Signature enforcement ===");
  const b1 = payload();
  const good = await post(b1, sign(b1));
  check("correctly signed webhook is accepted", good.status === 200, `HTTP ${good.status}`);

  const b2 = payload();
  const bad = await post(b2, "0".repeat(64));
  check(
    "wrong signature is REJECTED with a non-200 (so TransFi retries)",
    bad.status === 401,
    `HTTP ${bad.status}`
  );

  const b3 = payload();
  const none = await post(b3);
  check(
    "missing signature header is rejected (endpoint is not open)",
    none.status === 401,
    `HTTP ${none.status}`
  );

  const b4 = payload();
  const tampered = await post(b4.replace('"depositAmount":1000', '"depositAmount":999999'), sign(b4));
  check(
    "tampered body is rejected (amount cannot be inflated in flight)",
    tampered.status === 401,
    `HTTP ${tampered.status}`
  );

  console.log("\n=== Raw-body integrity (chunk-boundary regression) ===");
  // Multi-byte UTF-8 in the payer name is exactly where the old per-chunk decode
  // corrupted the body. If raw-body capture is wrong, this signature fails.
  const unicodeBody = JSON.stringify({
    eventId: `EV-uni-${Date.now()}`,
    entityId: "OR-nonexistent-e2e",
    status: "initiated",
    order: {
      orderId: "OR-nonexistent-e2e",
      orderType: "payin",
      status: "initiated",
      senderName: "Aminata Traoré",
      city: "Abidjan — Côte d’Ivoire",
      note: "日本語テスト ‒ ünïcödé",
    },
  });
  const uni = await post(unicodeBody, sign(unicodeBody));
  check(
    "non-ASCII body verifies (raw bytes preserved through uWS chunking)",
    uni.status === 200,
    `HTTP ${uni.status} ${JSON.stringify(uni.json).slice(0, 140)}`
  );

  // A body large enough to be delivered in more than one chunk, with multi-byte
  // characters placed throughout so a boundary is very likely to split one.
  const filler = "Aminata Traoré — Côte d’Ivoire — 日本語 ".repeat(4000);
  const bigBody = JSON.stringify({
    eventId: `EV-big-${Date.now()}`,
    entityId: "OR-nonexistent-e2e",
    status: "initiated",
    order: { orderId: "OR-nonexistent-e2e", orderType: "payin", status: "initiated", filler },
  });
  const big = await post(bigBody, sign(bigBody));
  check(
    `large multi-chunk non-ASCII body verifies (${Buffer.byteLength(bigBody)} bytes)`,
    big.status === 200,
    `HTTP ${big.status}`
  );

  console.log("\n=== Unknown-order handling ===");
  check(
    "unknown order is ACKed, not retried forever",
    good.status === 200 && /unknown order|no order/i.test(JSON.stringify(good.json)),
    JSON.stringify(good.json).slice(0, 160)
  );

  console.log("\n=== Malformed input ===");
  const notJson = await post("this is not json", sign("this is not json"));
  check(
    "non-JSON body does not 500",
    notJson.status !== 500,
    `HTTP ${notJson.status}`
  );

  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(60)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => {
  console.error("\nHarness crashed:", e);
  process.exit(1);
});
