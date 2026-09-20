"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.planCurrency = planCurrency;
exports.proofOf = proofOf;
exports.feesOf = feesOf;
exports.toBaseUnits = toBaseUnits;
exports.startExchange = startExchange;
exports.claimSettlement = claimSettlement;
exports.writeSettlement = writeSettlement;
exports.markNeedsReview = markNeedsReview;
exports.failSettlement = failSettlement;
exports.completeSettlement = completeSettlement;
exports.dispatchSettlement = dispatchSettlement;
exports.verifySettlement = verifySettlement;
exports.runPoolBackingSettlementCycle = runPoolBackingSettlementCycle;
exports.readPoolBackingEngineState = readPoolBackingEngineState;
const sequelize_1 = require("sequelize");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
const ledger_1 = require("./ledger");
const reconcile_1 = require("./reconcile");
const networks_1 = require("./networks");
const exchange_io_1 = require("./exchange-io");
const treasury_1 = require("./treasury");
const guard_1 = require("./guard");
const LOG = "POOL_BACKING";
const IN_FLIGHT = ["PLANNED", "DISPATCHED", "CONFIRMED"];
const TERMINAL = new Set(["SETTLED", "RECORDED", "FAILED"]);
const HOUR_MS = 60 * 60 * 1000;
const REVIEW_AFTER_MS = 72 * HOUR_MS;
const DISPATCH_STALE_MS = 30 * 60 * 1000;
const INDETERMINATE_GRACE_MS = 30 * 60 * 1000;
const INDETERMINATE_MATCH_SLACK_MS = 5 * 60 * 1000;
const RECONCILIATION_MAX_AGE_MS = 1 * HOUR_MS;
const EPSILON = 1e-12;
const AMOUNT_TOLERANCE = 1e-8;
const NOT_BROADCAST_FLAG = "poolBackingNotBroadcast";
function num(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function timeOf(value) {
    if (!value)
        return 0;
    const t = value instanceof Date ? value.getTime() : new Date(value).getTime();
    return Number.isFinite(t) ? t : 0;
}
function oldestFirst(rows) {
    return [...rows].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt) || String(a.id).localeCompare(String(b.id)));
}
function claimWithinCap(candidates, sign, cap) {
    const rows = [];
    let amount = 0;
    for (const row of oldestFirst(candidates)) {
        const value = num(row.amount);
        if (Math.sign(value) !== sign)
            continue;
        const magnitude = Math.abs(value);
        if (amount + magnitude > cap + EPSILON)
            break;
        rows.push(row);
        amount += magnitude;
    }
    return { rows, amount };
}
function belowThresholdAfterCap(p) {
    const usd = p.amount * p.rate;
    if (usd >= p.thresholdUsd)
        return null;
    return `the rows that fit under the per-movement cap sum to ${fmt(p.amount)} ${p.currency} (${usd.toFixed(2)} USD), below the ${p.thresholdUsd} USD threshold; split the oldest row with Record external or raise poolBackingMaxSettlementUsd`;
}
function fmt(n) {
    return Number(n.toFixed(8)).toString();
}
function planCurrency(input) {
    var _a, _b, _c, _d, _e;
    const currency = input.currency;
    const candidates = input.rows.filter((r) => r.status === "OPEN" && r.nettable === true && (r.side === "both" || r.side === "ecosystem"));
    if (!candidates.length)
        return { action: "none", reason: "no open nettable obligations" };
    let net = 0;
    for (const r of candidates)
        net += num(r.amount);
    if (Math.abs(net) <= EPSILON)
        return { action: "none", reason: "the open nettable obligations net to zero" };
    const rate = input.usdRate != null && input.usdRate > 0 ? input.usdRate : null;
    if (rate == null)
        return { action: "none", reason: `no USD rate for ${currency}; the threshold cannot be applied` };
    const netUsd = Math.abs(net) * rate;
    if (netUsd < input.thresholdUsd) {
        return { action: "none", reason: `net ${fmt(net)} ${currency} (${netUsd.toFixed(2)} USD) is below the ${input.thresholdUsd} USD threshold` };
    }
    const capAmount = input.maxSettlementUsd != null && input.maxSettlementUsd >= 0 ? input.maxSettlementUsd / rate : null;
    const provider = input.provider;
    if (net > 0) {
        const sums = new Map();
        for (const r of candidates) {
            if (!r.chain)
                continue;
            const kind = input.tokenKinds[r.chain];
            if (!kind || kind === "unsupported")
                continue;
            sums.set(r.chain, ((_a = sums.get(r.chain)) !== null && _a !== void 0 ? _a : 0) + num(r.amount));
        }
        let chain = null;
        let best = 0;
        for (const [c, s] of sums) {
            if (s > best + EPSILON) {
                best = s;
                chain = c;
            }
        }
        if (!chain) {
            chain = (_b = Object.keys(input.tokenKinds).find((c) => input.tokenKinds[c] && input.tokenKinds[c] !== "unsupported")) !== null && _b !== void 0 ? _b : null;
        }
        if (!chain) {
            const named = [...new Set(candidates.map((r) => r.chain).filter(Boolean))];
            return {
                action: "none",
                reason: `no platform signer for ${currency} on any chain yet` +
                    (named.length ? ` (rows name ${named.join(", ")}; settlements move EVM tokens, pooled UTXO coins, native EVM coins, SOL/SPL, TRX/TRC20, TON and XMR only)` : ""),
            };
        }
        const resolved = (0, networks_1.resolveNetworkId)({ provider, chain, networkMap: input.networkMap, networks: input.networks });
        if (!resolved.networkId) {
            return { action: "none", reason: `chain ${chain} is not mapped to a ${provider} network for ${currency}; set poolBackingCurrency.networkMap` };
        }
        const networkId = resolved.networkId;
        const network = (_c = input.networks[networkId]) !== null && _c !== void 0 ? _c : null;
        let rows = candidates;
        let amount = net;
        if (capAmount != null && amount > capAmount + EPSILON) {
            const capped = claimWithinCap(candidates, 1, capAmount);
            if (!capped.rows.length) {
                return {
                    action: "none",
                    reason: `the oldest open obligation alone exceeds the ${input.maxSettlementUsd} USD per-movement cap (${fmt(capAmount)} ${currency}); split it with Record external or raise poolBackingMaxSettlementUsd`,
                };
            }
            rows = capped.rows;
            amount = capped.amount;
            const dust = belowThresholdAfterCap({ currency, amount, rate, thresholdUsd: input.thresholdUsd });
            if (dust)
                return { action: "none", reason: dust };
        }
        const leg = (0, networks_1.checkLeg)({
            direction: "eco_to_exchange",
            network,
            amount,
            needsTag: input.needsTagByNetwork[networkId] === true,
            chainHasMemo: (0, networks_1.chainHasMemo)(chain),
        });
        if (!leg.ok)
            return { action: "none", reason: `${chain}/${networkId}: ${leg.reason}` };
        return {
            action: "eco_to_exchange",
            reason: `net ${fmt(net)} ${currency} short on the exchange; ship ${fmt(amount)} from custody on ${chain} (${networkId})`,
            chain,
            networkId,
            amount,
            rowIds: rows.map((r) => r.id),
        };
    }
    const magnitude = Math.abs(net);
    const treasury = new Set(input.treasuryChains);
    if (!treasury.size) {
        return { action: "none", reason: `the treasury has no ${currency} address on any chain (no enabled ecosystem token, or the wallet could not be created)` };
    }
    const order = [];
    for (const c of Object.keys((_d = input.networkMap) !== null && _d !== void 0 ? _d : {}))
        if (!order.includes(c))
            order.push(c);
    for (const c of input.treasuryChains)
        if (!order.includes(c))
            order.push(c);
    for (const c of Object.keys(input.tokenKinds))
        if (!order.includes(c))
            order.push(c);
    const refusals = [];
    for (const chain of order) {
        const treasuryChain = [...treasury].find((c) => c.toUpperCase() === chain.toUpperCase());
        if (!treasuryChain) {
            refusals.push(`${chain}: the treasury has no address`);
            continue;
        }
        const resolved = (0, networks_1.resolveNetworkId)({ provider, chain: treasuryChain, networkMap: input.networkMap, networks: input.networks });
        if (!resolved.networkId) {
            refusals.push(`${treasuryChain}: not mapped to a ${provider} network`);
            continue;
        }
        const networkId = resolved.networkId;
        const network = (_e = input.networks[networkId]) !== null && _e !== void 0 ? _e : null;
        let cap = capAmount;
        if ((network === null || network === void 0 ? void 0 : network.withdrawMax) !== undefined && network.withdrawMax > 0)
            cap = cap == null ? network.withdrawMax : Math.min(cap, network.withdrawMax);
        let rows = candidates;
        let amount = magnitude;
        if (cap != null && amount > cap + EPSILON) {
            const capped = claimWithinCap(candidates, -1, cap);
            if (!capped.rows.length) {
                refusals.push(`${treasuryChain}/${networkId}: the oldest open obligation alone exceeds the cap of ${fmt(cap)} ${currency}; split it with Record external`);
                continue;
            }
            rows = capped.rows;
            amount = capped.amount;
            const dust = belowThresholdAfterCap({ currency, amount, rate, thresholdUsd: input.thresholdUsd });
            if (dust) {
                refusals.push(`${treasuryChain}/${networkId}: ${dust}`);
                continue;
            }
        }
        const leg = (0, networks_1.checkLeg)({ direction: "exchange_to_eco", network, amount, needsTag: false, chainHasMemo: false });
        if (!leg.ok) {
            refusals.push(`${treasuryChain}/${networkId}: ${leg.reason}`);
            continue;
        }
        return {
            action: "exchange_to_eco",
            reason: `net ${fmt(net)} ${currency}: the exchange holds more than it owes; withdraw ${fmt(amount)} to the treasury on ${treasuryChain} (${networkId})`,
            chain: treasuryChain,
            networkId,
            amount,
            rowIds: rows.map((r) => r.id),
        };
    }
    return { action: "none", reason: `no chain can receive ${fmt(magnitude)} ${currency} from ${provider}: ${refusals.join("; ")}` };
}
function isUniqueError(error) {
    return error instanceof sequelize_1.UniqueConstraintError || (error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError";
}
function proofOf(settlement) {
    const raw = settlement === null || settlement === void 0 ? void 0 : settlement.proof;
    if (raw == null)
        return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return typeof raw === "object" ? { ...raw } : {};
}
function feesOf(settlement) {
    const raw = settlement === null || settlement === void 0 ? void 0 : settlement.fees;
    if (raw == null)
        return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return typeof raw === "object" ? { ...raw } : {};
}
function legsOf(row) {
    const raw = row === null || row === void 0 ? void 0 : row.legs;
    if (raw == null)
        return {};
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return parsed && typeof parsed === "object" ? parsed : {};
        }
        catch (_a) {
            return {};
        }
    }
    return typeof raw === "object" ? { ...raw } : {};
}
function messageOf(error) {
    return String((error === null || error === void 0 ? void 0 : error.message) || error);
}
function toBaseUnits(amount, decimals) {
    const places = Math.max(0, Math.floor(Number(decimals) || 0));
    let text = String(amount);
    if (/e/i.test(text))
        text = amount.toFixed(Math.min(places, 100));
    const [whole, frac = ""] = text.split(".");
    const digits = `${whole}${frac.slice(0, places).padEnd(places, "0")}`.replace(/^0+(?=\d)/, "");
    return BigInt(digits || "0");
}
async function startExchange() {
    try {
        const ExchangeManager = require("@b/utils/exchange").default;
        const exchange = await ExchangeManager.startExchange();
        const provider = exchange ? await ExchangeManager.getProvider() : null;
        return { exchange: exchange !== null && exchange !== void 0 ? exchange : null, provider: provider !== null && provider !== void 0 ? provider : null };
    }
    catch (error) {
        console_1.logger.warn(LOG, `Exchange unavailable: ${messageOf(error)}`);
        return { exchange: null, provider: null };
    }
}
async function ecosystemInstalled() {
    var _a, _b;
    try {
        const { CacheManager } = require("@b/utils/cache");
        const extensions = await CacheManager.getInstance().getExtensions();
        if (extensions.has("ecosystem"))
            return true;
    }
    catch (_c) {
    }
    try {
        const row = await ((_b = (_a = db_1.models.extension) === null || _a === void 0 ? void 0 : _a.findOne) === null || _b === void 0 ? void 0 : _b.call(_a, { where: { name: "ecosystem", status: true }, attributes: ["id"], raw: true }));
        return !!row;
    }
    catch (_d) {
        return false;
    }
}
async function findTreasuryWallet(currency) {
    return db_1.models.wallet.findOne({ where: { userId: treasury_1.POOL_BACKING_TREASURY_USER_ID, type: "ECO", currency } });
}
function chainsOfWallet(wallet) {
    var _a;
    const map = (_a = (0, treasury_1.parseAddressMap)(wallet === null || wallet === void 0 ? void 0 : wallet.address)) !== null && _a !== void 0 ? _a : {};
    return Object.entries(map)
        .filter(([, entry]) => entry && typeof entry === "object" && entry.address)
        .map(([chain]) => chain);
}
async function readTokenKinds(currency) {
    var _a;
    const kinds = {};
    const decimals = {};
    let rows = [];
    try {
        rows = (await db_1.models.ecosystemToken.findAll({
            where: { currency, status: true },
            attributes: ["chain", "contractType", "decimals"],
            raw: true,
        }));
    }
    catch (error) {
        console_1.logger.warn(LOG, `ecosystemToken lookup for ${currency} failed: ${messageOf(error)}`);
    }
    for (const r of rows) {
        const chain = String(r.chain);
        kinds[chain] = (0, networks_1.tokenKindFor)(chain, String((_a = r.contractType) !== null && _a !== void 0 ? _a : ""));
        const d = Number(r.decimals);
        if (Number.isFinite(d))
            decimals[chain] = d;
    }
    return { kinds, decimals };
}
async function watchTreasuryAddress(p) {
    try {
        const { registerActiveDepositAddress } = require("@b/api/(ext)/ecosystem/deposit/util/BackgroundDepositScanner");
        await registerActiveDepositAddress({ ...p, userId: treasury_1.POOL_BACKING_TREASURY_USER_ID });
    }
    catch (error) {
        console_1.logger.warn(LOG, `Could not register the treasury ${p.chain} address with the deposit scanner: ${messageOf(error)}`);
    }
}
async function scanTreasuryAddressOnce(p) {
    try {
        const wallet = await db_1.models.wallet.findByPk(p.walletId);
        if (!wallet)
            return;
        const { createMonitor } = require("@b/api/(ext)/ecosystem/deposit/util/monitorFactory");
        const monitor = createMonitor(p.chain, {
            wallet,
            chain: p.chain,
            currency: p.currency,
            address: p.address,
            contractType: p.contractType,
            contract: p.contract,
            decimals: p.decimals,
        });
        if (monitor && typeof monitor.scanOnce === "function")
            await monitor.scanOnce();
    }
    catch (error) {
        console_1.logger.warn(LOG, `Treasury scan on ${p.chain} failed: ${messageOf(error)}`);
    }
}
class ClaimRefused extends Error {
    constructor(reason) {
        super(reason);
        this.reason = reason;
    }
}
async function claimSettlement(p) {
    var _a;
    var _b;
    const rowIds = [...new Set(p.rowIds)];
    if (!rowIds.length)
        return { refused: "no obligations to claim" };
    if (!(p.amount > 0))
        return { refused: `amount must be positive, got ${p.amount}` };
    try {
        const settlement = await db_1.sequelize.transaction(async (t) => {
            var _a;
            await (0, ledger_1.withCurrencyAnchor)(p.currency, t);
            const rows = (await db_1.models.poolBackingObligation.findAll({
                where: { id: rowIds, status: "OPEN", currency: p.currency },
                transaction: t,
                lock: t.LOCK.UPDATE,
            }));
            if (rows.length !== rowIds.length)
                throw new ClaimRefused("obligations changed since the plan was made; the next cycle re-plans");
            let sum = 0;
            for (const r of rows)
                sum += num(r.amount);
            const expectedSign = p.direction === "exchange_to_eco" ? -1 : 1;
            if (Math.sign(sum) !== expectedSign || Math.abs(Math.abs(sum) - p.amount) > AMOUNT_TOLERANCE) {
                throw new ClaimRefused(`obligations changed since the plan was made (rows now net ${fmt(sum)} ${p.currency}, planned ${fmt(p.amount)})`);
            }
            let created;
            try {
                created = await db_1.models.poolBackingSettlement.create({
                    currency: p.currency,
                    direction: p.direction,
                    chain: p.chain,
                    network: p.networkId,
                    amountRequested: p.amount,
                    amountSent: null,
                    amountReceived: null,
                    status: "PLANNED",
                    activeKey: `${p.currency}|${p.direction}`,
                    txid: null,
                    proof: { ...((_a = p.proof) !== null && _a !== void 0 ? _a : {}), plannedAt: new Date().toISOString(), rowIds, chain: p.chain, networkId: p.networkId },
                    fees: null,
                    initiatedBy: p.initiatedBy,
                    note: null,
                }, { transaction: t });
            }
            catch (error) {
                if (isUniqueError(error))
                    throw new ClaimRefused(`a ${p.direction} settlement for ${p.currency} is already in flight`);
                throw error;
            }
            const [claimed] = await db_1.models.poolBackingObligation.update({ status: "CLAIMED", settlementId: created.id }, { where: { id: rowIds, status: "OPEN" }, transaction: t });
            if (Number(claimed) !== rowIds.length)
                throw new ClaimRefused("obligations changed while being claimed");
            return created;
        });
        const where = p.chain ? `on ${p.chain}/${(_b = p.networkId) !== null && _b !== void 0 ? _b : "?"}` : `on the exchange${((_a = p.proof) === null || _a === void 0 ? void 0 : _a.symbol) ? ` (${p.proof.symbol})` : ""}`;
        console_1.logger.info(LOG, `Settlement ${settlement.id} PLANNED: ${p.direction} ${fmt(p.amount)} ${p.currency} ${where}, ${rowIds.length} row(s) claimed (${p.initiatedBy})`);
        return { settlement };
    }
    catch (error) {
        if (error instanceof ClaimRefused) {
            console_1.logger.info(LOG, `Claim refused for ${p.currency} ${p.direction}: ${error.reason}`);
            return { refused: error.reason };
        }
        throw error;
    }
}
async function writeSettlement(settlementId, currency, patch, where = {}) {
    return db_1.sequelize.transaction(async (t) => {
        await (0, ledger_1.withCurrencyAnchor)(currency, t);
        const [count] = await db_1.models.poolBackingSettlement.update(patch, { where: { id: settlementId, ...where }, transaction: t });
        return Number(count) || 0;
    });
}
async function reserveTxidOnRow(settlementId, currency, hash, proof) {
    var _a;
    const reserved = (_a = (0, exchange_io_1.normaliseTxid)(hash)) !== null && _a !== void 0 ? _a : String(hash);
    const holder = await (0, guard_1.liveSettlementHoldingTxid)(hash, settlementId);
    if (holder) {
        const collision = (0, error_1.createError)({
            statusCode: 409,
            message: `hash ${reserved} already belongs to settlement ${holder.id} (${holder.status}); it is that movement's evidence, and this settlement's own transaction is unaccounted for — check the chain before resolving`,
        });
        collision.txidCollision = reserved;
        throw collision;
    }
    await writeSettlement(settlementId, currency, { txid: reserved, proof: { ...proof, txid: reserved } });
    return reserved;
}
async function markNeedsReview(settlementId, reason, extra = {}) {
    const existing = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: `Settlement ${settlementId} not found` });
    if (TERMINAL.has(String(existing.status)))
        return;
    await db_1.sequelize.transaction(async (t) => {
        var _a, _b;
        await (0, ledger_1.withCurrencyAnchor)(existing.currency, t);
        const row = await db_1.models.poolBackingSettlement.findOne({ where: { id: settlementId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!row || TERMINAL.has(String(row.status)))
            return;
        const proof = { ...proofOf(row), ...((_a = extra.proof) !== null && _a !== void 0 ? _a : {}), needsReviewAt: new Date().toISOString(), reviewReason: reason };
        const txid = extra.txid ? (0, exchange_io_1.normaliseTxid)(extra.txid) : (_b = row.txid) !== null && _b !== void 0 ? _b : null;
        await row.update({ status: "NEEDS_REVIEW", activeKey: null, note: reason, proof, txid }, { transaction: t });
    });
    console_1.logger.warn(LOG, `Settlement ${settlementId} NEEDS_REVIEW: ${reason}`);
}
async function currentProof(settlementId) {
    const row = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    return proofOf(row);
}
async function recordLateDispatch(settlementId, currency, p) {
    var _a;
    const reason = `the mover finished after the dispatch window had expired and the row was parked; ${p.txid ? `hash ${p.txid} recorded` : "no hash"}; verify on the chain or the exchange, then mark it arrived or failed`;
    console_1.logger.error(LOG, `Settlement ${settlementId}: DISPATCHED write matched no PLANNED row (${(_a = p.txid) !== null && _a !== void 0 ? _a : "no txid"}); ${reason}`);
    const row = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!row)
        return;
    const status = String(row.status);
    const proof = { ...proofOf(row), ...p.proof, lostDispatchWrite: true, lateDispatchAt: new Date().toISOString() };
    const txid = p.txid ? (0, exchange_io_1.normaliseTxid)(p.txid) : null;
    if (status === "SETTLED" || status === "RECORDED") {
        await writeSettlement(settlementId, currency, { ...(txid ? { txid } : {}), amountSent: p.amountSent, fees: p.fees, proof });
        return;
    }
    if (status === "FAILED") {
        await writeSettlement(settlementId, currency, {
            status: "NEEDS_REVIEW",
            activeKey: null,
            ...(txid ? { txid } : {}),
            amountSent: p.amountSent,
            fees: p.fees,
            note: reason,
            proof: { ...proof, needsReviewAt: new Date().toISOString(), reviewReason: reason },
        });
        console_1.logger.warn(LOG, `Settlement ${settlementId} NEEDS_REVIEW: ${reason} (was FAILED)`);
        return;
    }
    await writeSettlement(settlementId, currency, { amountSent: p.amountSent, fees: p.fees });
    await markNeedsReview(settlementId, reason, { proof, txid });
}
async function replayOwedBookkeeping(settlement) {
    var _a, _b;
    var _c, _d, _e, _f, _g, _h, _j, _k, _l;
    if (!settlement || String(settlement.direction) !== "eco_to_exchange")
        return;
    const fresh = await db_1.models.poolBackingSettlement.findByPk(String(settlement.id));
    const proof = proofOf(fresh !== null && fresh !== void 0 ? fresh : settlement);
    if (proof.bookkeepingPending !== true || proof.bookkeepedAt)
        return;
    const source = proof.source && typeof proof.source === "object" ? proof.source : null;
    if (!source)
        return;
    const kind = String((_c = source.kind) !== null && _c !== void 0 ? _c : "");
    if (kind !== "own" && kind !== "alternative")
        return;
    if (!source.walletDataId)
        return;
    const id = String(settlement.id);
    const currency = String(settlement.currency);
    const chain = String((_e = (_d = settlement.chain) !== null && _d !== void 0 ? _d : source.chain) !== null && _e !== void 0 ? _e : "");
    const sentAmount = num((_f = (fresh !== null && fresh !== void 0 ? fresh : settlement).amountSent) !== null && _f !== void 0 ? _f : settlement.amountRequested);
    if (!(sentAmount > 0))
        return;
    const gasNative = num((_g = feesOf(fresh !== null && fresh !== void 0 ? fresh : settlement).gasNative) !== null && _g !== void 0 ? _g : (_a = proof.gas) === null || _a === void 0 ? void 0 : _a.native);
    const gasFromOwn = ((_b = proof.gas) === null || _b === void 0 ? void 0 : _b.paidBy) === "own" && gasNative > 0 ? gasNative : 0;
    const amount = sentAmount + gasFromOwn;
    const { settleSettlementSource } = require("@b/api/(ext)/ecosystem/utils/settlement-move");
    const summary = await settleSettlementSource({
        kind,
        address: String((_h = source.address) !== null && _h !== void 0 ? _h : ""),
        walletData: { id: String(source.walletDataId), walletId: String((_j = source.walletId) !== null && _j !== void 0 ? _j : ""), index: (_k = source.index) !== null && _k !== void 0 ? _k : 0 },
    }, currency, chain, amount, { precision: (_l = source.precision) !== null && _l !== void 0 ? _l : undefined, settlementId: id });
    console_1.logger.warn(LOG, `Settlement ${id}: replayed the owed ${kind} source bookkeeping${(summary === null || summary === void 0 ? void 0 : summary.alreadyBooked) ? " (already booked; no-op)" : ""}`);
}
function assertNotMidDispatch(row, allow) {
    if (allow === true)
        return;
    if (String(row === null || row === void 0 ? void 0 : row.status) !== "PLANNED")
        return;
    const stampedAt = proofOf(row).dispatchStartedAt;
    if (!stampedAt)
        return;
    throw (0, error_1.createError)({
        statusCode: 409,
        message: `Settlement ${row.id} is being dispatched (started ${stampedAt}); wait for it to become DISPATCHED or NEEDS_REVIEW ` +
            `(the engine parks it after ${Math.round(DISPATCH_STALE_MS / 60000)} minutes), then check the chain or the exchange before failing it`,
    });
}
async function failSettlement(settlementId, p) {
    const existing = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: `Settlement ${settlementId} not found` });
    if (existing.status === "SETTLED" || existing.status === "RECORDED") {
        throw (0, error_1.createError)({ statusCode: 409, message: `Settlement ${settlementId} is ${existing.status}; a settled movement cannot fail` });
    }
    if (existing.status === "FAILED")
        return;
    assertNotMidDispatch(existing, p.allowMidDispatch);
    const releasedAt = new Date().toISOString();
    await db_1.sequelize.transaction(async (t) => {
        await (0, ledger_1.withCurrencyAnchor)(existing.currency, t);
        const row = await db_1.models.poolBackingSettlement.findOne({ where: { id: settlementId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!row)
            return;
        if (row.status === "SETTLED" || row.status === "RECORDED") {
            throw (0, error_1.createError)({ statusCode: 409, message: `Settlement ${settlementId} is ${row.status}; a settled movement cannot fail` });
        }
        if (row.status === "FAILED")
            return;
        assertNotMidDispatch(row, p.allowMidDispatch);
        const claimed = (await db_1.models.poolBackingObligation.findAll({
            where: { settlementId, status: "CLAIMED" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        }));
        for (const ob of claimed) {
            const legs = legsOf(ob);
            const history = Array.isArray(legs.history) ? legs.history : [];
            await ob.update({
                status: "OPEN",
                settlementId: null,
                legs: { ...legs, history: [...history, { settlementId, releasedAt, reason: p.reason, actor: p.actor }] },
            }, { transaction: t });
        }
        const before = proofOf(row);
        const proof = {
            ...before,
            failedAt: releasedAt,
            failedBy: p.actor,
            failReason: p.reason,
            ...(before.bookkeepingPending === true ? { bookkeepingPending: false, bookkeepingWaivedAt: releasedAt } : {}),
        };
        await row.update({ status: "FAILED", activeKey: null, note: p.reason, proof }, { transaction: t });
        console_1.logger.warn(LOG, `Settlement ${settlementId} FAILED (${p.actor}): ${p.reason}; ${claimed.length} obligation(s) reopened`);
    });
}
async function completeSettlement(settlementId, p) {
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (settings.paused) {
        console_1.logger.warn(LOG, `Settlement ${settlementId} has arrived but poolBackingPause is on; leaving it as is`);
        return;
    }
    const existing = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: `Settlement ${settlementId} not found` });
    if (existing.status === "SETTLED" || existing.status === "RECORDED")
        return;
    if (existing.status === "FAILED") {
        throw (0, error_1.createError)({ statusCode: 409, message: `Settlement ${settlementId} is FAILED and its obligations were reopened; record the arrival with Record external instead` });
    }
    const amountReceived = Number(p.amountReceived);
    if (!Number.isFinite(amountReceived) || amountReceived < 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: `amountReceived must be a non-negative number, got ${p.amountReceived}` });
    }
    let precision = null;
    try {
        const row = (await db_1.models.exchangeCurrency.findOne({ where: { currency: existing.currency }, attributes: ["precision"], raw: true }));
        precision = (row === null || row === void 0 ? void 0 : row.precision) != null ? Number(row.precision) : null;
    }
    catch (_a) {
        precision = null;
    }
    const tolerance = (0, reconcile_1.toleranceFor)(precision);
    await replayOwedBookkeeping(existing);
    await db_1.sequelize.transaction(async (t) => {
        var _a, _b, _c;
        var _d, _e, _f, _g, _h;
        await (0, ledger_1.withCurrencyAnchor)(existing.currency, t);
        const row = await db_1.models.poolBackingSettlement.findOne({ where: { id: settlementId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!row)
            return;
        if (row.status === "SETTLED" || row.status === "RECORDED")
            return;
        if (row.status === "FAILED") {
            throw (0, error_1.createError)({ statusCode: 409, message: `Settlement ${settlementId} is FAILED; record the arrival with Record external instead` });
        }
        const settledAt = new Date();
        const claimed = (await db_1.models.poolBackingObligation.findAll({
            where: { settlementId, status: "CLAIMED" },
            transaction: t,
            lock: t.LOCK.UPDATE,
        }));
        for (const ob of claimed) {
            await ob.update({ status: "SETTLED", settledAt }, { transaction: t });
        }
        const requested = num(row.amountRequested);
        const shortfall = requested - amountReceived;
        const proof = proofOf(row);
        const fees = { ...feesOf(row), shortfall: Number(shortfall.toFixed(18)) };
        const direction = String(row.direction);
        const fallbackDescription = `Pool-backing settlement ${settlementId} (${direction}, ${row.currency})`;
        const unbooked = (what, amount, asset) => (0, error_1.createError)({ statusCode: 500, message: `Settlement ${settlementId}: could not book the ${fmt(amount)} ${asset} ${what} as recognised loss; left unsettled for retry` });
        if (shortfall > tolerance) {
            fees.venueFee = shortfall;
            const receivingSide = direction === "exchange_to_eco" ? "ECO" : "SPOT";
            fees.venueFeeSide = receivingSide;
            const booked = await bookLoss(t, {
                currency: row.currency,
                walletType: receivingSide,
                chain: receivingSide === "ECO" ? (_d = row.chain) !== null && _d !== void 0 ? _d : undefined : undefined,
                lossAmount: shortfall,
                description: `${fallbackDescription}: the receiving side credited ${fmt(amountReceived)} of ${fmt(requested)} ${row.currency}; the venue's fee`,
                referenceId: `pool_backing_${settlementId}_venue`,
                metadata: { settlementId, direction, chain: row.chain, requested, received: amountReceived },
            });
            if (!booked)
                throw unbooked("venue fee", shortfall, row.currency);
        }
        else if (shortfall < -tolerance) {
            fees.overage = -shortfall;
            console_1.logger.warn(LOG, `Settlement ${settlementId} received ${fmt(amountReceived)} for ${fmt(requested)} ${row.currency} requested; overage recorded, not booked`);
        }
        if (direction === "exchange_to_eco") {
            const exchangeFee = Number(proof.exchangeFee);
            const onTop = Number.isFinite(exchangeFee) && exchangeFee > 0 ? exchangeFee - Math.max(shortfall, 0) : 0;
            if (onTop > tolerance) {
                fees.exchangeFee = onTop;
                const booked = await bookLoss(t, {
                    currency: row.currency,
                    walletType: "SPOT",
                    lossAmount: onTop,
                    description: `${fallbackDescription}: the exchange charged ${fmt(exchangeFee)} ${row.currency} for the withdrawal on top of the amount`,
                    referenceId: `pool_backing_${settlementId}_exchange_fee`,
                    metadata: { settlementId, direction, chain: row.chain, exchangeFee, requested, received: amountReceived },
                });
                if (!booked)
                    throw unbooked("exchange withdrawal fee", onTop, row.currency);
            }
        }
        const gasNative = Number((_e = fees.gasNative) !== null && _e !== void 0 ? _e : (_a = proof.gas) === null || _a === void 0 ? void 0 : _a.native);
        const gasSymbol = (_f = fees.gasSymbol) !== null && _f !== void 0 ? _f : (_b = proof.gas) === null || _b === void 0 ? void 0 : _b.symbol;
        if (direction === "eco_to_exchange" && Number.isFinite(gasNative) && gasNative > 0 && gasSymbol) {
            const paidByOwnKey = ((_c = proof.gas) === null || _c === void 0 ? void 0 : _c.paidBy) === "own";
            fees.gasNative = gasNative;
            fees.gasSymbol = gasSymbol;
            fees.gasPaidBy = paidByOwnKey ? "own" : "master";
            const booked = await bookLoss(t, {
                currency: String(gasSymbol),
                walletType: "ECO",
                chain: (_g = row.chain) !== null && _g !== void 0 ? _g : undefined,
                lossAmount: gasNative,
                description: `${fallbackDescription}: gas paid on ${row.chain} to move ${fmt(requested)} ${row.currency} to the exchange` +
                    (paidByOwnKey ? " (burned by the treasury's own address, whose record already carries it)" : ""),
                referenceId: `pool_backing_${settlementId}_gas`,
                metadata: { settlementId, direction, chain: row.chain, gasPaidBy: fees.gasPaidBy },
                debitTreasury: !paidByOwnKey,
            });
            if (!booked)
                throw unbooked("gas", gasNative, String(gasSymbol));
        }
        await row.update({
            status: "SETTLED",
            amountReceived,
            activeKey: null,
            fees,
            proof: { ...proof, arrival: (_h = p.evidence) !== null && _h !== void 0 ? _h : null, settledAt: settledAt.toISOString(), completedBy: p.actor },
        }, { transaction: t });
        console_1.logger.success(LOG, `Settlement ${settlementId} SETTLED (${p.actor}): ${fmt(amountReceived)} of ${fmt(requested)} ${row.currency} arrived; ${claimed.length} obligation(s) settled`);
    });
}
async function bookLoss(t, p) {
    try {
        const { recordPlatformLoss } = require("@b/utils/fees");
        const result = await recordPlatformLoss({ ...p, type: "POOL_BACKING", transaction: t });
        if (!result) {
            console_1.logger.error(LOG, `recordPlatformLoss wrote no row for ${fmt(p.lossAmount)} ${p.currency} (${p.referenceId}): no Super Admin, or the adminProfit write failed`);
            return null;
        }
        return result;
    }
    catch (error) {
        console_1.logger.error(LOG, `Could not book ${fmt(p.lossAmount)} ${p.currency} as pool-backing loss (${p.referenceId}): ${messageOf(error)}`);
        return null;
    }
}
async function takeDispatchStamp(settlementId) {
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    const existing = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: `Settlement ${settlementId} not found` });
    if (existing.status !== "PLANNED")
        return null;
    const stampedAt = timeOf(proofOf(existing).dispatchStartedAt);
    if (stampedAt) {
        if (Date.now() - stampedAt < DISPATCH_STALE_MS) {
            console_1.logger.info(LOG, `Settlement ${settlementId} is being dispatched by another process; leaving it`);
            return null;
        }
        await markNeedsReview(settlementId, "dispatch interrupted: check the chain/exchange before resolving");
        return null;
    }
    if (settings.paused) {
        console_1.logger.info(LOG, `Settlement ${settlementId} not dispatched: poolBackingPause is on`);
        return null;
    }
    if (settings.mode !== "manual" && settings.mode !== "auto") {
        console_1.logger.info(LOG, `Settlement ${settlementId} not dispatched: poolBackingMode is ${settings.mode}`);
        return null;
    }
    return db_1.sequelize.transaction(async (t) => {
        await (0, ledger_1.withCurrencyAnchor)(existing.currency, t);
        const row = await db_1.models.poolBackingSettlement.findOne({ where: { id: settlementId }, transaction: t, lock: t.LOCK.UPDATE });
        if (!row || row.status !== "PLANNED")
            return null;
        const proof = proofOf(row);
        if (proof.dispatchStartedAt)
            return null;
        await row.update({ proof: { ...proof, dispatchStartedAt: new Date().toISOString() } }, { transaction: t });
        return row;
    });
}
async function dispatchSettlement(settlementId) {
    var _a, _b, _c, _d, _e;
    const settlement = await takeDispatchStamp(settlementId);
    if (!settlement)
        return;
    const currency = String(settlement.currency);
    const chain = String((_a = settlement.chain) !== null && _a !== void 0 ? _a : "");
    const networkId = String((_b = settlement.network) !== null && _b !== void 0 ? _b : "");
    const amount = num(settlement.amountRequested);
    const direction = String(settlement.direction);
    const actor = "engine";
    try {
        if (direction === "eco_to_exchange")
            await dispatchEcoToExchange(settlement, { currency, chain, networkId, amount });
        else if (direction === "exchange_to_eco")
            await dispatchExchangeToEco(settlement, { currency, chain, networkId, amount });
        else if (direction === "exchange_convert") {
            const { dispatchConversion } = require("./convert");
            await dispatchConversion(settlement);
        }
        else
            await markNeedsReview(settlementId, `direction ${direction} is not dispatchable`);
    }
    catch (error) {
        console_1.logger.error(LOG, `Dispatch of settlement ${settlementId} threw: ${messageOf(error)}`, error);
        await markNeedsReview(settlementId, `dispatch error: ${messageOf(error)}`, {
            proof: { error: messageOf(error), hash: (_c = error === null || error === void 0 ? void 0 : error.hash) !== null && _c !== void 0 ? _c : null, precedingHash: (_d = error === null || error === void 0 ? void 0 : error.precedingHash) !== null && _d !== void 0 ? _d : null },
            txid: (_e = error === null || error === void 0 ? void 0 : error.hash) !== null && _e !== void 0 ? _e : null,
        }).catch((e) => console_1.logger.error(LOG, `Could not park settlement ${settlementId}: ${messageOf(e)}`));
    }
    void actor;
}
async function dispatchEcoToExchange(settlement, p) {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z;
    const id = String(settlement.id);
    const { currency, chain, networkId, amount } = p;
    const { exchange, provider } = await startExchange();
    if (!exchange || !provider) {
        await failSettlement(id, { reason: "the exchange is not reachable; nothing was sent", actor: "engine", allowMidDispatch: true });
        return;
    }
    let to;
    try {
        to = await (0, exchange_io_1.getExchangeDepositAddress)(exchange, provider, currency, networkId);
    }
    catch (error) {
        await failSettlement(id, { reason: `no exchange deposit address: ${messageOf(error)}`, actor: "engine", allowMidDispatch: true });
        return;
    }
    const memo = to.tag && (0, networks_1.chainHasMemo)(chain) ? String(to.tag) : null;
    if (to.tag && !memo) {
        await markNeedsReview(id, `the exchange's ${networkId} deposit address for ${currency} needs a memo/tag (${to.tag}) and the ecosystem handler for ${chain} cannot send one; nothing was sent`, {
            proof: { toAddress: to.address, tag: to.tag, nothingSent: true },
        });
        return;
    }
    const { kinds, decimals } = await readTokenKinds(currency);
    const kind = (_b = kinds[chain]) !== null && _b !== void 0 ? _b : "unsupported";
    if (kind === "unsupported") {
        await markNeedsReview(id, `no platform signer for ${currency} on ${chain} yet (EVM tokens, pooled UTXO coins, native EVM coins, SOL/SPL, TRX/TRC20, TON and XMR only); nothing was sent`, {
            proof: { toAddress: to.address, nothingSent: true },
        });
        return;
    }
    let treasuryWalletId;
    try {
        const wallet = await (0, treasury_1.getTreasuryEcoWallet)(currency);
        treasuryWalletId = String(wallet.id);
    }
    catch (error) {
        await failSettlement(id, { reason: `treasury wallet unavailable: ${messageOf(error)}`, actor: "engine", allowMidDispatch: true });
        return;
    }
    const broadcastAt = new Date().toISOString();
    try {
        if (kind === "evm_token") {
            const { sendEvmTokenFromCustody } = require("@b/api/(ext)/ecosystem/utils/settlement-move");
            const result = await sendEvmTokenFromCustody({
                chain,
                currency,
                amount,
                to: to.address,
                treasuryWalletId,
                settlementId: id,
                onSourceResolved: async (source) => {
                    const owed = source.kind === "own" || source.kind === "alternative";
                    await writeSettlement(id, currency, {
                        proof: { ...(await currentProof(id)), source: { ...source, chain, resolvedAt: new Date().toISOString() }, ...(owed ? { bookkeepingPending: true } : {}) },
                    });
                },
                onBroadcast: async (hash, precedingHash) => {
                    await reserveTxidOnRow(id, currency, hash, { ...(await currentProof(id)), precedingHash, toAddress: to.address, broadcastAt });
                },
            });
            const txid = (0, exchange_io_1.normaliseTxid)(result.hash);
            const proof = {
                ...(await currentProof(id)),
                txid,
                precedingHash: (_c = result.precedingHash) !== null && _c !== void 0 ? _c : null,
                fromAddress: result.fromAddress,
                toAddress: to.address,
                tag: null,
                amountSent: amount,
                broadcastAt,
                sourceKind: result.sourceKind,
                sourceWalletDataId: (_d = result.sourceWalletDataId) !== null && _d !== void 0 ? _d : null,
                mover: result.mover,
                blockNumber: (_e = result.blockNumber) !== null && _e !== void 0 ? _e : null,
                gas: { native: (_f = result.gasNative) !== null && _f !== void 0 ? _f : null, symbol: (_g = result.gasSymbol) !== null && _g !== void 0 ? _g : null },
                ...(result.bookkeepingError ? { bookkeepingError: result.bookkeepingError } : {}),
            };
            const fees = { ...feesOf(settlement), gasNative: (_h = result.gasNative) !== null && _h !== void 0 ? _h : null, gasSymbol: (_j = result.gasSymbol) !== null && _j !== void 0 ? _j : null };
            if (result.bookkeepingError) {
                await markNeedsReview(id, `the coins left custody (${txid}) but the ${result.sourceKind} source could not be booked: ${result.bookkeepingError}`, {
                    proof,
                    txid,
                });
                await writeSettlement(id, currency, { amountSent: amount, fees });
                return;
            }
            const written = await writeSettlement(id, currency, { status: "DISPATCHED", txid, amountSent: amount, proof, fees }, { status: "PLANNED" });
            if (!written) {
                await recordLateDispatch(id, currency, { txid, amountSent: amount, proof, fees });
                return;
            }
            console_1.logger.info(LOG, `Settlement ${id} DISPATCHED: ${fmt(amount)} ${currency} on ${chain} -> ${to.address} (${txid}, ${result.sourceKind} source)`);
            return;
        }
        if (networks_1.NATIVE_SIGNER_KINDS.has(kind)) {
            const { sendNativeFromCustody } = require("@b/api/(ext)/ecosystem/utils/settlement-move");
            const result = await sendNativeFromCustody({
                kind,
                chain,
                currency,
                amount,
                to: to.address,
                memo,
                treasuryWalletId,
                settlementId: id,
                onSourceResolved: async (source) => {
                    const owed = source.kind === "own";
                    await writeSettlement(id, currency, {
                        proof: { ...(await currentProof(id)), source: { ...source, chain, resolvedAt: new Date().toISOString() }, ...(owed ? { bookkeepingPending: true } : {}) },
                    });
                },
                onSent: async (payload, seqno) => {
                    await writeSettlement(id, currency, {
                        proof: { ...(await currentProof(id)), tonPayload: payload, tonSeqno: seqno, sentAt: new Date().toISOString(), toAddress: to.address, tag: memo },
                    });
                },
                onExpectedTxid: async (expected) => {
                    await reserveTxidOnRow(id, currency, expected, {
                        ...(await currentProof(id)),
                        txHashPending: expected,
                        expectedTxidAt: new Date().toISOString(),
                        toAddress: to.address,
                        tag: memo,
                    });
                },
                onBroadcast: async (hash) => {
                    await reserveTxidOnRow(id, currency, hash, { ...(await currentProof(id)), toAddress: to.address, tag: memo, broadcastAt });
                },
            });
            const txid = (0, exchange_io_1.normaliseTxid)(result.hash);
            const proof = {
                ...(await currentProof(id)),
                txid,
                precedingHash: null,
                fromAddress: result.fromAddress,
                toAddress: to.address,
                tag: memo,
                amountSent: amount,
                broadcastAt,
                sourceKind: result.sourceKind,
                sourceWalletDataId: (_k = result.sourceWalletDataId) !== null && _k !== void 0 ? _k : null,
                mover: result.mover,
                blockNumber: (_l = result.blockNumber) !== null && _l !== void 0 ? _l : null,
                gas: { native: (_m = result.gasNative) !== null && _m !== void 0 ? _m : null, symbol: (_o = result.gasSymbol) !== null && _o !== void 0 ? _o : null, paidBy: (_p = result.gasPaidBy) !== null && _p !== void 0 ? _p : null },
                ...(result.tonPayload ? { tonPayload: result.tonPayload } : {}),
                ...(result.bookkeepingError ? { bookkeepingError: result.bookkeepingError } : {}),
            };
            const fees = { ...feesOf(settlement), gasNative: (_q = result.gasNative) !== null && _q !== void 0 ? _q : null, gasSymbol: (_r = result.gasSymbol) !== null && _r !== void 0 ? _r : null };
            if (result.bookkeepingError) {
                await markNeedsReview(id, `the coins left custody (${txid}) but the ${result.sourceKind} source could not be booked: ${result.bookkeepingError}`, {
                    proof,
                    txid,
                });
                await writeSettlement(id, currency, { amountSent: amount, fees });
                return;
            }
            const written = await writeSettlement(id, currency, { status: "DISPATCHED", txid, amountSent: amount, proof, fees }, { status: "PLANNED" });
            if (!written) {
                await recordLateDispatch(id, currency, { txid, amountSent: amount, proof, fees });
                return;
            }
            console_1.logger.info(LOG, `Settlement ${id} DISPATCHED: ${fmt(amount)} ${currency} on ${chain} -> ${to.address}${memo ? ` (memo ${memo})` : ""} (${txid}, ${kind} from the ${result.sourceKind} source)`);
            return;
        }
        const { sendPooledUtxo } = require("@b/api/(ext)/ecosystem/utils/utxo");
        const amountSats = toBaseUnits(amount, (_s = decimals[chain]) !== null && _s !== void 0 ? _s : 8);
        const result = await sendPooledUtxo({
            chain,
            currency,
            amountSats,
            to: to.address,
            onExpectedTxid: async (expected) => {
                const txid = (0, exchange_io_1.normaliseTxid)(expected);
                await writeSettlement(id, currency, {
                    txid,
                    proof: { ...proofOf(settlement), txHashPending: expected, expectedTxidAt: new Date().toISOString(), toAddress: to.address },
                });
            },
        });
        const txid = (0, exchange_io_1.normaliseTxid)(result.txid);
        const proof = {
            ...proofOf(settlement),
            txid,
            txHashPending: result.txid,
            fromAddress: (_t = (_a = result.fromAddresses) === null || _a === void 0 ? void 0 : _a[0]) !== null && _t !== void 0 ? _t : null,
            fromAddresses: (_u = result.fromAddresses) !== null && _u !== void 0 ? _u : [],
            toAddress: to.address,
            tag: null,
            amountSent: amount,
            broadcastAt,
            sourceKind: "pool",
            feeSats: result.feeSats != null ? result.feeSats.toString() : null,
            changeSats: result.changeSats != null ? result.changeSats.toString() : null,
        };
        const feeNative = result.feeSats != null ? Number(result.feeSats) / Math.pow(10, (_v = decimals[chain]) !== null && _v !== void 0 ? _v : 8) : null;
        const fees = { ...feesOf(settlement), gasNative: feeNative, gasSymbol: currency };
        const written = await writeSettlement(id, currency, { status: "DISPATCHED", txid, amountSent: amount, proof, fees }, { status: "PLANNED" });
        if (!written) {
            await recordLateDispatch(id, currency, { txid, amountSent: amount, proof, fees });
            return;
        }
        console_1.logger.info(LOG, `Settlement ${id} DISPATCHED: ${fmt(amount)} ${currency} on ${chain} -> ${to.address} (${txid}, pooled UTXO)`);
    }
    catch (error) {
        if (error && typeof error === "object" && error[NOT_BROADCAST_FLAG] === true) {
            await failSettlement(id, { reason: `the mover refused before sending: ${messageOf(error)}`, actor: "engine", allowMidDispatch: true });
            return;
        }
        const collided = (error === null || error === void 0 ? void 0 : error.txidCollision) ? String(error.txidCollision) : null;
        await markNeedsReview(id, `the mover could not prove whether the coins left: ${messageOf(error)}`, {
            proof: {
                error: messageOf(error),
                hash: collided ? null : (_w = error === null || error === void 0 ? void 0 : error.hash) !== null && _w !== void 0 ? _w : null,
                precedingHash: (_x = error === null || error === void 0 ? void 0 : error.precedingHash) !== null && _x !== void 0 ? _x : null,
                reverted: (error === null || error === void 0 ? void 0 : error.reverted) === true,
                toAddress: to.address,
                broadcastAt,
                ...(memo ? { tag: memo } : {}),
                ...(collided ? { txidCollision: collided } : {}),
                ...((error === null || error === void 0 ? void 0 : error.tonPayload) ? { tonPayload: String(error.tonPayload), tonSeqno: (_y = error === null || error === void 0 ? void 0 : error.tonSeqno) !== null && _y !== void 0 ? _y : null } : {}),
            },
            txid: collided ? null : (_z = error === null || error === void 0 ? void 0 : error.hash) !== null && _z !== void 0 ? _z : null,
        });
    }
}
async function dispatchExchangeToEco(settlement, p) {
    var _a, _b, _c, _d;
    const id = String(settlement.id);
    const { currency, chain, networkId, amount } = p;
    let treasury;
    try {
        treasury = await (0, treasury_1.getTreasuryAddress)(currency, chain);
    }
    catch (error) {
        await failSettlement(id, { reason: `treasury wallet unavailable: ${messageOf(error)}`, actor: "engine", allowMidDispatch: true });
        return;
    }
    if (!treasury) {
        await failSettlement(id, { reason: `the treasury has no ${chain} address for ${currency}; nothing was requested`, actor: "engine", allowMidDispatch: true });
        return;
    }
    const { exchange, provider } = await startExchange();
    if (!exchange || !provider) {
        await failSettlement(id, { reason: "the exchange is not reachable; nothing was requested", actor: "engine", allowMidDispatch: true });
        return;
    }
    let topUp;
    try {
        topUp = await (0, exchange_io_1.ensureWithdrawableBalance)(exchange, provider, currency, amount);
    }
    catch (error) {
        await failSettlement(id, { reason: messageOf(error), actor: "engine", allowMidDispatch: true });
        return;
    }
    const requestedAt = new Date().toISOString();
    let issued;
    try {
        issued = await (0, exchange_io_1.issueExchangeWithdrawal)(exchange, provider, { currency, amount, address: treasury.address, tag: null, networkId });
    }
    catch (error) {
        await failSettlement(id, { reason: messageOf(error), actor: "engine", allowMidDispatch: true });
        return;
    }
    const proof = {
        ...proofOf(settlement),
        toAddress: treasury.address,
        treasuryWalletId: treasury.walletId,
        tag: null,
        amountSent: amount,
        requestedAt,
        provider,
        topUp: topUp.moved > 0 ? topUp : undefined,
        ...(issued.indeterminate
            ? { indeterminate: true, exchangeResponse: (_a = issued.raw) !== null && _a !== void 0 ? _a : null }
            : { exchangeWithdrawalId: issued.id, exchangeResponse: (_b = issued.raw) !== null && _b !== void 0 ? _b : null }),
        ...(issued.txid ? { txid: issued.txid } : {}),
    };
    const written = await writeSettlement(id, currency, { status: "DISPATCHED", amountSent: amount, txid: (_c = issued.txid) !== null && _c !== void 0 ? _c : null, proof }, { status: "PLANNED" });
    if (!written) {
        await recordLateDispatch(id, currency, { txid: (_d = issued.txid) !== null && _d !== void 0 ? _d : null, amountSent: amount, proof, fees: feesOf(settlement) });
        return;
    }
    console_1.logger.info(LOG, `Settlement ${id} DISPATCHED: ${provider} withdrawal of ${fmt(amount)} ${currency} on ${networkId} to the treasury ${treasury.address}` +
        (issued.indeterminate ? " (INDETERMINATE: no id; the verifier matches by address, amount and time)" : ` (id ${issued.id})`));
    await watchTreasuryAddress({
        walletId: treasury.walletId,
        chain,
        currency,
        address: treasury.address,
        contractType: treasury.contractType,
        contract: treasury.contract,
        decimals: treasury.decimals,
    });
}
async function verifySettlement(settlementId) {
    const s = await db_1.models.poolBackingSettlement.findByPk(settlementId);
    if (!s)
        throw (0, error_1.createError)({ statusCode: 404, message: `Settlement ${settlementId} not found` });
    const status = String(s.status);
    if (!IN_FLIGHT.includes(status))
        return;
    const now = Date.now();
    const proof = proofOf(s);
    if (status === "PLANNED") {
        const stampedAt = timeOf(proof.dispatchStartedAt);
        if (stampedAt) {
            if (now - stampedAt >= DISPATCH_STALE_MS) {
                await markNeedsReview(settlementId, "dispatch interrupted: check the chain/exchange before resolving");
            }
            return;
        }
        await dispatchSettlement(settlementId);
        return;
    }
    if (s.direction === "eco_to_exchange")
        await verifyEcoToExchange(s, proof, now);
    else if (s.direction === "exchange_to_eco")
        await verifyExchangeToEco(s, proof, now);
    else if (s.direction === "exchange_convert") {
        const { verifyConversion } = require("./convert");
        await verifyConversion(s, proof, now);
    }
}
async function verifyEcoToExchange(s, proof, now) {
    var _a, _b, _c, _d;
    var _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    const id = String(s.id);
    const currency = String(s.currency);
    const txid = (0, exchange_io_1.normaliseTxid)((_e = s.txid) !== null && _e !== void 0 ? _e : proof.txid);
    const startedAt = timeOf(proof.broadcastAt) || timeOf(s.createdAt);
    const age = now - startedAt;
    try {
        await replayOwedBookkeeping(s);
    }
    catch (error) {
        console_1.logger.error(LOG, `Settlement ${id}: the owed source bookkeeping could not be replayed: ${messageOf(error)}`);
    }
    if (!txid) {
        if (age >= DISPATCH_STALE_MS) {
            await markNeedsReview(id, "dispatched without a transaction hash; attach the txid or mark it failed after checking the chain");
        }
        return;
    }
    const { exchange } = await startExchange();
    if (!exchange) {
        console_1.logger.warn(LOG, `Settlement ${id}: exchange unreachable; verification deferred`);
        return;
    }
    let deposit;
    try {
        deposit = await (0, exchange_io_1.findExchangeDeposit)(exchange, currency, {
            txid,
            address: (_f = proof.toAddress) !== null && _f !== void 0 ? _f : null,
            tag: (_g = proof.tag) !== null && _g !== void 0 ? _g : null,
            amount: num((_h = s.amountSent) !== null && _h !== void 0 ? _h : s.amountRequested),
            since: startedAt ? startedAt - HOUR_MS : undefined,
        });
    }
    catch (error) {
        console_1.logger.warn(LOG, `Settlement ${id}: deposit lookup failed (${messageOf(error)}); verification deferred`);
        return;
    }
    if (deposit.found && deposit.addressMismatch) {
        await markNeedsReview(id, `the exchange lists deposit ${txid} at an address that is not the settlement's; do not settle without checking`, {
            proof: { exchangeDeposit: (_j = deposit.raw) !== null && _j !== void 0 ? _j : null, exchangeDepositSeenAt: new Date().toISOString() },
        });
        return;
    }
    if (deposit.found && deposit.ok) {
        const received = deposit.amount != null ? deposit.amount : num(s.amountRequested);
        await completeSettlement(id, {
            amountReceived: received,
            evidence: { exchangeDeposit: (_k = deposit.raw) !== null && _k !== void 0 ? _k : null, exchangeDepositId: (_l = (_a = deposit.raw) === null || _a === void 0 ? void 0 : _a.id) !== null && _l !== void 0 ? _l : null, fee: deposit.fee, checkedAt: new Date().toISOString() },
            actor: "engine",
        });
        return;
    }
    if (deposit.found) {
        if (s.status !== "CONFIRMED") {
            await writeSettlement(id, currency, {
                status: "CONFIRMED",
                proof: { ...proof, confirmedAt: new Date().toISOString(), exchangeDepositStatus: (_m = (_b = deposit.raw) === null || _b === void 0 ? void 0 : _b.status) !== null && _m !== void 0 ? _m : null, exchangeDeposit: (_o = deposit.raw) !== null && _o !== void 0 ? _o : null },
            }, { status: "DISPATCHED" });
            console_1.logger.info(LOG, `Settlement ${id} CONFIRMED: the exchange lists deposit ${txid} as ${(_p = (_c = deposit.raw) === null || _c === void 0 ? void 0 : _c.status) !== null && _p !== void 0 ? _p : "pending"}`);
        }
        if (age >= REVIEW_AFTER_MS) {
            await markNeedsReview(id, `the exchange has listed deposit ${txid} as ${(_q = (_d = deposit.raw) === null || _d === void 0 ? void 0 : _d.status) !== null && _q !== void 0 ? _q : "pending"} for over 72 h without accepting it`);
        }
        return;
    }
    if (age >= REVIEW_AFTER_MS) {
        await markNeedsReview(id, `the exchange has not listed deposit ${txid} within 72 h of the broadcast; check the chain and the exchange`);
    }
}
async function verifyExchangeToEco(s, proof, now) {
    var _a, _b, _c, _d, _e, _f;
    const id = String(s.id);
    const currency = String(s.currency);
    const chain = String((_a = s.chain) !== null && _a !== void 0 ? _a : "");
    const requestedAt = timeOf(proof.requestedAt) || timeOf(s.createdAt);
    const age = now - requestedAt;
    let txid = (0, exchange_io_1.normaliseTxid)((_b = s.txid) !== null && _b !== void 0 ? _b : proof.txid);
    let workingProof = { ...proof };
    if (s.status === "DISPATCHED") {
        const { exchange } = await startExchange();
        if (!exchange) {
            console_1.logger.warn(LOG, `Settlement ${id}: exchange unreachable; verification deferred`);
        }
        else {
            let withdrawalId = workingProof.exchangeWithdrawalId ? String(workingProof.exchangeWithdrawalId) : null;
            if (!withdrawalId && workingProof.indeterminate) {
                const adopted = await adoptIndeterminateWithdrawal(exchange, s, workingProof, requestedAt);
                if (adopted) {
                    withdrawalId = adopted.id;
                    workingProof = { ...workingProof, exchangeWithdrawalId: adopted.id, indeterminate: false, adoptedAt: new Date().toISOString(), adoptedFrom: (_c = adopted.raw) !== null && _c !== void 0 ? _c : null };
                    await writeSettlement(id, currency, { proof: workingProof }, { status: "DISPATCHED" });
                }
                else if (!txid) {
                    if (age >= INDETERMINATE_GRACE_MS) {
                        await markNeedsReview(id, `the withdrawal request was indeterminate and the exchange lists no matching withdrawal to ${(_d = workingProof.toAddress) !== null && _d !== void 0 ? _d : "the treasury"} after 30 min; check the exchange before resolving`);
                    }
                    return;
                }
            }
            if (withdrawalId) {
                let found;
                try {
                    found = await (0, exchange_io_1.findExchangeWithdrawal)(exchange, currency, withdrawalId, requestedAt ? requestedAt - HOUR_MS : undefined);
                }
                catch (error) {
                    console_1.logger.warn(LOG, `Settlement ${id}: withdrawal lookup failed (${messageOf(error)}); verification deferred`);
                    found = null;
                    if (age < REVIEW_AFTER_MS)
                        return;
                }
                if (found) {
                    if (found.status === "FAILED" || found.status === "CANCELLED") {
                        await failSettlement(id, { reason: `the exchange ${found.status === "FAILED" ? "refused" : "cancelled"} withdrawal ${withdrawalId}`, actor: "engine", allowMidDispatch: true });
                        return;
                    }
                    if (found.status === "COMPLETED") {
                        if (found.txid && !txid)
                            txid = found.txid;
                        workingProof = {
                            ...workingProof,
                            txid: (_e = txid !== null && txid !== void 0 ? txid : workingProof.txid) !== null && _e !== void 0 ? _e : null,
                            exchangeWithdrawal: (_f = found.raw) !== null && _f !== void 0 ? _f : null,
                            exchangeFee: found.fee,
                            confirmedAt: new Date().toISOString(),
                        };
                        await writeSettlement(id, currency, { status: "CONFIRMED", txid: txid !== null && txid !== void 0 ? txid : null, proof: workingProof }, { status: "DISPATCHED" });
                        console_1.logger.info(LOG, `Settlement ${id} CONFIRMED: ${currency} withdrawal ${withdrawalId} completed on the exchange${txid ? ` (${txid})` : " (no txid published)"}`);
                    }
                    else if (found.txid && !txid) {
                        txid = found.txid;
                        workingProof = { ...workingProof, txid };
                        await writeSettlement(id, currency, { txid, proof: workingProof }, { status: "DISPATCHED" });
                    }
                }
            }
        }
    }
    if (txid) {
        const arrival = await findTreasuryDeposit(currency, txid);
        if (arrival) {
            await completeSettlement(id, {
                amountReceived: num(arrival.amount),
                evidence: { treasuryTransactionId: arrival.id, trxId: arrival.trxId, walletId: arrival.walletId, checkedAt: new Date().toISOString() },
                actor: "engine",
            });
            return;
        }
        const treasury = await (0, treasury_1.getTreasuryAddress)(currency, chain).catch(() => null);
        if (treasury) {
            const entry = { walletId: treasury.walletId, chain, currency, address: treasury.address, contractType: treasury.contractType, contract: treasury.contract, decimals: treasury.decimals };
            await watchTreasuryAddress(entry);
            await scanTreasuryAddressOnce(entry);
            const again = await findTreasuryDeposit(currency, txid);
            if (again) {
                await completeSettlement(id, {
                    amountReceived: num(again.amount),
                    evidence: { treasuryTransactionId: again.id, trxId: again.trxId, walletId: again.walletId, checkedAt: new Date().toISOString() },
                    actor: "engine",
                });
                return;
            }
        }
    }
    if (age >= REVIEW_AFTER_MS) {
        await markNeedsReview(id, txid
            ? `the treasury has not been credited with ${txid} within 72 h; check the chain and the scanner before resolving`
            : `the exchange has not completed the withdrawal within 72 h; check the exchange before resolving`);
    }
}
async function adoptIndeterminateWithdrawal(exchange, s, proof, requestedAt) {
    var _a;
    var _b;
    if (!((_a = exchange === null || exchange === void 0 ? void 0 : exchange.has) === null || _a === void 0 ? void 0 : _a.fetchWithdrawals))
        return null;
    const currency = String(s.currency);
    const requested = num(s.amountRequested);
    const wantedAddress = String((_b = proof.toAddress) !== null && _b !== void 0 ? _b : "").trim().toLowerCase();
    if (!wantedAddress)
        return null;
    let list = [];
    try {
        list = (await exchange.fetchWithdrawals(currency, requestedAt ? requestedAt - HOUR_MS : undefined)) || [];
    }
    catch (error) {
        console_1.logger.warn(LOG, `Settlement ${s.id}: fetchWithdrawals failed while matching an indeterminate request: ${messageOf(error)}`);
        return null;
    }
    const tolerance = Math.max(1e-8, requested * 0.02);
    const matches = list.filter((w) => {
        var _a, _b;
        const address = String((_b = (_a = w === null || w === void 0 ? void 0 : w.addressTo) !== null && _a !== void 0 ? _a : w === null || w === void 0 ? void 0 : w.address) !== null && _b !== void 0 ? _b : "").trim().toLowerCase();
        if (address !== wantedAddress)
            return false;
        const amount = Number(w === null || w === void 0 ? void 0 : w.amount);
        if (!Number.isFinite(amount) || Math.abs(amount - requested) > tolerance)
            return false;
        const ts = Number(w === null || w === void 0 ? void 0 : w.timestamp);
        if (Number.isFinite(ts) && ts > 0 && ts < requestedAt - INDETERMINATE_MATCH_SLACK_MS)
            return false;
        return (w === null || w === void 0 ? void 0 : w.id) !== null && (w === null || w === void 0 ? void 0 : w.id) !== undefined && String(w.id).trim() !== "";
    });
    if (matches.length !== 1) {
        if (matches.length > 1)
            console_1.logger.warn(LOG, `Settlement ${s.id}: ${matches.length} withdrawals match the indeterminate request; not adopting any`);
        return null;
    }
    console_1.logger.info(LOG, `Settlement ${s.id}: adopted exchange withdrawal ${matches[0].id} for the indeterminate request`);
    return { id: String(matches[0].id), raw: matches[0] };
}
async function findTreasuryDeposit(currency, txid) {
    const wallet = await findTreasuryWallet(currency);
    if (!wallet)
        return null;
    const wanted = (0, exchange_io_1.normaliseTxid)(txid);
    if (!wanted)
        return null;
    const spellings = [...new Set([String(txid), wanted, wanted.toUpperCase(), wanted.startsWith("0x") ? `0x${wanted.slice(2).toUpperCase()}` : wanted])];
    const rows = (await db_1.models.transaction.findAll({
        where: { walletId: wallet.id, type: "DEPOSIT", trxId: spellings },
    }));
    const hit = rows.find((r) => (0, exchange_io_1.normaliseTxid)(r.trxId) === wanted && String(r.status) === "COMPLETED");
    return hit !== null && hit !== void 0 ? hit : null;
}
async function runPoolBackingSettlementCycle(o) {
    var _a, _b, _c, _d;
    var _e, _f, _g;
    await (0, settings_1.ensurePoolBackingSettings)();
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    const summary = {
        trigger: o.trigger,
        mode: settings.mode,
        paused: settings.paused,
        at: new Date().toISOString(),
        verified: 0,
        planned: [],
        refusals: [],
    };
    if (settings.mode === "off") {
        summary.skipped = "poolBackingMode is off";
        await persistEngineState(summary);
        return summary;
    }
    const inFlight = (await db_1.models.poolBackingSettlement.findAll({
        where: { status: [...IN_FLIGHT] },
        attributes: ["id", "currency", "status"],
        raw: true,
    }));
    for (const row of inFlight) {
        try {
            await verifySettlement(String(row.id));
        }
        catch (error) {
            console_1.logger.error(LOG, `Verification of settlement ${row.id} failed: ${messageOf(error)}`, error);
        }
        summary.verified += 1;
    }
    const planningAllowed = (o.trigger === "admin" && (settings.mode === "manual" || settings.mode === "auto")) || (o.trigger === "cron" && settings.mode === "auto");
    if (!planningAllowed) {
        summary.planningSkipped = o.trigger === "cron" ? `poolBackingMode is ${settings.mode}; the cron settles in auto only` : `poolBackingMode is ${settings.mode}; switch to manual to settle by hand`;
        await persistEngineState(summary);
        return summary;
    }
    if (settings.paused) {
        summary.planningSkipped = "poolBackingPause is on";
        await persistEngineState(summary);
        return summary;
    }
    if (!(await ecosystemInstalled())) {
        summary.planningSkipped = "the Ecosystem addon is not installed; only Record external can settle";
        await persistEngineState(summary);
        return summary;
    }
    const { exchange, provider } = await startExchange();
    if (!exchange || !provider) {
        summary.planningSkipped = "the exchange is not reachable";
        await persistEngineState(summary);
        return summary;
    }
    const onlyDirection = ((_a = o.only) === null || _a === void 0 ? void 0 : _a.direction) ? String(o.only.direction) : null;
    if (onlyDirection !== "exchange_convert") {
        try {
            await planAndDispatch(o, settings, exchange, provider, summary);
        }
        catch (error) {
            console_1.logger.error(LOG, `Settlement planning failed: ${messageOf(error)}`, error);
            summary.refusals.push({ currency: (_e = (_b = o.only) === null || _b === void 0 ? void 0 : _b.currency) !== null && _e !== void 0 ? _e : "*", reason: `planning failed: ${messageOf(error)}` });
        }
    }
    if (!onlyDirection || onlyDirection === "exchange_convert") {
        if (settings.autoConvert) {
            try {
                const { planConversions } = require("./convert");
                await planConversions(o, settings, exchange, provider, summary);
            }
            catch (error) {
                console_1.logger.error(LOG, `Conversion planning failed: ${messageOf(error)}`, error);
                summary.refusals.push({ currency: (_f = (_c = o.only) === null || _c === void 0 ? void 0 : _c.currency) !== null && _f !== void 0 ? _f : "*", reason: `conversion planning failed: ${messageOf(error)}`, direction: "exchange_convert" });
            }
        }
        else if (onlyDirection === "exchange_convert") {
            summary.refusals.push({
                currency: (_g = (_d = o.only) === null || _d === void 0 ? void 0 : _d.currency) !== null && _g !== void 0 ? _g : "*",
                reason: "poolBackingAutoConvert is off; the engine places no order on the exchange until it is switched on",
                direction: "exchange_convert",
            });
        }
    }
    await persistEngineState(summary);
    console_1.logger.info(LOG, `Settlement cycle (${o.trigger}, ${settings.mode}${settings.paused ? ", PAUSED" : ""}): ${summary.verified} verified, ${summary.planned.length} planned, ${summary.refusals.length} refusal(s)`);
    return summary;
}
async function planAndDispatch(o, settings, exchange, provider, summary) {
    var _a, _b, _c;
    var _d, _e, _f, _g, _h, _j, _k;
    const onlyCurrency = ((_a = o.only) === null || _a === void 0 ? void 0 : _a.currency) ? String(o.only.currency).trim().toUpperCase() : null;
    const onlyDirection = ((_b = o.only) === null || _b === void 0 ? void 0 : _b.direction) ? String(o.only.direction) : null;
    const onlyChain = ((_c = o.only) === null || _c === void 0 ? void 0 : _c.chain) ? String(o.only.chain).trim() : null;
    const initiatedBy = o.trigger === "cron" ? "auto" : (_d = o.actorId) !== null && _d !== void 0 ? _d : "admin";
    const open = (await db_1.models.poolBackingObligation.findAll({
        where: { status: "OPEN", nettable: true, ...(onlyCurrency ? { currency: onlyCurrency } : {}) },
        attributes: ["id", "currency", "side", "chain", "amount", "nettable", "source", "status", "createdAt"],
        raw: true,
    }));
    const byCurrency = new Map();
    for (const r of open) {
        const list = (_e = byCurrency.get(String(r.currency))) !== null && _e !== void 0 ? _e : [];
        list.push({ id: String(r.id), side: String(r.side), chain: (_f = r.chain) !== null && _f !== void 0 ? _f : null, amount: r.amount, nettable: !!r.nettable, source: String(r.source), status: String(r.status), createdAt: (_g = r.createdAt) !== null && _g !== void 0 ? _g : null });
        byCurrency.set(String(r.currency), list);
    }
    if (onlyCurrency && !byCurrency.has(onlyCurrency)) {
        summary.refusals.push({ currency: onlyCurrency, reason: "no open nettable obligations" });
        return;
    }
    const currencies = [...byCurrency.keys()].sort();
    if (!currencies.length)
        return;
    let catalogue = {};
    try {
        catalogue = (await exchange.fetchCurrencies()) || exchange.currencies || {};
    }
    catch (error) {
        console_1.logger.warn(LOG, `fetchCurrencies failed (${messageOf(error)}); network capability flags unavailable this cycle`);
        catalogue = (exchange === null || exchange === void 0 ? void 0 : exchange.currencies) || {};
    }
    const latestRecon = new Map();
    for (const r of (await db_1.models.poolBackingReconciliation.findAll({ where: { currency: currencies }, raw: true }))) {
        const prev = latestRecon.get(String(r.currency));
        if (!prev || timeOf(r.at) > timeOf(prev.at))
            latestRecon.set(String(r.currency), r);
    }
    const anchors = new Map();
    for (const a of (await db_1.models.poolBackingCurrency.findAll({ where: { currency: currencies } })))
        anchors.set(String(a.currency), a);
    const precisions = new Map();
    try {
        const rows = (await db_1.models.exchangeCurrency.findAll({ where: { currency: currencies }, attributes: ["currency", "precision"], raw: true }));
        for (const r of rows)
            precisions.set(String(r.currency), r.precision == null ? null : Number(r.precision));
    }
    catch (error) {
        console_1.logger.warn(LOG, `exchangeCurrency precisions unavailable (${messageOf(error)}); the default tolerance judges residuals this cycle`);
    }
    let rates = new Map();
    try {
        const { getUsdRates } = require("@b/api/finance/currency/utils");
        rates = await getUsdRates(currencies);
    }
    catch (error) {
        console_1.logger.warn(LOG, `USD rates unavailable (${messageOf(error)}); no plan can be made this cycle`);
    }
    for (const currency of currencies) {
        const refuse = (reason) => summary.refusals.push({ currency, reason });
        const recon = latestRecon.get(currency);
        if (!recon) {
            refuse("no reconciliation has run for this currency yet");
            continue;
        }
        if (String(recon.status) !== "ok") {
            refuse("the latest reconciliation could not read the exchange's holdings (h_unknown)");
            continue;
        }
        if (Date.now() - timeOf(recon.at) > RECONCILIATION_MAX_AGE_MS) {
            refuse(`the latest reconciliation is older than 1 h (${new Date(timeOf(recon.at)).toISOString()}); run it first`);
            continue;
        }
        const anchor = anchors.get(currency);
        if (o.trigger === "cron" && (anchor === null || anchor === void 0 ? void 0 : anchor.drift) != null) {
            const drift = Math.abs(Number(anchor.drift));
            const acknowledged = anchor.driftAcknowledgedAmount != null && Math.abs(Number(anchor.driftAcknowledgedAmount)) >= drift - EPSILON;
            if (!acknowledged) {
                refuse("the currency has unacknowledged drift; acknowledge it in the console before auto mode settles it");
                continue;
            }
        }
        if (o.trigger === "cron" && (anchor === null || anchor === void 0 ? void 0 : anchor.drift) == null && recon.residual != null) {
            const residual = Number(recon.residual);
            const streak = Number(anchor === null || anchor === void 0 ? void 0 : anchor.residualStreak) || 0;
            const tolerance = (0, reconcile_1.toleranceFor)(precisions.get(currency));
            if (Number.isFinite(residual) && Math.abs(residual) > tolerance && streak < settings.driftRuns) {
                refuse(`drift not yet confirmed: the latest reconciliation left an unexplained residual of ${fmt(residual)} ${currency} (run ${streak} of ${settings.driftRuns} before it persists as drift); auto mode waits for it to clear or to be acknowledged`);
                continue;
            }
        }
        const rows = (_h = byCurrency.get(currency)) !== null && _h !== void 0 ? _h : [];
        let prelim = 0;
        for (const r of rows)
            if (r.side === "both" || r.side === "ecosystem")
                prelim += num(r.amount);
        const { kinds } = await readTokenKinds(currency);
        let treasuryChains = [];
        if (prelim < 0) {
            try {
                const wallet = await (0, treasury_1.getTreasuryEcoWallet)(currency);
                treasuryChains = chainsOfWallet(wallet);
            }
            catch (error) {
                refuse(messageOf(error));
                continue;
            }
        }
        else {
            const wallet = await findTreasuryWallet(currency);
            treasuryChains = wallet ? chainsOfWallet(wallet) : [];
        }
        const networkMap = ((anchor === null || anchor === void 0 ? void 0 : anchor.networkMap) && typeof anchor.networkMap === "object" ? anchor.networkMap : null);
        const input = {
            currency,
            rows,
            thresholdUsd: (anchor === null || anchor === void 0 ? void 0 : anchor.thresholdUsd) != null && Number(anchor.thresholdUsd) >= 0 ? Number(anchor.thresholdUsd) : settings.thresholdUsd,
            maxSettlementUsd: settings.maxSettlementUsd,
            usdRate: (_j = rates.get(currency)) !== null && _j !== void 0 ? _j : null,
            networkMap,
            provider,
            networks: (0, networks_1.normaliseExchangeNetworks)(catalogue === null || catalogue === void 0 ? void 0 : catalogue[currency]),
            treasuryChains: onlyChain ? treasuryChains.filter((c) => c.toUpperCase() === onlyChain.toUpperCase()) : treasuryChains,
            tokenKinds: onlyChain ? Object.fromEntries(Object.entries(kinds).filter(([c]) => c.toUpperCase() === onlyChain.toUpperCase())) : kinds,
            needsTagByNetwork: {},
        };
        let plan = planCurrency(input);
        if (plan.action === "eco_to_exchange" && plan.networkId) {
            try {
                const to = await (0, exchange_io_1.getExchangeDepositAddress)(exchange, provider, currency, plan.networkId);
                if (to.tag) {
                    input.needsTagByNetwork[plan.networkId] = true;
                    plan = planCurrency(input);
                }
            }
            catch (error) {
                refuse(`no exchange deposit address for ${currency} on ${plan.networkId}: ${messageOf(error)}`);
                continue;
            }
        }
        if (plan.action === "none") {
            refuse(plan.reason);
            continue;
        }
        if (onlyDirection && onlyDirection !== plan.action) {
            refuse(`the ledger needs ${plan.action} for ${currency} (${plan.reason}); a ${onlyDirection} settlement would move coins the wrong way`);
            continue;
        }
        const claim = await claimSettlement({
            currency,
            direction: plan.action,
            chain: plan.chain,
            networkId: plan.networkId,
            amount: plan.amount,
            rowIds: (_k = plan.rowIds) !== null && _k !== void 0 ? _k : [],
            initiatedBy,
        });
        if ("refused" in claim) {
            refuse(claim.refused);
            continue;
        }
        summary.planned.push({ currency, action: plan.action, settlementId: String(claim.settlement.id), chain: plan.chain, amount: plan.amount, reason: plan.reason });
        try {
            await dispatchSettlement(String(claim.settlement.id));
        }
        catch (error) {
            console_1.logger.error(LOG, `Dispatch of settlement ${claim.settlement.id} failed: ${messageOf(error)}`, error);
        }
    }
}
async function persistEngineState(summary) {
    const state = {
        lastCycleAt: summary.at,
        trigger: summary.trigger,
        mode: summary.mode,
        paused: summary.paused,
        verified: summary.verified,
        planned: summary.planned,
        lastRefusals: summary.refusals,
        ...(summary.skipped ? { skipped: summary.skipped } : {}),
        ...(summary.planningSkipped ? { planningSkipped: summary.planningSkipped } : {}),
    };
    const value = JSON.stringify(state);
    try {
        const [updated] = await db_1.models.settings.update({ value }, { where: { key: "poolBackingEngineState" } });
        if (!updated)
            await db_1.models.settings.create({ key: "poolBackingEngineState", value });
    }
    catch (error) {
        console_1.logger.warn(LOG, `Engine state not persisted: ${messageOf(error)}`);
    }
}
async function readPoolBackingEngineState() {
    try {
        const row = (await db_1.models.settings.findOne({
            where: { key: "poolBackingEngineState" },
            attributes: ["value"],
            raw: true,
        }));
        if (!(row === null || row === void 0 ? void 0 : row.value))
            return null;
        const parsed = typeof row.value === "string" ? JSON.parse(row.value) : row.value;
        return parsed && typeof parsed === "object" ? parsed : null;
    }
    catch (_a) {
        return null;
    }
}
