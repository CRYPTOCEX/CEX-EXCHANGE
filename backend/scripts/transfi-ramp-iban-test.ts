/**
 * TransFi ramps (onramp / offramp) and virtual IBANs.
 *
 * Covers phases 8 and 9 against the live sandbox:
 *   - both ramps are OFF by default and refuse cleanly
 *   - `platform` custody refuses with 501 rather than half-working
 *   - `self` custody creates real onramp and offramp orders
 *   - offramp returns the deposit address the customer must send to
 *   - address validation rejects a malformed address before spending a partnerId
 *   - IBAN provisioning, idempotency (one per user per currency), and listing
 *
 * Usage:  cd backend && npx tsx scripts/transfi-ramp-iban-test.ts
 */

import "../module-alias-setup";
import "../load-env";

import { models } from "@b/db";
import { v4 as uuidv4 } from "uuid";
import { CacheManager } from "@b/utils/cache";
import { getTransfiConfig, transfiRequest, isUserUsable } from "../src/api/finance/deposit/fiat/transfi/utils";
import { listTokens, looksLikeAddress, getRampSettings } from "../src/api/finance/ramp/transfi/utils";

let pass = 0, fail = 0;
const failures: string[] = [];
const skips: string[] = [];
function check(n: string, ok: boolean, d = "") {
  if (ok) { pass++; console.log(`  PASS  ${n}${d ? ` — ${d}` : ""}`); }
  else { fail++; failures.push(n); console.log(`  FAIL  ${n}${d ? ` — ${d}` : ""}`); }
}
function skip(n: string, why: string) { skips.push(n); console.log(`  SKIP  ${n} — ${why}`); }
function section(t: string) { console.log(`\n=== ${t} ===`); }

const noopCtx = { step() {}, success() {}, fail() {}, warn() {}, debug() {} };

async function setSetting(key: string, value: string) {
  const [row] = await models.settings.findOrCreate({ where: { key }, defaults: { key, value } as any });
  await row.update({ value });
  await CacheManager.getInstance().clearCache?.();
}

async function call(mod: string, payload: any) {
  const handler = (await import(mod)).default as any;
  try {
    return { ok: true as const, result: await handler({ params: {}, query: {}, headers: {}, ctx: noopCtx, ...payload }) };
  } catch (e: any) {
    return { ok: false as const, statusCode: e?.statusCode, message: e?.message || "" };
  }
}
const ONRAMP = "../src/api/finance/ramp/transfi/onramp.post";
const OFFRAMP = "../src/api/finance/ramp/transfi/offramp.post";
const IBAN_POST = "../src/api/finance/deposit/fiat/transfi/iban.post";
const IBAN_GET = "../src/api/finance/deposit/fiat/transfi/iban.get";

async function main() {
  const config = getTransfiConfig();
  if (!config.sandbox) { console.error("Refusing to run against production."); process.exit(1); }

  section("Address shape validation (pre-flight, before a partnerId is spent)");
  check("valid EVM address accepted", looksLikeAddress("USDT", "0x543B6e338BEa06Db84402febb4f5ED01e389F76f"));
  check("EVM address of the wrong length rejected", !looksLikeAddress("USDT", "0x543B6e"));
  check("empty rejected", !looksLikeAddress("USDT", ""));
  check("Solana address accepted for a SOL token", looksLikeAddress("USDCSOL", "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM"));
  check("EVM address rejected for a SOL token", !looksLikeAddress("USDCSOL", "0x543B6e338BEa06Db84402febb4f5ED01e389F76f"));
  check("Algorand address accepted", looksLikeAddress("ALGO", "A".repeat(58)));

  section("Tokens available on this MID");
  const tokens = await listTokens("deposit");
  check("token list returned", tokens.length > 0, tokens.map((t) => `${t.cryptoTicker}/${t.network}`).join(" "));
  const usdt = tokens.find((t) => (t.cryptoTicker || "").toUpperCase() === "USDT");
  check("USDT/Ethereum present", !!usdt, usdt?.network);

  /* ---- fixtures ---- */
  const users = await transfiRequest<any>("/v3/users/individual", { query: { limit: 100 } });
  const usable = (users?.data || []).find((u: any) => isUserUsable(u) && u.email);
  if (!usable) { console.error("No usable TransFi payer with an email."); process.exit(1); }

  const role: any = await models.role.findOne({ order: [["id", "ASC"]] });
  // Clear any leftover from an interrupted run: user.email is UNIQUE, so a
  // crashed previous run would otherwise block every retry.
  const stale: any = await models.user.findOne({ where: { email: usable.email } });
  if (stale) {
    await models.transfiIban.destroy({ where: { userId: stale.id } });
    await models.transfiUser.destroy({ where: { userId: stale.id } });
    await models.transaction.destroy({ where: { userId: stale.id }, force: true });
    await models.wallet.destroy({ where: { userId: stale.id }, force: true });
    await models.user.destroy({ where: { id: stale.id }, force: true });
  }
  const u: any = await models.user.create({
    id: uuidv4(), email: usable.email,
    firstName: "Ramp", lastName: "Tester",
    phone: `+2547${String(Date.now()).slice(-8)}`,
    roleId: role.id, emailVerified: true, phoneVerified: true, status: "ACTIVE",
  });
  await models.transfiUser.destroy({ where: { transfiUserId: usable.userId } });
  await models.transfiUser.create({
    userId: u.id, transfiUserId: usable.userId, status: usable.status,
    basicKycStatus: usable.basicKycStatus || null, email: usable.email,
  });

  const prior: Record<string, string | undefined> = {};
  for (const k of ["transfiOnrampEnabled", "transfiOfframpEnabled", "transfiOnrampCustody", "transfiOfframpCustody", "transfiIbanEnabled"]) {
    const row: any = await models.settings.findOne({ where: { key: k } });
    prior[k] = row?.value;
  }

  const ADDR = "0x543B6e338BEa06Db84402febb4f5ED01e389F76f";

  try {
    section("Everything is OFF by default");
    for (const k of ["transfiOnrampEnabled", "transfiOfframpEnabled", "transfiIbanEnabled"]) await setSetting(k, "false");
    let r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "USDT", walletAddress: ADDR } });
    check("onramp refuses when disabled", !r.ok && r.statusCode === 404, r.ok ? "it ran" : r.message?.slice(0, 60));
    r = await call(OFFRAMP, { user: { id: u.id }, body: { amount: 20, token: "USDT", currency: "KES" } });
    check("offramp refuses when disabled", !r.ok && r.statusCode === 404);
    r = await call(IBAN_POST, { user: { id: u.id }, body: {} });
    check("IBAN refuses when disabled", !r.ok && r.statusCode === 404);

    section("Platform custody refuses rather than half-working");
    await setSetting("transfiOnrampEnabled", "true");
    await setSetting("transfiOnrampCustody", "platform");
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "USDT", walletAddress: ADDR } });
    check("onramp platform custody returns 501 with a reason", !r.ok && r.statusCode === 501,
      r.ok ? "it ran" : r.message?.slice(0, 100));
    await setSetting("transfiOfframpEnabled", "true");
    await setSetting("transfiOfframpCustody", "platform");
    r = await call(OFFRAMP, { user: { id: u.id }, body: { amount: 20, token: "USDT", currency: "KES" } });
    check("offramp platform custody returns 501", !r.ok && r.statusCode === 501);

    section("Self custody: settings read back correctly");
    await setSetting("transfiOnrampCustody", "self");
    await setSetting("transfiOfframpCustody", "self");
    const s = await getRampSettings();
    check("settings resolve", s.onrampEnabled && s.offrampEnabled && s.onrampCustody === "self" && s.offrampCustody === "self",
      JSON.stringify(s));

    section("Onramp validation");
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "NOTATOKEN", walletAddress: ADDR } });
    check("unknown token rejected", !r.ok && r.statusCode === 400, r.ok ? "" : r.message?.slice(0, 70));
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "USDT", walletAddress: "0xnope" } });
    check("malformed address rejected before the API call", !r.ok && r.statusCode === 400, r.ok ? "" : r.message?.slice(0, 70));
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "USDT" } });
    check("missing address rejected", !r.ok && r.statusCode === 400);
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: -1, currency: "KES", token: "USDT", walletAddress: ADDR } });
    check("negative amount rejected", !r.ok && r.statusCode === 400);

    section("Onramp creates a real order (self custody)");
    r = await call(ONRAMP, { user: { id: u.id }, body: { amount: 500, currency: "KES", token: "USDT", walletAddress: ADDR, paymentCode: "mpesa", paymentType: "local_wallet" } });
    check("onramp succeeded", r.ok && r.result?.success === true, r.ok ? JSON.stringify(r.result?.status || r.result?.data?.order_id) : r.message);
    if (r.ok && r.result?.success) {
      const d = r.result.data;
      check("order id returned", /^OR-/.test(d.order_id), d.order_id);
      check("hosted payUrl returned", /^https:\/\//.test(d.checkout_url || ""));
      check("estimated crypto quoted", Number(d.estimatedCrypto) > 0, String(d.estimatedCrypto));
      const row: any = await models.transaction.findByPk(d.transaction_id);
      const meta = JSON.parse(row.metadata || "{}");
      check("tracking row records the destination address", meta.walletAddress === ADDR);
      check("tracking row is NOT a DEPOSIT (nothing is credited in self custody)", row.type !== "DEPOSIT", row.type);
      check("payUrl persisted (GET /orders never returns it again)", !!meta.payUrl);
    }

    section("Offramp creates a real order and returns the deposit address");
    r = await call(OFFRAMP, {
      user: { id: u.id },
      body: { amount: 20, token: "USDT", currency: "KES", paymentCode: "mpesa", paymentType: "local_wallet",
              beneficiary: { firstName: "Ramp", lastName: "Tester", email: usable.email, phone: "712345678", phoneCode: "+254" } },
    });
    check("offramp succeeded", r.ok && r.result?.success === true, r.ok ? JSON.stringify(r.result?.status || r.result?.data?.order_id) : r.message);
    if (r.ok && r.result?.success) {
      const d = r.result.data;
      check("order id returned", /^OR-/.test(d.order_id), d.order_id);
      check("TransFi supplied the deposit address", /^0x[a-fA-F0-9]{40}$/.test(d.depositAddress || ""), d.depositAddress);
      check("network reported", !!d.network, d.network);
      check("fiat payout quoted", Number(d.youReceive) > 0, `${d.youReceive} ${d.currency}`);
      check("custody mode surfaced to the client", d.custody === "self");
      const row: any = await models.transaction.findByPk(d.transaction_id);
      const meta = JSON.parse(row.metadata || "{}");
      check("deposit address persisted (no endpoint re-issues it)", !!meta.depositAddress);
    }

    section("Virtual IBAN (phase 9)");
    await setSetting("transfiIbanEnabled", "true");
    await models.transfiIban.destroy({ where: { userId: u.id } });

    r = await call(IBAN_POST, {
      user: { id: u.id },
      body: { currency: "EUR", payerDetails: { street: "12 Ngong Road", city: "Nairobi", country: "KE" } },
    });
    check("IBAN issued", r.ok && r.result?.success === true, r.ok ? `${r.result?.status}` : r.message?.slice(0, 100));
    if (r.ok && r.result?.success) {
      const d = r.result.data;
      check("a real IBAN came back", /^[A-Z]{2}\d{2}[A-Z0-9]+$/.test(d.iban || ""), d.iban);
      check("BIC returned", !!d.bic, d.bic);
      check("bank named", !!d.bankName, d.bankName);
      check("status ACTIVE", d.status === "ACTIVE", d.status);

      const again = await call(IBAN_POST, { user: { id: u.id }, body: { currency: "EUR" } });
      check("a second request returns the EXISTING account, not a new one",
        again.ok && again.result?.status === "EXISTING" && again.result?.data?.iban === d.iban,
        again.ok ? again.result?.status : again.message);
      check("still exactly one IBAN row",
        (await models.transfiIban.count({ where: { userId: u.id } })) === 1);

      const list = await call(IBAN_GET, { user: { id: u.id }, query: {} });
      check("listing returns it", list.ok && list.result?.data?.[0]?.iban === d.iban);
      const refreshed = await call(IBAN_GET, { user: { id: u.id }, query: { refresh: "true" } });
      check("refresh does not break the listing", refreshed.ok && refreshed.result?.data?.length === 1);
    }
  } finally {
    section("Cleanup");
    for (const [k, v] of Object.entries(prior)) {
      if (v === undefined) await models.settings.destroy({ where: { key: k } });
      else await setSetting(k, v);
    }
    await models.transfiIban.destroy({ where: { userId: u.id } });
    await models.transfiUser.destroy({ where: { userId: u.id } });
    await models.transaction.destroy({ where: { userId: u.id }, force: true });
    // Wallets before the user: the ramps create an anchor wallet, and wallet has
    // an FK to user.
    await models.wallet.destroy({ where: { userId: u.id }, force: true });
    await models.user.destroy({ where: { id: u.id }, force: true });
    console.log("  settings restored, test user removed");
  }

  console.log(`\n${"-".repeat(64)}`);
  console.log(`  ${pass} passed, ${fail} failed, ${skips.length} skipped`);
  if (fail) console.log(`  failed: ${failures.join(", ")}`);
  console.log(`${"-".repeat(64)}\n`);
  process.exit(fail ? 1 : 0);
}

main().catch((e) => { console.error("\nHarness crashed:", e); process.exit(1); });
