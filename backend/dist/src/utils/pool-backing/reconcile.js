"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.accountTypesFor = accountTypesFor;
exports.readExchangeHoldings = readExchangeHoldings;
exports.readSpotLiabilities = readSpotLiabilities;
exports.readInFlight = readInFlight;
exports.readOpenObligations = readOpenObligations;
exports.readWaivedObligations = readWaivedObligations;
exports.computeGap = computeGap;
exports.driftDecision = driftDecision;
exports.toleranceFor = toleranceFor;
exports.readEcoCurrencies = readEcoCurrencies;
exports.chainsToRefresh = chainsToRefresh;
exports.readEcosystemSide = readEcosystemSide;
exports.runPoolBackingReconciliation = runPoolBackingReconciliation;
const crypto_1 = require("crypto");
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
const custody_1 = require("./custody");
function accountTypesFor(provider) {
    switch ((provider || "").toLowerCase()) {
        case "kucoin":
            return ["main", "trade"];
        case "binance":
        case "binanceus":
            return ["spot", "funding"];
        case "okx":
            return ["trading", "funding"];
        default:
            return [null];
    }
}
async function readExchangeHoldings(exchange, provider) {
    var _a, _b, _c;
    const accounts = [];
    const byCurrency = new Map();
    const splitByCurrency = new Map();
    let complete = true;
    for (const type of accountTypesFor(provider)) {
        const fetchedAt = new Date().toISOString();
        try {
            const balance = type ? await exchange.fetchBalance({ type }) : await exchange.fetchBalance();
            const totals = (balance && balance.total) || {};
            for (const [asset, raw] of Object.entries(totals)) {
                const n = Number(raw) || 0;
                if (!n)
                    continue;
                byCurrency.set(asset, ((_a = byCurrency.get(asset)) !== null && _a !== void 0 ? _a : 0) + n);
                const split = (_b = splitByCurrency.get(asset)) !== null && _b !== void 0 ? _b : {};
                split[type !== null && type !== void 0 ? type : "default"] = ((_c = split[type !== null && type !== void 0 ? type : "default"]) !== null && _c !== void 0 ? _c : 0) + n;
                splitByCurrency.set(asset, split);
            }
            accounts.push({ type, fetchedAt });
        }
        catch (error) {
            complete = false;
            accounts.push({ type, fetchedAt, error: String((error === null || error === void 0 ? void 0 : error.message) || error) });
        }
    }
    return { byCurrency, splitByCurrency, accounts, complete };
}
function emptyParallelStores(notes) {
    return { copyTrading: 0, investment: 0, aiInvestment: 0, staking: 0, forex: 0, fxTrading: 0, total: 0, notes: [...notes] };
}
async function readParallelStoresLine() {
    var _a, _b;
    let liabilities;
    try {
        liabilities = require("./liabilities");
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Parallel stores not counted in L: liabilities module unavailable (${(error === null || error === void 0 ? void 0 : error.message) || error})`);
        return null;
    }
    try {
        if (typeof (liabilities === null || liabilities === void 0 ? void 0 : liabilities.readParallelStoresDetailed) === "function") {
            const read = await liabilities.readParallelStoresDetailed();
            return { byCurrency: (_a = read === null || read === void 0 ? void 0 : read.byCurrency) !== null && _a !== void 0 ? _a : new Map(), notes: Array.isArray(read === null || read === void 0 ? void 0 : read.notes) ? read.notes : [] };
        }
        if (typeof (liabilities === null || liabilities === void 0 ? void 0 : liabilities.readParallelStores) === "function") {
            return { byCurrency: (_b = (await liabilities.readParallelStores())) !== null && _b !== void 0 ? _b : new Map(), notes: [] };
        }
        console_1.logger.warn("POOL_BACKING", "Parallel stores not counted in L: liabilities module exports no readParallelStores");
        return null;
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Parallel stores not counted in L: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return null;
    }
}
async function readSpotLiabilities(superAdminId) {
    const out = new Map();
    const ensure = (c) => {
        let row = out.get(c);
        if (!row) {
            row = { customers: 0, superAdmin: 0, pendingWithdrawals: 0, parallelStores: 0, parallelStoresSplit: null, total: 0 };
            out.set(c, row);
        }
        return row;
    };
    const balances = (await db_1.sequelize.query(`SELECT currency, userId, SUM(balance) AS balance, SUM(inOrder) AS inOrder
       FROM wallet
      WHERE type = 'SPOT'
        AND deletedAt IS NULL
      GROUP BY currency, userId`, { type: sequelize_1.QueryTypes.SELECT }));
    for (const r of balances) {
        const held = (Number(r.balance) || 0) + (Number(r.inOrder) || 0);
        if (!held)
            continue;
        const row = ensure(r.currency);
        if (superAdminId && r.userId === superAdminId)
            row.superAdmin += held;
        else
            row.customers += held;
    }
    const pending = (await db_1.sequelize.query(`SELECT w.currency AS currency, SUM(t.amount + COALESCE(t.fee, 0)) AS total
       FROM transaction t
       JOIN wallet w ON w.id = t.walletId
      WHERE w.type = 'SPOT'
        AND w.deletedAt IS NULL
        AND t.type = 'WITHDRAW'
        AND t.status IN ('PENDING', 'PROCESSING', 'TIMEOUT')
        AND t.deletedAt IS NULL
      GROUP BY w.currency`, { type: sequelize_1.QueryTypes.SELECT }));
    for (const r of pending) {
        const n = Number(r.total) || 0;
        if (!n)
            continue;
        ensure(r.currency).pendingWithdrawals += n;
    }
    const parallel = await readParallelStoresLine();
    if (parallel) {
        for (const [currency, stores] of parallel.byCurrency) {
            const total = Number(stores === null || stores === void 0 ? void 0 : stores.total) || 0;
            if (!total && !out.has(currency))
                continue;
            const row = ensure(currency);
            row.parallelStores += total;
            row.parallelStoresSplit = stores;
        }
        for (const row of out.values()) {
            if (!row.parallelStoresSplit)
                row.parallelStoresSplit = emptyParallelStores(parallel.notes);
        }
    }
    for (const row of out.values())
        row.total = row.customers + row.superAdmin + row.pendingWithdrawals + row.parallelStores;
    return out;
}
async function readInFlight() {
    return new Map();
}
async function readOpenObligations() {
    var _a;
    const out = new Map();
    const rows = await db_1.models.poolBackingObligation.findAll({
        where: { status: ["OPEN", "CLAIMED"], side: ["both", "exchange"] },
        attributes: ["currency", "amount"],
        raw: true,
    });
    for (const r of rows) {
        out.set(r.currency, ((_a = out.get(r.currency)) !== null && _a !== void 0 ? _a : 0) + (Number(r.amount) || 0));
    }
    return out;
}
async function readWaivedObligations() {
    var _a;
    const out = new Map();
    const rows = await db_1.models.poolBackingObligation.findAll({
        where: { status: ["WAIVED"], side: ["both", "exchange"] },
        attributes: ["currency", "amount"],
        raw: true,
    });
    for (const r of rows) {
        out.set(r.currency, ((_a = out.get(r.currency)) !== null && _a !== void 0 ? _a : 0) + (Number(r.amount) || 0));
    }
    return out;
}
function computeGap(input) {
    if (input.holdings == null)
        return null;
    return input.liabilities - input.holdings - input.inFlight;
}
function driftDecision(input) {
    const { residual, tolerance, previousResidual, previousStreak, runsRequired } = input;
    if (residual == null)
        return { streak: previousStreak, persist: false, drift: null };
    if (Math.abs(residual) <= tolerance)
        return { streak: 0, persist: false, drift: null };
    const outsideBefore = previousResidual != null && Math.abs(previousResidual) > tolerance;
    const streak = outsideBefore ? previousStreak + 1 : 1;
    const persist = streak >= Math.max(1, runsRequired);
    return { streak, persist, drift: persist ? residual : null };
}
function toleranceFor(precision) {
    const p = Number(precision);
    if (!Number.isFinite(p) || p <= 0)
        return 1e-8;
    if (p < 1)
        return Math.max(1e-8, p);
    return Math.max(1e-8, Math.pow(10, -Math.min(18, Math.floor(p))));
}
async function readEcoCurrencies() {
    try {
        const rows = (await db_1.sequelize.query(`SELECT DISTINCT currency FROM wallet WHERE type = 'ECO' AND deletedAt IS NULL`, { type: sequelize_1.QueryTypes.SELECT }));
        return { currencies: new Set(rows.map((r) => String(r.currency))), error: null };
    }
    catch (error) {
        const message = String((error === null || error === void 0 ? void 0 : error.message) || error);
        console_1.logger.warn("POOL_BACKING", `ECO currencies not read; no ecosystem side this run: ${message}`);
        return { currencies: null, error: `ECO currencies not read: ${message}` };
    }
}
async function readOpenEcosystemChains(currency) {
    try {
        const rows = (await db_1.models.poolBackingObligation.findAll({
            where: { currency, status: ["OPEN", "CLAIMED"], side: ["both", "ecosystem"] },
            attributes: ["chain"],
            raw: true,
        }));
        const chains = new Set();
        for (const r of rows)
            if (r === null || r === void 0 ? void 0 : r.chain)
                chains.add(String(r.chain).toUpperCase());
        return [...chains];
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Open ecosystem-side chains for ${currency} not read: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return [];
    }
}
function chainsToRefresh(inventory, openChains) {
    const chains = new Set();
    for (const [chain, addresses] of inventory.addresses) {
        if (addresses.some((a) => a.kind === "treasury"))
            chains.add(chain);
    }
    for (const chain of openChains)
        chains.add(String(chain).toUpperCase());
    return [...chains].sort();
}
async function readEcosystemSide(currency, p) {
    var _a;
    try {
        const openChains = await readOpenEcosystemChains(currency);
        const inventory = await (0, custody_1.collectCustodyInventory)(currency, { chains: openChains });
        const since = new Date();
        const refreshed = chainsToRefresh(inventory, openChains);
        if (p.limiter) {
            for (const chain of refreshed) {
                await (0, custody_1.refreshCustodyReads)({
                    currency,
                    chain,
                    perRun: p.perRun,
                    limiter: p.limiter,
                    addresses: (_a = inventory.addresses.get(chain)) !== null && _a !== void 0 ? _a : [],
                });
            }
        }
        else if (refreshed.length) {
            console_1.logger.warn("POOL_BACKING", `Ecosystem side for ${currency}: no limiter, so ${refreshed.join(", ")} were not read on-chain this run; their anchors report unknown`);
        }
        const figures = await (0, custody_1.computeEcosystemSide)(currency, inventory, { refreshed, since });
        return { figures: Object.keys(figures).length ? figures : null, error: null };
    }
    catch (error) {
        const message = String((error === null || error === void 0 ? void 0 : error.message) || error);
        console_1.logger.warn("POOL_BACKING", `Ecosystem side for ${currency} not read: ${message}`);
        return { figures: null, error: message };
    }
}
const RUN_LOCK_KEY = "pool-backing:reconcile:lock";
const RUN_LOCK_TTL_MS = 60 * 60 * 1000;
async function acquireRunLock(runId) {
    var _a;
    const noop = async () => undefined;
    let redis;
    try {
        const { RedisSingleton } = require("@b/utils/redis");
        redis = RedisSingleton.getInstance();
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Reconciliation runs unlocked: Redis client unavailable (${(error === null || error === void 0 ? void 0 : error.message) || error})`);
        return { held: true, holder: null, release: noop };
    }
    try {
        const ok = await redis.set(RUN_LOCK_KEY, runId, "PX", RUN_LOCK_TTL_MS, "NX");
        if (ok) {
            return {
                held: true,
                holder: null,
                release: async () => {
                    try {
                        if ((await redis.get(RUN_LOCK_KEY)) === runId)
                            await redis.del(RUN_LOCK_KEY);
                    }
                    catch (error) {
                        console_1.logger.warn("POOL_BACKING", `Reconciliation lock not released: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
                    }
                },
            };
        }
        let holder = null;
        try {
            holder = (_a = (await redis.get(RUN_LOCK_KEY))) !== null && _a !== void 0 ? _a : null;
        }
        catch (_b) {
            holder = null;
        }
        return { held: false, holder, release: noop };
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Reconciliation runs unlocked: Redis not reachable (${(error === null || error === void 0 ? void 0 : error.message) || error})`);
        return { held: true, holder: null, release: noop };
    }
}
async function runPoolBackingReconciliation(options = { trigger: "cron" }) {
    await (0, settings_1.ensurePoolBackingSettings)();
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    const runId = (0, crypto_1.randomUUID)();
    const at = new Date();
    const summary = {
        runId,
        at: at.toISOString(),
        mode: settings.mode,
        provider: null,
        holdingsReadable: false,
        currencies: 0,
        ecosystemSides: 0,
        ecosystemErrors: 0,
        newDrift: [],
        alerts: [],
    };
    if (settings.mode === "off") {
        summary.skipped = "poolBackingMode is off";
        return summary;
    }
    const lock = await acquireRunLock(runId);
    if (!lock.held) {
        summary.skipped = `a reconciliation is already running${lock.holder ? ` (run ${lock.holder})` : ""}; this ${options.trigger} run was not started`;
        console_1.logger.info("POOL_BACKING", `Reconciliation skipped: ${summary.skipped}`);
        return summary;
    }
    try {
        return await runReconciliationLocked(options, settings, runId, at, summary);
    }
    finally {
        await lock.release();
    }
}
async function runReconciliationLocked(options, settings, runId, at, summary) {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    let exchange = null;
    let provider = null;
    try {
        const ExchangeManager = require("@b/utils/exchange").default;
        exchange = await ExchangeManager.startExchange();
        provider = exchange ? await ExchangeManager.getProvider() : null;
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Exchange unavailable for reconciliation: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    summary.provider = provider;
    let holdings = { byCurrency: new Map(), splitByCurrency: new Map(), accounts: [], complete: false };
    if (exchange && provider) {
        holdings = await readExchangeHoldings(exchange, provider);
    }
    else {
        holdings.accounts.push({ type: null, fetchedAt: at.toISOString(), error: "exchange not available" });
    }
    summary.holdingsReadable = holdings.complete;
    let superAdminId = null;
    try {
        const { getSuperAdmin } = require("@b/utils/fees");
        const sa = await getSuperAdmin();
        superAdminId = (_a = sa === null || sa === void 0 ? void 0 : sa.id) !== null && _a !== void 0 ? _a : null;
    }
    catch (_l) {
        superAdminId = null;
    }
    const [liabilities, inFlight, open, waived] = await Promise.all([
        readSpotLiabilities(superAdminId),
        readInFlight(),
        readOpenObligations(),
        readWaivedObligations(),
    ]);
    const precisions = new Map();
    try {
        const rows = await db_1.models.exchangeCurrency.findAll({ attributes: ["currency", "precision"], raw: true });
        for (const r of rows)
            precisions.set(String(r.currency), Number(r.precision));
    }
    catch (_m) {
    }
    const currencies = new Set([...liabilities.keys(), ...open.keys(), ...waived.keys(), ...inFlight.keys()]);
    for (const [asset, total] of holdings.byCurrency)
        if (total > 0)
            currencies.add(asset);
    const anchors = new Map();
    const existingAnchors = await db_1.models.poolBackingCurrency.findAll({ where: { currency: [...currencies] } });
    for (const a of existingAnchors)
        anchors.set(String(a.currency), a);
    const eco = await readEcoCurrencies();
    const ecoCurrencies = eco.currencies;
    let limiter = null;
    if (ecoCurrencies === null || ecoCurrencies === void 0 ? void 0 : ecoCurrencies.size) {
        try {
            limiter = (0, custody_1.createScannerRateLimiter)();
        }
        catch (error) {
            console_1.logger.warn("POOL_BACKING", `Custody reads skipped this run (no rate limiter): ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        }
    }
    const ecosystemSides = new Map();
    const ecosystemErrors = new Map();
    for (const currency of currencies) {
        if (ecoCurrencies === null) {
            ecosystemErrors.set(currency, (_b = eco.error) !== null && _b !== void 0 ? _b : "ECO currencies not read");
            continue;
        }
        if (!ecoCurrencies.has(currency))
            continue;
        const side = await readEcosystemSide(currency, { perRun: settings.custodyReadsPerRun, limiter });
        ecosystemSides.set(currency, side.figures);
        if (side.error)
            ecosystemErrors.set(currency, side.error);
        if (side.figures)
            summary.ecosystemSides += 1;
    }
    summary.ecosystemErrors = ecosystemErrors.size;
    const gaps = new Map();
    for (const currency of currencies) {
        const L = (_c = liabilities.get(currency)) !== null && _c !== void 0 ? _c : {
            customers: 0,
            superAdmin: 0,
            pendingWithdrawals: 0,
            parallelStores: 0,
            parallelStoresSplit: null,
            total: 0,
        };
        const H = holdings.complete ? (_d = holdings.byCurrency.get(currency)) !== null && _d !== void 0 ? _d : 0 : null;
        const A = (_e = inFlight.get(currency)) !== null && _e !== void 0 ? _e : 0;
        const gap = computeGap({ liabilities: L.total, holdings: H, inFlight: A });
        gaps.set(currency, gap);
        const openSum = (_f = open.get(currency)) !== null && _f !== void 0 ? _f : 0;
        const waivedSum = (_g = waived.get(currency)) !== null && _g !== void 0 ? _g : 0;
        const residual = gap == null ? null : gap - openSum - waivedSum;
        const tolerance = toleranceFor(precisions.get(currency));
        let anchor = anchors.get(currency);
        if (!anchor) {
            anchor = await db_1.models.poolBackingCurrency.create({ currency, residualStreak: 0 });
            anchors.set(currency, anchor);
        }
        const decision = driftDecision({
            residual,
            tolerance,
            previousResidual: anchor.lastResidual == null ? null : Number(anchor.lastResidual),
            previousStreak: Number(anchor.residualStreak) || 0,
            runsRequired: settings.driftRuns,
        });
        const hadDrift = anchor.drift != null;
        const anchorPatch = {
            residualStreak: decision.streak,
        };
        if (residual != null)
            anchorPatch.lastResidual = residual;
        if (decision.persist) {
            anchorPatch.drift = decision.drift;
            if (!hadDrift)
                anchorPatch.driftFirstSeenAt = at;
        }
        else if (residual != null && Math.abs(residual) <= tolerance && hadDrift) {
            anchorPatch.drift = null;
            anchorPatch.driftFirstSeenAt = null;
            anchorPatch.driftAcknowledgedAt = null;
            anchorPatch.driftAcknowledgedBy = null;
            anchorPatch.driftAcknowledgedAmount = null;
        }
        await anchor.update(anchorPatch);
        if (decision.persist && !hadDrift)
            summary.newDrift.push({ currency, drift: decision.drift });
        await db_1.models.poolBackingReconciliation.create({
            runId,
            currency,
            at,
            status: H == null ? "h_unknown" : "ok",
            liabilities: L.total,
            liabilitiesSplit: {
                customers: L.customers,
                superAdmin: L.superAdmin,
                pendingWithdrawals: L.pendingWithdrawals,
                parallelStores: L.parallelStoresSplit,
                waivedObligations: waivedSum,
            },
            holdings: H,
            holdingsSplit: {
                accounts: holdings.accounts,
                perAccount: (_h = holdings.splitByCurrency.get(currency)) !== null && _h !== void 0 ? _h : {},
            },
            ecosystemSplit: (_j = ecosystemSides.get(currency)) !== null && _j !== void 0 ? _j : null,
            ecosystemError: (_k = ecosystemErrors.get(currency)) !== null && _k !== void 0 ? _k : null,
            inFlight: A,
            gap,
            openObligations: openSum,
            residual,
            drift: decision.persist ? decision.drift : null,
            driftRunStreak: decision.streak,
            holdingsStale: H == null,
        });
        summary.currencies += 1;
    }
    await raiseAlerts(summary, settings.alertUsd, holdings.complete, gaps);
    console_1.logger.info("POOL_BACKING", `Reconciliation ${runId}: ${summary.currencies} currencies, H ${holdings.complete ? "read" : "UNKNOWN"}, ecosystem side read for ${summary.ecosystemSides}` +
        (summary.ecosystemErrors ? ` and NOT read for ${summary.ecosystemErrors}` : "") +
        `, ${summary.newDrift.length} new drift, ${summary.alerts.length} alerts (${options.trigger})`);
    return summary;
}
const POOL_BACKING_VIEW_PERMISSION = "view.pool.backing";
const SUPER_ADMIN_ROLE = "Super Admin";
const H_UNKNOWN_RUNS_TOLERATED = 3;
const H_UNKNOWN_LOOKBACK_MS = 24 * 60 * 60 * 1000;
async function raiseAlerts(summary, alertUsd, holdingsReadable, gaps = new Map()) {
    const alerts = [];
    for (const d of summary.newDrift) {
        alerts.push({
            key: `drift_${d.currency}_${summary.runId}`,
            message: `Pool backing: ${d.currency} shows a persistent unexplained gap of ${d.drift.toFixed(8)}. Review and acknowledge it in Admin → Finance → Pool backing.`,
        });
    }
    if (!holdingsReadable && (await exchangeStaleForTooLong())) {
        alerts.push({
            key: "h_unknown",
            message: `Pool backing: the exchange balance has been unreadable for more than ${H_UNKNOWN_RUNS_TOLERATED} reconciliations in a row. Holdings are stale; check the exchange API keys and status.`,
        });
    }
    if (alertUsd != null && alertUsd >= 0) {
        const withGap = [...gaps.entries()].filter(([, g]) => g != null && Math.abs(g) > 0);
        if (withGap.length) {
            try {
                const { getUsdRates } = require("@b/api/finance/currency/utils");
                const rates = await getUsdRates(withGap.map(([c]) => c));
                for (const [currency, gap] of withGap) {
                    const rate = rates.get(currency);
                    if (!rate || !(rate > 0))
                        continue;
                    const usd = Math.abs(gap) * rate;
                    if (usd > alertUsd) {
                        alerts.push({
                            key: `gap_${currency}`,
                            message: `Pool backing: the ${currency} pool is ${gap > 0 ? "short" : "long"} by ${Math.abs(gap).toFixed(8)} ${currency} (about ${usd.toFixed(2)} USD), above the ${alertUsd} USD alert line. Review Admin → Finance → Pool backing.`,
                        });
                    }
                }
            }
            catch (error) {
                console_1.logger.warn("POOL_BACKING", `USD gap alert skipped: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
    }
    try {
        const stuck = (await db_1.models.poolBackingSettlement.findAll({
            where: { status: "NEEDS_REVIEW" },
            attributes: ["id", "currency", "direction", "amountRequested", "note"],
            raw: true,
        }));
        for (const s of stuck) {
            alerts.push({
                key: `review_${s.id}`,
                message: `Pool backing: settlement ${s.id} (${s.direction}, ${Number(s.amountRequested) || 0} ${s.currency}) needs review${s.note ? `: ${s.note}` : ""}. Attach the txid, mark it arrived, or mark it failed in Admin → Finance → Pool backing.`,
            });
        }
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `NEEDS_REVIEW alert skipped: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    summary.alerts.push(...alerts.map((a) => a.message));
    if (!alerts.length)
        return;
    await deliverAlerts(alerts);
}
async function exchangeStaleForTooLong() {
    try {
        const runs = (await db_1.models.poolBackingReconciliation.findAll({
            where: { at: { [sequelize_1.Op.gte]: new Date(Date.now() - H_UNKNOWN_LOOKBACK_MS) } },
            attributes: [
                "runId",
                [(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("at")), "at"],
                [(0, sequelize_1.literal)("MIN(CASE WHEN status = 'h_unknown' THEN 1 ELSE 0 END)"), "allUnknown"],
            ],
            group: ["runId"],
            order: [[(0, sequelize_1.fn)("MAX", (0, sequelize_1.col)("at")), "DESC"]],
            limit: H_UNKNOWN_RUNS_TOLERATED + 1,
            raw: true,
        }));
        return runs.length > H_UNKNOWN_RUNS_TOLERATED && runs.every((r) => Number(r.allUnknown) === 1);
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Stale-exchange alert skipped: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return false;
    }
}
async function readAlertRecipients() {
    var _a;
    const { adminAlertRecipientRoles } = require("@b/utils/admin-alert-audience");
    const roleNames = adminAlertRecipientRoles();
    const users = (await db_1.models.user.findAll({
        attributes: ["id"],
        include: [
            {
                model: db_1.models.role,
                as: "role",
                attributes: ["id", "name"],
                required: true,
                where: { name: roleNames },
                include: [
                    {
                        model: db_1.models.permission,
                        as: "permissions",
                        attributes: ["name"],
                        through: { attributes: [] },
                        required: false,
                        where: { name: POOL_BACKING_VIEW_PERMISSION },
                    },
                ],
            },
        ],
    }));
    const out = [];
    for (const u of users) {
        const role = (_a = u === null || u === void 0 ? void 0 : u.role) !== null && _a !== void 0 ? _a : (typeof (u === null || u === void 0 ? void 0 : u.get) === "function" ? u.get("role") : null);
        if (!role || !(u === null || u === void 0 ? void 0 : u.id))
            continue;
        const holds = String(role.name) === SUPER_ADMIN_ROLE ||
            (Array.isArray(role.permissions) && role.permissions.some((p) => String(p === null || p === void 0 ? void 0 : p.name) === POOL_BACKING_VIEW_PERMISSION));
        if (holds)
            out.push(String(u.id));
    }
    return out;
}
async function deliverAlerts(alerts) {
    let recipients;
    try {
        recipients = await readAlertRecipients();
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Alert recipients not read; ${alerts.length} alert(s) stay in the log only: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return;
    }
    if (!recipients.length) {
        console_1.logger.warn("POOL_BACKING", `No admin holds ${POOL_BACKING_VIEW_PERMISSION}; ${alerts.length} alert(s) stay in the log only`);
        return;
    }
    let notificationService;
    try {
        ({ notificationService } = require("@b/services/notification"));
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Alert delivery failed: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return;
    }
    const day = new Date().toISOString().slice(0, 10);
    for (const userId of recipients) {
        for (const alert of alerts) {
            try {
                await notificationService.send({
                    userId,
                    type: "ALERT",
                    channels: ["IN_APP"],
                    idempotencyKey: `pool_backing_${day}_${userId}_${alert.key}`,
                    data: { title: "Pool backing", message: alert.message, link: "/admin/finance/pool-backing" },
                    priority: "HIGH",
                });
            }
            catch (error) {
                console_1.logger.warn("POOL_BACKING", `Alert ${alert.key} not delivered to ${userId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
    }
}
