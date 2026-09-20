/**
 * Binary options integrity verification — runs against YOUR REAL DATABASE.
 *
 *   cd backend
 *   npm run verify:binary          # read-only audit, safe on production
 *   npm run verify:binary:fix      # + backfill unambiguous binaryMarket.source rows
 *   npm run verify:binary:live     # + place and settle a real throwaway order, then delete it
 *
 * (npm swallows a bare `--fix`, hence the dedicated script rather than a flag.)
 *
 * WHY THIS EXISTS ALONGSIDE tests/binary-engine/
 * ----------------------------------------------
 * That harness runs the real modules against an in-memory database. It proves the LOGIC
 * is correct but says nothing about YOUR install: whether the schema actually migrated,
 * whether your markets are configured coherently, whether ScyllaDB is reachable, or
 * whether the orders already settled on your box are internally consistent.
 *
 * This script answers those questions against live data.
 *
 * READ-ONLY MODE (the default) writes NOTHING. It is safe to run on production and is the
 * mode you want after a deploy. It checks the deployed schema, flags misconfigured
 * markets, and audits every settled order and admin-profit row that already exists.
 *
 * LIVE MODE (--live) additionally creates a throwaway user, wallet, ecosystem market and
 * binary market, places real orders through the production BinaryOrderService, settles
 * them, asserts the money moved correctly, and then DELETES everything it created. It
 * refuses to run when NODE_ENV=production unless --force is also passed.
 */

import "../module-alias-setup";
import path from "path";
import fs from "fs";

for (const envPath of [
  path.resolve(process.cwd(), ".env"),
  path.resolve(__dirname, "../../.env"),
  path.resolve(__dirname, "../.env"),
]) {
  if (fs.existsSync(envPath)) {
    require("dotenv").config({ path: envPath, quiet: true });
    break;
  }
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------

const RESET = "\x1b[0m";
const RED = "\x1b[31m";
const GREEN = "\x1b[32m";
const YELLOW = "\x1b[33m";
const DIM = "\x1b[2m";

let passed = 0;
let failed = 0;
let warned = 0;

function pass(label: string, detail = ""): void {
  passed++;
  console.log(`  ${GREEN}PASS${RESET}  ${label}${detail ? ` ${DIM}— ${detail}${RESET}` : ""}`);
}

function fail(label: string, detail: string, remedy?: string): void {
  failed++;
  console.log(`  ${RED}FAIL${RESET}  ${label} ${DIM}— ${detail}${RESET}`);
  if (remedy) console.log(`        ${YELLOW}fix:${RESET} ${remedy}`);
}

function warn(label: string, detail: string): void {
  warned++;
  console.log(`  ${YELLOW}WARN${RESET}  ${label} ${DIM}— ${detail}${RESET}`);
}

function section(title: string): void {
  console.log(`\n${title}`);
  console.log("-".repeat(Math.min(78, title.length + 20)));
}

function check(label: string, ok: boolean, detail: string, remedy?: string): void {
  if (ok) pass(label, detail);
  else fail(label, detail, remedy);
}

function money(n: number): string {
  return Number.isFinite(n) ? n.toFixed(8).replace(/\.?0+$/, "") : String(n);
}

// ---------------------------------------------------------------------------
// read-only audit
// ---------------------------------------------------------------------------

async function auditSchema(models: any, sequelize: any): Promise<void> {
  section("1. Deployed schema");

  const qi = sequelize.getQueryInterface();

  try {
    const columns = await qi.describeTable("binary_market");
    check(
      "binaryMarket.source column exists",
      !!columns.source,
      columns.source
        ? `type ${columns.source.type}`
        : "column missing — every market will be treated as EXCHANGE-backed",
      "restart the backend so the model auto-sync adds it, or add the ENUM('EXCHANGE','ECOSYSTEM') column manually"
    );
  } catch (error: any) {
    fail(
      "binaryMarket.source column exists",
      `could not describe binary_market: ${error.message}`,
      "check DB credentials and that the binary tables exist"
    );
  }

  // The engine tables are optional (the addon may not be installed).
  if (!models.binaryAiEngine) {
    warn("Binary AI Engine tables", "addon not installed — steering checks will be skipped");
  } else {
    pass("Binary AI Engine tables present");
  }
}

async function auditMarketConfiguration(models: any, fix: boolean): Promise<void> {
  section("2. Market configuration");

  const binaryMarkets = await models.binaryMarket.findAll({ where: { status: true } });
  if (binaryMarkets.length === 0) {
    warn("active binary markets", "none configured");
    return;
  }
  pass("active binary markets", `${binaryMarkets.length}`);

  let ecosystemBacked = 0;
  const problems: string[] = [];
  const repaired: string[] = [];

  for (const market of binaryMarkets) {
    const symbol = `${market.currency}/${market.pair}`;
    const source = (market as any).source === "ECOSYSTEM" ? "ECOSYSTEM" : "EXCHANGE";

    const ecosystemMarket = models.ecosystemMarket
      ? await models.ecosystemMarket.findOne({
          where: { currency: market.currency, pair: market.pair },
        })
      : null;
    const exchangeMarket = await models.exchangeMarket.findOne({
      where: { currency: market.currency, pair: market.pair },
    });

    if (source === "ECOSYSTEM") {
      ecosystemBacked++;
      if (!ecosystemMarket) {
        problems.push(`${symbol}: source=ECOSYSTEM but no ecosystem market exists`);
      }
    } else if (!exchangeMarket || !exchangeMarket.metadata) {
      // This is the exact configuration that 404s on every order. When an ecosystem
      // market exists and an exchange one does not, the correct source is not a guess —
      // EXCHANGE cannot work at all — so --fix may repair it. Rows where BOTH exist are
      // genuinely ambiguous and are always left to the operator.
      if (ecosystemMarket && fix) {
        await models.binaryMarket.update(
          { source: "ECOSYSTEM" },
          { where: { id: market.id } }
        );
        repaired.push(`${symbol}: source EXCHANGE -> ECOSYSTEM`);
        ecosystemBacked++;
      } else {
        problems.push(
          ecosystemMarket
            ? `${symbol}: source=EXCHANGE but only an ECOSYSTEM market exists — every order will be rejected (repairable with --fix)`
            : `${symbol}: no exchange market data — every order will be rejected`
        );
      }
    }

    // A market maker + engine on an EXCHANGE-backed binary market cannot steer, because
    // the platform does not publish that tape.
    const currentSource = repaired.some((r) => r.startsWith(`${symbol}:`))
      ? "ECOSYSTEM"
      : source;
    if (currentSource === "EXCHANGE" && ecosystemMarket && models.aiMarketMaker) {
      const mm = await models.aiMarketMaker.findOne({
        where: { marketId: ecosystemMarket.id },
      });
      if (mm) {
        problems.push(
          `${symbol}: has an AI Market Maker but source=EXCHANGE — the engine cannot steer it and it prices off the exchange`
        );
      }
    }
  }

  if (repaired.length) {
    console.log(`  ${YELLOW}FIXED${RESET} ${repaired.join("; ")}`);
  }

  check(
    "every active binary market has a usable price source",
    problems.length === 0,
    problems.length ? problems.join("; ") : `${binaryMarkets.length} checked, ${ecosystemBacked} ecosystem-backed`,
    "run with --fix to repair unambiguous cases, or set `source` yourself in admin > Binary Markets"
  );
}

async function auditSettledOrders(models: any): Promise<void> {
  section("3. Settled orders — is the history self-consistent?");

  const { Op } = await import("sequelize");
  const orders = await models.binaryOrder.findAll({
    where: {
      type: "RISE_FALL",
      status: { [Op.in]: ["WIN", "LOSS", "DRAW"] },
      isDemo: false,
    },
    order: [["createdAt", "DESC"]],
    limit: 5000,
  });

  if (orders.length === 0) {
    warn("settled RISE_FALL orders", "none found — nothing to audit yet");
    return;
  }

  const contradictions: string[] = [];
  const badPayouts: string[] = [];
  let houseProfit = 0;
  let turnover = 0;
  let wins = 0;

  for (const order of orders) {
    const entry = Number(order.price);
    const close = Number(order.closePrice);
    const amount = Number(order.amount) || 0;
    const profit = Number(order.profit) || 0;
    const pct = Number(order.profitPercentage);

    turnover += amount;
    if (order.status === "WIN") {
      wins++;
      houseProfit -= profit;
    } else if (order.status === "LOSS") {
      houseProfit += profit === 0 ? amount : -profit;
    }

    if (!Number.isFinite(close) || !Number.isFinite(entry)) continue;

    // The artifact a client can screenshot: an outcome the recorded prices contradict.
    const expected =
      close > entry
        ? order.side === "RISE"
          ? "WIN"
          : "LOSS"
        : close < entry
          ? order.side === "RISE"
            ? "LOSS"
            : "WIN"
          : "DRAW";
    if (expected !== order.status && contradictions.length < 5) {
      contradictions.push(
        `${order.id}: ${order.side} entry ${money(entry)} close ${money(close)} => ${order.status} (prices say ${expected})`
      );
    }

    // A win must pay exactly the advertised rate.
    if (order.status === "WIN" && Number.isFinite(pct) && pct > 0) {
      const expectedProfit = amount * (pct / 100);
      if (Math.abs(expectedProfit - profit) > 1e-6 && badPayouts.length < 5) {
        badPayouts.push(
          `${order.id}: paid ${money(profit)}, advertised ${pct}% of ${money(amount)} = ${money(expectedProfit)}`
        );
      }
    }
    if (order.status === "WIN" && (!Number.isFinite(pct) || pct <= 0) && badPayouts.length < 5) {
      badPayouts.push(`${order.id}: WIN with no profitPercentage recorded`);
    }
  }

  check(
    "no settled order contradicts its own recorded prices",
    contradictions.length === 0,
    contradictions.length
      ? `${contradictions.length}+ found: ${contradictions.join("; ")}`
      : `${orders.length} orders checked`,
    "these rows predate the chart/history consistency fix; they cannot be repaired retroactively, but no NEW order should appear here"
  );

  check(
    "every win paid exactly the advertised percentage",
    badPayouts.length === 0,
    badPayouts.length ? badPayouts.join("; ") : `${wins} wins checked`,
    "a win paying more than advertised usually means profitPercentage was null and a fallback rate was used"
  );

  const winRate = orders.length ? wins / orders.length : 0;
  const edge = turnover > 0 ? (houseProfit / turnover) * 100 : 0;
  console.log(
    `  ${DIM}stats  ${orders.length} orders, ${money(turnover)} turnover, house ${money(houseProfit)} (${edge.toFixed(2)}%), user win rate ${(winRate * 100).toFixed(2)}%${RESET}`
  );
}

async function auditAdminAccounting(models: any): Promise<void> {
  section("4. Admin profit accounting");

  if (!models.adminProfit) {
    warn("adminProfit table", "not present");
    return;
  }

  const { Op } = await import("sequelize");

  const rows = await models.adminProfit.findAll({
    where: { type: "BINARY_ORDER" },
    order: [["createdAt", "ASC"]],
    limit: 50000,
  });
  const settled = await models.binaryOrder.findAll({
    where: { status: { [Op.in]: ["WIN", "LOSS"] }, isDemo: false },
    order: [["updatedAt", "ASC"]],
    limit: 50000,
  });

  if (settled.length === 0) {
    warn("settled binary orders", "none yet — nothing to reconcile");
    return;
  }

  // A Super Admin is a hard prerequisite: without one, collectPlatformFee and
  // recordPlatformLoss both drop their entries on the floor. That IS broken now.
  const superAdminRole = await models.role.findOne({ where: { name: "Super Admin" } });
  const superAdmin = superAdminRole
    ? await models.user.findOne({
        where: { roleId: superAdminRole.id },
        order: [["createdAt", "ASC"]],
      })
    : null;
  check(
    "a Super Admin exists to receive platform accounting",
    !!superAdmin,
    superAdmin ? `user ${superAdmin.id}` : "none configured",
    "create a user with the Super Admin role — every platform fee and payout is silently dropped without one"
  );

  // Binary accounting was added to this codebase after some installs had already been
  // trading. Rows written by code that no longer exists cannot be reconciled and must not
  // fail a deploy gate forever — but they must not be swept away either. The cutover is
  // the first binary adminProfit row; everything before it is legacy and reported, and
  // everything after it is held to full reconciliation.
  const cutover = rows.length ? new Date(rows[0].createdAt).getTime() : null;

  const houseProfitOf = (orders: any[]) =>
    orders.reduce((acc: number, o: any) => {
      const amount = Number(o.amount) || 0;
      const profit = Number(o.profit) || 0;
      if (o.status === "WIN") return acc - profit;
      return acc + (profit === 0 ? amount : -profit);
    }, 0);

  const legacy = cutover
    ? settled.filter((o: any) => new Date(o.updatedAt).getTime() < cutover)
    : settled;
  const current = cutover
    ? settled.filter((o: any) => new Date(o.updatedAt).getTime() >= cutover)
    : [];

  if (legacy.length) {
    warn(
      "legacy settled orders predate binary platform accounting",
      `${legacy.length} order(s), ${money(houseProfitOf(legacy))} of house P&L never booked` +
        ` — historical only; they cannot be reconciled and are excluded below`
    );
  }

  if (current.length === 0) {
    warn(
      "reconcilable binary orders",
      "none settled since accounting started — run `npm run verify:binary:live` to prove the current path books correctly"
    );
    return;
  }

  // The real check: for orders settled SINCE accounting started, the reported number must
  // equal the true house P&L. This is what catches the one-sided accounting defect, where
  // losing stakes were booked and winning payouts were not.
  const reported = rows.reduce((acc: number, r: any) => acc + (Number(r.amount) || 0), 0);
  const truth = houseProfitOf(current);
  const drift = reported - truth;

  check(
    "reported admin profit equals the true house result",
    Math.abs(drift) < 0.01,
    `reported ${money(reported)}, true ${money(truth)}${Math.abs(drift) >= 0.01 ? `, off by ${money(drift)}` : ""}`,
    "a positive drift means payouts are not being booked; a negative one means stakes are not"
  );

  const wins = current.filter((o: any) => o.status === "WIN");
  const payoutRows = rows.filter((r: any) => Number(r.amount) < 0);
  check(
    "user winnings are booked against the treasury, not just stakes collected",
    !(wins.length > 0 && payoutRows.length === 0),
    wins.length > 0 && payoutRows.length === 0
      ? `${wins.length} wins paid but 0 negative adminProfit rows — reported profit is gross stakes, not net`
      : `${rows.length - payoutRows.length} stake credits, ${payoutRows.length} payouts`,
    "recordPlatformLoss must run on every WIN; check the Super Admin wallet exists for the quote currency"
  );

  console.log(
    `  ${DIM}stats  ${current.length} reconcilable order(s), reported binary admin profit ${money(reported)}${RESET}`
  );
}

async function auditEngineConfiguration(models: any): Promise<void> {
  section("5. Binary AI Engine configuration");

  if (!models.binaryAiEngine) {
    warn("engines", "addon not installed — skipped");
    return;
  }

  const engines = await models.binaryAiEngine.findAll({});
  if (engines.length === 0) {
    warn("engines", "none configured");
    return;
  }

  const issues: string[] = [];
  for (const engine of engines) {
    const target = Number(engine.targetUserWinRate);
    const maxDailyLoss = Number(engine.maxDailyLoss);
    const maxSingle = Number(engine.maxSingleOrderExposure);

    if (!Number.isFinite(maxDailyLoss) || maxDailyLoss <= 0) {
      issues.push(`${engine.id}: maxDailyLoss not set — nothing bounds a forced-win payout`);
    }
    if (!Number.isFinite(maxSingle) || maxSingle <= 0) {
      issues.push(`${engine.id}: maxSingleOrderExposure not set — a single ticket is unbounded`);
    }

    // Break-even user win rate is 1/(1+payout). Above it the house loses by design.
    const mm = models.aiMarketMaker
      ? await models.aiMarketMaker.findByPk(engine.marketMakerId)
      : null;
    const market =
      mm && models.ecosystemMarket
        ? await models.ecosystemMarket.findByPk(mm.marketId)
        : null;

    if (market) {
      const binaryMarket = await models.binaryMarket.findOne({
        where: { currency: market.currency, pair: market.pair },
      });
      if (!binaryMarket) {
        issues.push(
          `${engine.id}: no binary market for ${market.currency}/${market.pair} — the engine has nothing to steer`
        );
      } else if ((binaryMarket as any).source !== "ECOSYSTEM") {
        issues.push(
          `${engine.id}: ${market.currency}/${market.pair} is EXCHANGE-backed — steering is disabled there because the published tape cannot be made to match`
        );
      }
    }

    if (Number.isFinite(target) && target > 0.5) {
      issues.push(`${engine.id}: targetUserWinRate ${target} is above any realistic break-even`);
    }
  }

  check(
    "every engine is coherently configured",
    issues.length === 0,
    issues.length ? issues.join("; ") : `${engines.length} engine(s) checked`,
    "set the missing risk limits, and make the engine's market ECOSYSTEM-backed if you want steering to apply"
  );
}

async function auditScylla(): Promise<void> {
  section("6. Ecosystem candle store (ScyllaDB)");

  try {
    const { getEcosystemCandleClose } = await import("@b/utils/safe-imports");
    const probe = await getEcosystemCandleClose("BTC/USDT", Date.now() - 120_000);
    // A null here is fine (no such market); what matters is that it did not throw.
    pass(
      "candle lookup path is reachable",
      probe == null ? "no candle for the probe symbol (expected)" : `probe close ${money(probe)}`
    );
  } catch (error: any) {
    fail(
      "candle lookup path is reachable",
      error.message,
      "ecosystem settlement falls back to the live price when Scylla is unreachable, which prices late settlements wrong"
    );
  }
}

// ---------------------------------------------------------------------------
// live mode
// ---------------------------------------------------------------------------

const TAG = "__verify_binary__";

/**
 * Purge artifacts from any previous run.
 *
 * `ecosystemMarket` and `binaryOrder` are PARANOID models, so a plain destroy only sets
 * `deletedAt` — the unique (currency, pair) index still holds, and the next run cannot
 * insert. Every cleanup here therefore uses `force: true`, and this sweep catches
 * anything a crashed run left behind.
 */
async function purgePreviousRuns(models: any): Promise<number> {
  const { Op } = await import("sequelize");
  const like = { [Op.like]: "VRFY%" };
  let removed = 0;

  for (const [model, where] of [
    [models.binaryOrder, { symbol: { [Op.like]: "VRFY%" } }],
    [models.binaryMarket, { currency: like }],
    [models.aiMarketMaker, null],
    [models.ecosystemMarket, { currency: like }],
  ] as Array<[any, any]>) {
    if (!model) continue;
    try {
      if (model === models.aiMarketMaker) {
        const stale = await models.ecosystemMarket?.findAll({
          where: { currency: like },
          paranoid: false,
        });
        for (const market of stale || []) {
          removed += await model.destroy({
            where: { marketId: market.id },
            force: true,
          });
        }
        continue;
      }
      removed += await model.destroy({ where, force: true });
    } catch {
      // best effort — the per-run cleanup is the primary mechanism
    }
  }
  return removed;
}

async function runLiveTest(models: any, sequelize: any): Promise<void> {
  section("7. Live order lifecycle (creates and then deletes real rows)");

  const swept = await purgePreviousRuns(models);
  if (swept > 0) {
    console.log(`  ${DIM}swept ${swept} artifact(s) from a previous run${RESET}`);
  }

  const created: Array<() => Promise<void>> = [];
  // Unique per run so a failed cleanup can never block the next attempt.
  const CURRENCY = `VRFY${Date.now().toString(36).slice(-4).toUpperCase()}`;
  const PAIR = "USDT";

  try {
    const { BinaryOrderService } = await import(
      "@b/api/exchange/binary/order/util/BinaryOrderService"
    );

    // --- throwaway market ---------------------------------------------------
    // ecosystemMarket.metadata has a validator that REQUIRES a `precision` object; a bare
    // marker object is rejected outright.
    const ecosystemMarket = await models.ecosystemMarket.create({
      currency: CURRENCY,
      pair: PAIR,
      status: false, // never tradable by real users
      metadata: {
        note: TAG,
        precision: { amount: 8, price: 8 },
        limits: { amount: { min: 1, max: 10_000 } },
      },
    });
    created.push(async () => {
      await models.ecosystemMarket.destroy({ where: { id: ecosystemMarket.id }, force: true });
    });

    const marketMaker = await models.aiMarketMaker.create({
      marketId: ecosystemMarket.id,
      status: "STOPPED",
      lastKnownPrice: 100,
    });
    created.push(async () => {
      await models.aiMarketMaker.destroy({ where: { id: marketMaker.id }, force: true });
    });

    const binaryMarket = await models.binaryMarket.create({
      currency: CURRENCY,
      pair: PAIR,
      source: "ECOSYSTEM",
      status: true,
      minAmount: 1,
      maxAmount: 10_000,
    });
    created.push(async () => {
      await models.binaryMarket.destroy({ where: { id: binaryMarket.id }, force: true });
    });

    // --- throwaway trader ---------------------------------------------------
    const user = await models.user.create({
      email: `verify-binary-${Date.now()}@localhost.invalid`,
      firstName: "Verify",
      lastName: "Binary",
      status: "INACTIVE",
    });
    created.push(async () => {
      await models.user.destroy({ where: { id: user.id }, force: true });
    });

    const wallet = await models.wallet.create({
      userId: user.id,
      type: "SPOT",
      currency: PAIR,
      balance: 1000,
      inOrder: 0,
    });
    created.push(async () => {
      await models.wallet.destroy({ where: { id: wallet.id }, force: true });
    });

    // --- place --------------------------------------------------------------
    const expiry = new Date(Math.ceil((Date.now() + 90_000) / 60_000) * 60_000);
    const order = await (BinaryOrderService as any).createOrder({
      userId: user.id,
      currency: CURRENCY,
      pair: PAIR,
      amount: 100,
      side: "RISE",
      type: "RISE_FALL",
      closedAt: expiry,
      isDemo: false,
      replication: { profitPercentage: 72 },
    });
    created.push(async () => {
      await models.binaryOrder.destroy({ where: { id: order.id }, force: true });
    });

    pass("an order can be placed on an ECOSYSTEM-backed binary market", `order ${order.id}`);
    check(
      "entry price comes from the market maker feed",
      Math.abs(Number(order.price) - 100) < 1e-6,
      `entry ${money(Number(order.price))}, market maker lastKnownPrice 100`
    );

    const heldWallet = await models.wallet.findByPk(wallet.id);
    check(
      "the stake is held, not debited",
      Math.abs(Number(heldWallet.balance) - 900) < 1e-6 &&
        Math.abs(Number(heldWallet.inOrder) - 100) < 1e-6,
      `balance ${money(Number(heldWallet.balance))}, inOrder ${money(Number(heldWallet.inOrder))}`
    );

    // --- settle -------------------------------------------------------------
    // Move the market up 1% and expire the order now.
    await models.aiMarketMaker.update(
      { lastKnownPrice: 101 },
      { where: { id: marketMaker.id } }
    );
    await models.binaryOrder.update(
      { closedAt: new Date() },
      { where: { id: order.id } }
    );

    await (BinaryOrderService as any).processOrder(
      user.id,
      order.id,
      `${CURRENCY}/${PAIR}`
    );

    const settled = await models.binaryOrder.findByPk(order.id);
    check(
      "a RISE order above entry settles as a WIN",
      settled.status === "WIN",
      `status ${settled.status}, close ${money(Number(settled.closePrice))}`
    );
    check(
      "the recorded close is consistent with the outcome",
      settled.status === "WIN"
        ? Number(settled.closePrice) > Number(settled.price)
        : Number(settled.closePrice) <= Number(settled.price),
      `entry ${money(Number(settled.price))}, close ${money(Number(settled.closePrice))}, ${settled.status}`
    );
    check(
      "the win paid exactly the advertised 72%",
      Math.abs(Number(settled.profit) - 72) < 1e-6,
      `profit ${money(Number(settled.profit))}`
    );

    const finalWallet = await models.wallet.findByPk(wallet.id);
    check(
      "the wallet received stake + payout and holds nothing",
      Math.abs(Number(finalWallet.balance) - 1072) < 1e-6 &&
        Math.abs(Number(finalWallet.inOrder)) < 1e-6,
      `balance ${money(Number(finalWallet.balance))}, inOrder ${money(Number(finalWallet.inOrder))}`
    );

    // --- the payout must be booked against the treasury ---------------------
    const { Op } = await import("sequelize");
    const lossRows = await models.adminProfit.findAll({
      where: { type: "BINARY_ORDER" },
      order: [["createdAt", "DESC"]],
      limit: 5,
    });
    const bookedPayout = lossRows.some(
      (r: any) =>
        Number(r.amount) < 0 &&
        String(r.description || "").includes(`${CURRENCY}/${PAIR}`)
    );
    check(
      "the payout was booked as a treasury loss",
      bookedPayout,
      bookedPayout
        ? "negative adminProfit row written"
        : "no negative adminProfit row — admin profit will overstate",
      "confirm a Super Admin user exists; platform accounting is skipped without one"
    );

    // The payout really left the Super Admin wallet, so put it back. Everything else this
    // run created is deleted outright; this is the one balance it MUTATED.
    created.push(async () => {
      await models.adminProfit.destroy({
        where: { description: { [Op.like]: `%${CURRENCY}/${PAIR}%` } },
        force: true,
      });
    });
    if (bookedPayout) {
      const { getSuperAdmin } = await import("@b/utils/fees");
      const superAdmin = await getSuperAdmin();
      if (superAdmin) {
        const adminWallet = await models.wallet.findOne({
          where: { userId: superAdmin.id, type: "SPOT", currency: PAIR },
        });
        if (adminWallet) {
          const restoreTo = Number(adminWallet.balance) + 72;
          created.push(async () => {
            await models.wallet.update(
              { balance: restoreTo },
              { where: { id: adminWallet.id } }
            );
            // Prove the restore, rather than trusting the write. This is the only
            // pre-existing balance the run touches.
            const after = await models.wallet.findByPk(adminWallet.id);
            check(
              "the treasury balance was restored after the test payout",
              Math.abs(Number(after.balance) - restoreTo) < 1e-6,
              `${money(Number(after.balance))}, expected ${money(restoreTo)}`,
              `UPDATE wallet SET balance = ${restoreTo} WHERE id = '${adminWallet.id}';`
            );
          });
        }
      }
    }

    // Ledger rows must go BEFORE the wallet and user they reference, or the foreign keys
    // block those deletes. Matching on the throwaway user covers every key shape the
    // settlement path writes; the referenceId clause additionally catches the
    // treasury-side platform-loss row, which belongs to the Super Admin.
    created.push(async () => {
      await models.transaction.destroy({
        where: {
          [Op.or]: [
            { userId: user.id },
            { walletId: wallet.id },
            { referenceId: { [Op.like]: `%${order.id}%` } },
          ],
        },
        force: true,
      });
    });
  } finally {
    section("8. Cleanup");
    let cleaned = 0;
    let cleanupFailures = 0;
    // Reverse order so children go before parents.
    for (const undo of created.reverse()) {
      try {
        await undo();
        cleaned++;
      } catch (error: any) {
        cleanupFailures++;
        console.log(`  ${RED}could not clean up:${RESET} ${error.message}`);
      }
    }
    check(
      "every row created by this run was removed",
      cleanupFailures === 0,
      `${cleaned} undone${cleanupFailures ? `, ${cleanupFailures} failed` : ""}`,
      `search for rows containing "${TAG}" or currency "VRFY" and delete them by hand`
    );

    // Prove it rather than assert it: nothing bearing the marker may survive.
    try {
      // paranoid:false so a soft-deleted row still counts as residue — it keeps the
      // unique index occupied and would block the next run.
      const leftoverOrders = await models.binaryOrder.count({
        where: { symbol: `${CURRENCY}/${PAIR}` },
        paranoid: false,
      });
      const leftoverMarkets = await models.binaryMarket.count({
        where: { currency: CURRENCY, pair: PAIR },
      });
      const leftoverEcosystem = models.ecosystemMarket
        ? await models.ecosystemMarket.count({
            where: { currency: CURRENCY, pair: PAIR },
            paranoid: false,
          })
        : 0;
      check(
        "no trace of the test run remains in the database",
        leftoverOrders === 0 && leftoverMarkets === 0 && leftoverEcosystem === 0,
        `${leftoverOrders} orders, ${leftoverMarkets} binary markets, ${leftoverEcosystem} ecosystem markets left behind`,
        `DELETE FROM binary_order WHERE symbol = '${CURRENCY}/${PAIR}'; DELETE FROM binary_market WHERE currency = '${CURRENCY}'; DELETE FROM ecosystem_market WHERE currency = '${CURRENCY}';`
      );
    } catch (error: any) {
      warn("residue check", error.message);
    }
  }
}

// ---------------------------------------------------------------------------
// entry point
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const live = args.includes("--live");
  const force = args.includes("--force");
  const fix = args.includes("--fix");

  console.log("Binary options integrity verification");
  console.log("=".repeat(78));
  console.log(
    `${DIM}mode: ${live ? "LIVE (writes throwaway rows, then deletes them)" : "read-only audit"}${fix ? " + REPAIR" : ""}${RESET}`
  );

  if (live && process.env.NODE_ENV === "production" && !force) {
    console.log(
      `\n${RED}Refusing to run live mode on production.${RESET} Re-run with --force if you are sure.`
    );
    process.exit(2);
  }

  const { models, sequelize } = await import("@b/db");

  try {
    await sequelize.authenticate();
  } catch (error: any) {
    console.log(`\n${RED}Cannot connect to the database:${RESET} ${error.message}`);
    console.log(`${DIM}Check DB_HOST / DB_NAME / DB_USER / DB_PASSWORD in your .env${RESET}`);
    process.exit(2);
  }

  await auditSchema(models, sequelize);
  await auditMarketConfiguration(models, fix);
  await auditSettledOrders(models);
  await auditAdminAccounting(models);
  await auditEngineConfiguration(models);
  await auditScylla();

  if (live) {
    await runLiveTest(models, sequelize);
  } else {
    console.log(
      `\n${DIM}Run with --live to additionally place and settle a real throwaway order.${RESET}`
    );
  }

  console.log("\n" + "=".repeat(78));
  console.log(
    `${passed} passed, ${failed} failed, ${warned} warnings`
  );
  console.log(`RESULT: ${failed === 0 ? `${GREEN}PASS${RESET}` : `${RED}FAIL${RESET}`}`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  // Sequelize buries the actual database message on `.original`; printing the wrapper
  // alone gives a stack with no cause, which is useless to whoever runs this.
  const sqlMessage = error?.original?.sqlMessage ?? error?.parent?.sqlMessage ?? null;
  const sql = error?.sql ?? error?.original?.sql ?? null;
  console.error(`\n${RED}Verification crashed:${RESET} ${error?.message || error}`);
  if (sqlMessage) console.error(`${RED}database says:${RESET} ${sqlMessage}`);
  if (sql) console.error(`${DIM}${String(sql).slice(0, 400)}${RESET}`);
  if (!sqlMessage) console.error(error);
  process.exit(3);
});
