/**
 * TransFi sandbox end-to-end harness.
 *
 * Exercises the real API through the same client the gateway uses, so a pass
 * here means the gateway's assumptions hold against the live service rather than
 * against the docs (which contradict the live API in several places).
 *
 * Usage:  cd backend && npx tsx scripts/transfi-e2e.ts [--create-order]
 *
 * `--create-order` is opt-in because it consumes a partnerId and leaves an order
 * on the MID. Everything else is read-only.
 *
 * Requires APP_TRANSFI_* in the environment (loaded from the repo .env below).
 */

import "../module-alias-setup";
import "../load-env";

import {
  getTransfiConfig,
  transfiRequest,
  listSupportedCurrencies,
  listPaymentMethods,
  getQuote,
  intersectLimits,
  mapTransfiStatus,
  isComplianceHold,
  normaliseOrder,
  parseGatewayCurrencies,
  verifyTransfiWebhookSignature,
  signTransfiPayload,
  TRANSFI_PURPOSE_CODES,
  TransfiError,
  transfiWebhookUrl,
} from "../src/api/finance/deposit/fiat/transfi/utils";
import { splitPhone } from "../src/api/finance/deposit/fiat/transfi/user";

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

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

async function main() {
  const createOrder = process.argv.includes("--create-order");
  const config = getTransfiConfig();

  section("Configuration");
  console.log(`  baseUrl  : ${config.baseUrl}`);
  console.log(`  sandbox  : ${config.sandbox}`);
  console.log(`  mid      : ${config.mid}`);
  console.log(`  webhook  : ${transfiWebhookUrl()}`);
  check("credentials present", !!(config.username && config.password && config.mid));
  check("webhook secret present", !!config.webhookSecret);
  check(
    "pointing at sandbox (refuse to run destructive tests against production)",
    config.sandbox,
    config.baseUrl
  );
  if (!config.sandbox) {
    console.log("\nRefusing to continue against production.");
    process.exit(1);
  }

  section("Auth + balance");
  const balance = await transfiRequest<any>("/v3/balance");
  check("GET /v3/balance authenticates", balance?.status === "success");
  check("balance envelope has data", balance?.data !== undefined, JSON.stringify(balance?.data));

  section("MID discovery");
  const mids = await transfiRequest<any>("/v3/config/list-mids", { query: { limit: 25 } });
  const midList = (mids?.data || []).map((m: any) => m.mid);
  check("configured MID is present on the account", midList.includes(config.mid), midList.join(","));
  check(
    "MID is active",
    (mids?.data || []).some((m: any) => m.mid === config.mid && m.status === "active")
  );

  section("Currency + payment-method discovery");
  const currencies = await listSupportedCurrencies("deposit");
  check("deposit currencies returned", currencies.length > 0, `${currencies.length} currencies`);
  const zeroDp = currencies.filter((c) => c.decimalPrecision === 0).map((c) => c.currency);
  check(
    "zero-decimal currencies are reported (must not assume 2dp)",
    zeroDp.length > 0,
    zeroDp.join(",")
  );

  const corridor = currencies.find((c) => c.currency === "KES") ? "KES" : currencies[0].currency;
  const methods = await listPaymentMethods(corridor, "deposit");
  check(`payment methods for ${corridor}`, methods.length > 0, methods.map((m) => m.paymentCode).join(","));

  const unknown = await listPaymentMethods("ZAR", "deposit");
  check(
    "a currency the MID has not enabled yields [] rather than throwing",
    Array.isArray(unknown) && unknown.length === 0
  );

  section("Quote + limit intersection");
  const method = methods[0];
  const quote = await getQuote({
    sourceCurrency: corridor,
    destinationCurrency: corridor,
    amount: 5000,
    orderType: "payin",
    paymentCode: method.paymentCode,
    paymentType: method.paymentType,
  });
  check("quote returns a rate", Number.isFinite(quote.conversionRate), `rate=${quote.conversionRate}`);
  check("same-currency payin quotes at rate 1 (no FX)", quote.conversionRate === 1);
  check(
    "fee is denominated in the source currency",
    Math.abs(quote.totalFee - 5000 * quote.processingFeeRate) < 0.01,
    `fee=${quote.totalFee} rate=${quote.processingFeeRate}`
  );
  check(
    "destinationAmount is net of TransFi's fee",
    Math.abs(quote.destinationAmount - (5000 - quote.totalFee)) < 0.01,
    `dest=${quote.destinationAmount}`
  );

  const limits = intersectLimits(quote, method);
  check(
    "limits intersect quote and method (both bind)",
    limits.min >= (quote.minLimit || 0) && limits.min >= (method.minAmount || 0),
    `effective ${limits.min}..${limits.max} (quote ${quote.minLimit}..${quote.maxLimit}, method ${method.minAmount}..${method.maxAmount})`
  );

  section("Purpose codes");
  try {
    await transfiRequest("/v3/orders", {
      method: "POST",
      body: {
        userId: "UX-000000000000000000",
        orderType: "payin",
        purposeCode: "__definitely_not_valid__",
        source: { currency: corridor },
        destination: { currency: corridor },
      },
    });
    check("bogus purposeCode is rejected", false, "the API accepted it");
  } catch (error: any) {
    const isValidation = error instanceof TransfiError && error.code === "VALIDATION_ERROR";
    check("bogus purposeCode is rejected with VALIDATION_ERROR", isValidation, error?.code);
    const msg = error?.details?.[0]?.message || "";
    const live = msg.replace(/^.*one of:\s*/, "").split("|").map((s: string) => s.trim()).filter(Boolean);
    // TransFi's own error string omits a separator between two codes, so the
    // live split yields one fewer entry than the real enum.
    check(
      "our purposeCode constant covers the live enum",
      live.length > 0 && live.every((c: string) => (TRANSFI_PURPOSE_CODES as readonly string[]).some((k) => c.includes(k))),
      `${live.length} live vs ${TRANSFI_PURPOSE_CODES.length} constant`
    );
  }

  section("Error envelope handling");
  try {
    await transfiRequest("/v3/orders/OR-does-not-exist-000");
    check("unknown order is an error", false, "the API returned success");
  } catch (error: any) {
    check("unknown order raises a TransfiError", error instanceof TransfiError, error?.code);
    check("error carries a traceId for support", !!error?.traceId, error?.traceId);
  }

  section("Status mapping (orderType, rail)");
  check("payin fiat fund_settled -> COMPLETED", mapTransfiStatus("payin", "fund_settled", "fiat") === "COMPLETED");
  check("payout fiat fund_settled -> COMPLETED", mapTransfiStatus("payout", "fund_settled", "fiat") === "COMPLETED");
  check("payin crypto asset_settled -> COMPLETED", mapTransfiStatus("payin", "asset_settled", "crypto") === "COMPLETED");
  check(
    "payin crypto asset_deposited is NOT success (that is a payout status)",
    mapTransfiStatus("payin", "asset_deposited", "crypto") === "PENDING"
  );
  check("fund_processing -> PENDING (webhook never emits it)", mapTransfiStatus("payin", "fund_processing", "fiat") === "PENDING");
  check("manual_review -> PENDING not FAILED", mapTransfiStatus("payin", "manual_review", "fiat") === "PENDING");
  check("manual_review is flagged as a compliance hold", isComplianceHold("manual_review"));
  check("unknown status -> PENDING, never FAILED", mapTransfiStatus("payin", "some_new_state_2027", "fiat") === "PENDING");

  section("Order normalisation across the three naming conventions");
  check(
    "create shape (orderId)",
    normaliseOrder({ orderId: "OR-1", status: "fund_settled", orderType: "payin" }).orderId === "OR-1"
  );
  check(
    "get shape (id + type, string amounts)",
    (() => {
      const n = normaliseOrder({ id: "OR-2", status: "fund_settled", type: "payin", source: { currency: "KES", amount: "1000" } });
      return n.orderId === "OR-2" && n.sourceAmount === 1000;
    })()
  );
  check(
    "webhook shape (depositCurrency/withdrawAmount)",
    (() => {
      const n = normaliseOrder({ orderId: "OR-3", status: "fund_settled", orderType: "payin", depositCurrency: "KES", depositAmount: 1000, withdrawCurrency: "KES", withdrawAmount: 980 });
      return n.sourceCurrency === "KES" && n.destinationAmount === 980;
    })()
  );

  section("Webhook signature");
  const payload = JSON.stringify({
    eventId: "EV-260305125748417",
    order: { orderId: "OR-1", senderName: "Aminata Traoré" },
    status: "fund_settled",
  });
  const sig = signTransfiPayload(payload);
  check("raw-body signature verifies", verifyTransfiWebhookSignature(payload, sig).valid);
  check("variant reported as raw", verifyTransfiWebhookSignature(payload, sig).variant === "raw");
  check("tampered body is rejected", !verifyTransfiWebhookSignature(payload + " ", sig).valid);
  check("missing header is rejected", !verifyTransfiWebhookSignature(payload, undefined).valid);
  check("wrong signature is rejected", !verifyTransfiWebhookSignature(payload, "0".repeat(64)).valid);
  check(
    "uppercase signature still verifies (case-insensitive hex)",
    verifyTransfiWebhookSignature(payload, sig.toUpperCase()).valid
  );
  const nonAscii = JSON.stringify({ name: "Aminata Traoré", city: "Abidjan — Côte d’Ivoire" });
  check(
    "non-ASCII body verifies (chunk-boundary regression guard)",
    verifyTransfiWebhookSignature(nonAscii, signTransfiPayload(nonAscii)).valid
  );

  section("Gateway currency allowlist parsing (MySQL JSON returns string OR array)");
  // Regression guard: `depositGateway.currencies` has no model getter, so the
  // driver returns a raw string on some MySQL configurations. An
  // `Array.isArray(...) ? ... : []` check reads as safe but silently disables the
  // operator's allowlist wherever that happens.
  check("array form", parseGatewayCurrencies(["KES", "ngn"]).join(",") === "KES,NGN");
  check("JSON string form", parseGatewayCurrencies('["KES","NGN"]').join(",") === "KES,NGN");
  check("comma string form", parseGatewayCurrencies("KES, ngn").join(",") === "KES,NGN");
  check("null/undefined -> [] (no allowlist configured)", parseGatewayCurrencies(null).length === 0);
  check(
    "a populated allowlist NEVER degrades to empty (which would allow everything)",
    parseGatewayCurrencies('["KES"]').length === 1
  );

  section("Phone splitting (E.164 -> phoneCode + national)");
  check("Kenya", JSON.stringify(splitPhone("+254712345678")) === JSON.stringify({ phoneCode: "+254", phone: "712345678" }));
  check("Nigeria", JSON.stringify(splitPhone("+2348012345678")) === JSON.stringify({ phoneCode: "+234", phone: "8012345678" }));
  check("UK", JSON.stringify(splitPhone("+447911123456")) === JSON.stringify({ phoneCode: "+44", phone: "7911123456" }));
  check("US", JSON.stringify(splitPhone("+14155552671")) === JSON.stringify({ phoneCode: "+1", phone: "4155552671" }));
  check("rejects a non-E.164 string", splitPhone("0712345678") === null);

  if (createOrder) {
    section("Create payin order (live, consumes a partnerId)");
    const users = await transfiRequest<any>("/v3/users/individual", { query: { limit: 100 } });
    const usable = (users?.data || []).find((u: any) => u.status === "user_active");
    if (!usable) {
      console.log("  SKIP  no user with status=user_active exists on this MID.");
      console.log("        Every user is currently user_rejected (TransFi's email");
      console.log("        deliverability check). A deliverable mailbox or a TransFi");
      console.log("        support reset is required before this can run.");
    } else {
      const partnerId = `v5-e2e-${Date.now()}`;
      const { createPayinOrder } = await import("../src/api/finance/deposit/fiat/transfi/utils");
      const order = await createPayinOrder({
        transfiUserId: usable.userId,
        partnerId,
        sourceCurrency: corridor,
        amount: Math.max(limits.min, 200),
        paymentCode: method.paymentCode,
        paymentType: method.paymentType,
        successRedirectUrl: "https://example.com/ok",
        failureRedirectUrl: "https://example.com/fail",
      });
      check("order created", !!order.orderId, order.orderId);
      check("payUrl returned", !!order.payUrl, order.payUrl);

      const fetched = await (await import("../src/api/finance/deposit/fiat/transfi/utils")).getOrder(order.orderId);
      check("order is retrievable", fetched.orderId === order.orderId, `status=${fetched.status}`);
      check("GET does NOT return payUrl (must persist it at creation)", !(fetched.raw as any)?.payUrl);

      try {
        await createPayinOrder({
          transfiUserId: usable.userId,
          partnerId,
          sourceCurrency: corridor,
          amount: Math.max(limits.min, 200),
          paymentCode: method.paymentCode,
          paymentType: method.paymentType,
          successRedirectUrl: "https://example.com/ok",
          failureRedirectUrl: "https://example.com/fail",
        });
        check("duplicate partnerId is rejected", false, "it was accepted");
      } catch (error: any) {
        check(
          "duplicate partnerId is rejected (native idempotency)",
          error instanceof TransfiError,
          error?.code
        );
      }
    }
  }

  console.log(`\n${"-".repeat(60)}`);
  console.log(`  ${pass} passed, ${fail} failed`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(60)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((error) => {
  console.error("\nHarness crashed:", error);
  process.exit(1);
});
