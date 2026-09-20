"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SPEND_MARGIN = exports.SELL_SLIPPAGE = exports.ORDER_OPEN_LIMIT_MS = exports.CONVERT_DIRECTION = void 0;
exports.c1Of = c1Of;
exports.isConvertible = isConvertible;
exports.selectEligible = selectEligible;
exports.chooseMarket = chooseMarket;
exports.amountStepOf = amountStepOf;
exports.sizeOrder = sizeOrder;
exports.claimUnderCap = claimUnderCap;
exports.reconciliationGate = reconciliationGate;
exports.readOrderOutcome = readOrderOutcome;
exports.clientOrderIdFor = clientOrderIdFor;
exports.planConversions = planConversions;
exports.dispatchConversion = dispatchConversion;
exports.verifyConversion = verifyConversion;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const settings_1 = require("./settings");
const reconcile_1 = require("./reconcile");
const exchange_io_1 = require("./exchange-io");
const exchange_status_1 = require("@b/api/finance/withdraw/exchange-status");
const engine_1 = require("./engine");
const LOG = "POOL_BACKING";
exports.CONVERT_DIRECTION = "exchange_convert";
const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;
exports.ORDER_OPEN_LIMIT_MS = 30 * MINUTE_MS;
const INDETERMINATE_GRACE_MS = 30 * MINUTE_MS;
const RECONCILIATION_MAX_AGE_MS = 1 * HOUR_MS;
exports.SELL_SLIPPAGE = 0.01;
exports.SPEND_MARGIN = 0.02;
const USD_STABLE = new Set(["USDT", "USDC", "USD", "BUSD", "TUSD", "FDUSD", "DAI", "PYUSD"]);
const CLIENT_ID_PROVIDERS = new Set(["kucoin", "binance", "okx"]);
const DECIMAL_PLACES = 2;
const SIGNIFICANT_DIGITS = 3;
const TICK_SIZE = 4;
const EPSILON = 1e-12;
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
function fmt(n) {
    return Number(n.toFixed(8)).toString();
}
function messageOf(error) {
    return String((error === null || error === void 0 ? void 0 : error.message) || error);
}
function legsOf(row) {
    const raw = row === null || row === void 0 ? void 0 : row.legs;
    if (raw == null)
        return {};
    let v = raw;
    for (let pass = 0; pass < 2 && typeof v === "string"; pass++) {
        try {
            v = JSON.parse(v);
        }
        catch (_a) {
            return {};
        }
    }
    return v && typeof v === "object" ? v : {};
}
function oldestFirst(rows) {
    return [...rows].sort((a, b) => timeOf(a.createdAt) - timeOf(b.createdAt) || String(a.id).localeCompare(String(b.id)));
}
function transferKeyOf(row) {
    const legs = legsOf(row);
    const fromLegs = legs.incomingTransactionId != null ? String(legs.incomingTransactionId) : null;
    if (fromLegs)
        return fromLegs;
    const ref = row.sourceRef != null ? String(row.sourceRef) : "";
    if (!ref)
        return null;
    const colon = ref.indexOf(":");
    return colon > 0 ? ref.slice(0, colon) : ref;
}
function c1Of(row) {
    const legs = legsOf(row);
    const c1 = legs.fromCurrency != null ? String(legs.fromCurrency).trim().toUpperCase() : "";
    return c1 || null;
}
function isConvertible(row) {
    return (String(row.status) === "OPEN" &&
        String(row.source) === "conversion" &&
        String(row.side) === "exchange" &&
        row.nettable !== true &&
        num(row.amount) > EPSILON);
}
function selectEligible(rows, unsettledC1Legs) {
    var _a, _b;
    const blockers = new Map();
    for (const leg of unsettledC1Legs) {
        if (String(leg.source) !== "conversion" || String(leg.side) !== "ecosystem")
            continue;
        if (String(leg.status) === "SETTLED")
            continue;
        const key = transferKeyOf(leg);
        if (!key)
            continue;
        blockers.set(key, [...((_a = blockers.get(key)) !== null && _a !== void 0 ? _a : []), leg]);
    }
    const eligible = [];
    const blocked = [];
    for (const row of rows) {
        if (!isConvertible(row))
            continue;
        const key = transferKeyOf(row);
        const legs = key ? (_b = blockers.get(key)) !== null && _b !== void 0 ? _b : [] : [];
        if (!legs.length) {
            eligible.push(row);
            continue;
        }
        const leg = legs[0];
        blocked.push({ id: row.id, reason: `the C1 leg of transfer ${key} (${fmt(num(leg.amount))} ${leg.currency}${leg.chain ? ` on ${leg.chain}` : ""}) is ${leg.status}, not SETTLED` });
    }
    return { eligible: oldestFirst(eligible), blocked };
}
function usableMarket(m) {
    if (!m || !m.symbol)
        return false;
    if (m.active === false)
        return false;
    if (m.spot === false)
        return false;
    if (m.type && String(m.type).toLowerCase() !== "spot")
        return false;
    return true;
}
function chooseMarket(p) {
    var _a, _b;
    const c2 = String((_a = p.c2) !== null && _a !== void 0 ? _a : "").trim().toUpperCase();
    const c1 = p.c1 ? String(p.c1).trim().toUpperCase() : null;
    const markets = (_b = p.markets) !== null && _b !== void 0 ? _b : {};
    const find = (base, quote) => {
        const direct = markets[`${base}/${quote}`];
        if (usableMarket(direct))
            return direct;
        const hit = Object.values(markets).find((m) => usableMarket(m) && String(m.base).toUpperCase() === base && String(m.quote).toUpperCase() === quote);
        return hit !== null && hit !== void 0 ? hit : null;
    };
    if (!c2)
        return { refused: "no currency to acquire" };
    if (c1 && c1 !== c2) {
        const buy = find(c2, c1);
        if (buy)
            return { symbol: buy.symbol, side: "buy", base: c2, quote: c1, market: buy };
        const sell = find(c1, c2);
        if (sell)
            return { symbol: sell.symbol, side: "sell", base: c1, quote: c2, market: sell };
    }
    if (c2 !== "USDT") {
        const usdt = find(c2, "USDT");
        if (usdt)
            return { symbol: usdt.symbol, side: "buy", base: c2, quote: "USDT", market: usdt };
    }
    const tried = [];
    if (c1 && c1 !== c2)
        tried.push(`${c2}/${c1}`, `${c1}/${c2}`);
    if (c2 !== "USDT" && !tried.includes(`${c2}/USDT`))
        tried.push(`${c2}/USDT`);
    return {
        refused: `no spot market on the exchange acquires ${c2}${tried.length ? ` (tried ${tried.join(", ")})` : " (no C1 recorded and it is USDT itself)"}; settle the row with Record external`,
    };
}
function amountStepOf(market, precisionMode) {
    var _a;
    const p = Number((_a = market === null || market === void 0 ? void 0 : market.precision) === null || _a === void 0 ? void 0 : _a.amount);
    if (!Number.isFinite(p) || p <= 0)
        return undefined;
    if (precisionMode === TICK_SIZE)
        return p;
    if (precisionMode === DECIMAL_PLACES)
        return Math.pow(10, -Math.floor(p));
    if (precisionMode === SIGNIFICANT_DIGITS)
        return undefined;
    return p < 1 ? p : Math.pow(10, -Math.floor(p));
}
function sizeOrder(p) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    const { market, side } = p;
    const requested = Number(p.requested);
    const price = Number(p.price);
    if (!(requested > 0))
        return { refused: "nothing to acquire" };
    if (!(price > 0))
        return { refused: `no usable price on ${market.symbol}` };
    const target = side === "buy" ? requested : (requested / price) * (1 + exports.SELL_SLIPPAGE);
    let sized;
    try {
        sized = Number(p.amountToPrecision(target));
        if (!(sized + EPSILON >= target)) {
            const step = amountStepOf(market, p.precisionMode);
            if (step)
                sized = Number(p.amountToPrecision(target + step));
        }
    }
    catch (error) {
        return { refused: `the exchange cannot express ${fmt(target)} ${market.base} on ${market.symbol}: ${messageOf(error)}` };
    }
    if (!Number.isFinite(sized) || !(sized + EPSILON >= target)) {
        return { refused: `the exchange's amount precision on ${market.symbol} cannot express ${fmt(target)} ${market.base}` };
    }
    const minAmount = Number((_b = (_a = market.limits) === null || _a === void 0 ? void 0 : _a.amount) === null || _b === void 0 ? void 0 : _b.min);
    const maxAmount = Number((_d = (_c = market.limits) === null || _c === void 0 ? void 0 : _c.amount) === null || _d === void 0 ? void 0 : _d.max);
    const minCost = Number((_f = (_e = market.limits) === null || _e === void 0 ? void 0 : _e.cost) === null || _f === void 0 ? void 0 : _f.min);
    const maxCost = Number((_h = (_g = market.limits) === null || _g === void 0 ? void 0 : _g.cost) === null || _h === void 0 ? void 0 : _h.max);
    const quoteValue = sized * price;
    if (Number.isFinite(minAmount) && minAmount > 0 && sized < minAmount) {
        return { refused: `${fmt(sized)} ${market.base} is below the exchange's minimum order of ${minAmount} ${market.base} on ${market.symbol}; wait for more rows or settle it with Record external` };
    }
    if (Number.isFinite(maxAmount) && maxAmount > 0 && sized > maxAmount) {
        return { refused: `${fmt(sized)} ${market.base} is above the exchange's maximum order of ${maxAmount} ${market.base} on ${market.symbol}; lower poolBackingMaxSettlementUsd or split the rows with Record external` };
    }
    if (Number.isFinite(minCost) && minCost > 0 && quoteValue < minCost) {
        return { refused: `${fmt(quoteValue)} ${market.quote} is below the exchange's minimum order value of ${minCost} ${market.quote} on ${market.symbol}; wait for more rows or settle it with Record external` };
    }
    if (Number.isFinite(maxCost) && maxCost > 0 && quoteValue > maxCost) {
        return { refused: `${fmt(quoteValue)} ${market.quote} is above the exchange's maximum order value of ${maxCost} ${market.quote} on ${market.symbol}; lower poolBackingMaxSettlementUsd or split the rows with Record external` };
    }
    return side === "buy"
        ? { amount: sized, estSpend: quoteValue, spendCurrency: market.quote, estAcquire: sized }
        : { amount: sized, estSpend: sized, spendCurrency: market.base, estAcquire: quoteValue };
}
function claimUnderCap(rows, capUnits) {
    const out = [];
    let amount = 0;
    for (const row of oldestFirst(rows)) {
        const value = num(row.amount);
        if (!(value > EPSILON))
            continue;
        if (capUnits != null && amount + value > capUnits + EPSILON)
            break;
        out.push(row);
        amount += value;
    }
    return { rows: out, amount };
}
function reconciliationGate(p) {
    const { recon, anchor } = p;
    if (!recon)
        return "no reconciliation has run for this currency yet";
    if (String(recon.status) !== "ok")
        return "the latest reconciliation could not read the exchange's holdings (h_unknown)";
    if (p.now - timeOf(recon.at) > RECONCILIATION_MAX_AGE_MS) {
        return `the latest reconciliation is older than 1 h (${new Date(timeOf(recon.at)).toISOString()}); run it first`;
    }
    if (p.trigger === "cron" && (anchor === null || anchor === void 0 ? void 0 : anchor.drift) != null) {
        const drift = Math.abs(Number(anchor.drift));
        const acknowledged = anchor.driftAcknowledgedAmount != null && Math.abs(Number(anchor.driftAcknowledgedAmount)) >= drift - EPSILON;
        if (!acknowledged)
            return "the currency has unacknowledged drift; acknowledge it in the console before auto mode settles it";
    }
    return null;
}
function readOrderOutcome(order, side, base, quote) {
    var _a, _b, _c, _d, _e, _f;
    const rawStatus = String((_a = order === null || order === void 0 ? void 0 : order.status) !== null && _a !== void 0 ? _a : "").trim().toLowerCase();
    const status = rawStatus === "closed" || rawStatus === "filled"
        ? "closed"
        : rawStatus === "canceled" || rawStatus === "cancelled"
            ? "canceled"
            : rawStatus === "rejected"
                ? "rejected"
                : rawStatus === "expired"
                    ? "expired"
                    : rawStatus === "open"
                        ? "open"
                        : "unknown";
    const filled = Math.max(0, num(order === null || order === void 0 ? void 0 : order.filled));
    const averageRaw = Number((_b = order === null || order === void 0 ? void 0 : order.average) !== null && _b !== void 0 ? _b : order === null || order === void 0 ? void 0 : order.price);
    const average = Number.isFinite(averageRaw) && averageRaw > 0 ? averageRaw : null;
    let cost = Math.max(0, num(order === null || order === void 0 ? void 0 : order.cost));
    if (!(cost > 0) && filled > 0 && average)
        cost = filled * average;
    const inferred = side === "buy" ? base : quote;
    const perCurrency = new Map();
    const list = Array.isArray(order === null || order === void 0 ? void 0 : order.fees) && order.fees.length ? order.fees : (order === null || order === void 0 ? void 0 : order.fee) ? [order.fee] : [];
    for (const f of list) {
        const c = Math.max(0, num(f === null || f === void 0 ? void 0 : f.cost));
        if (!(c > 0))
            continue;
        const currency = String((_c = f === null || f === void 0 ? void 0 : f.currency) !== null && _c !== void 0 ? _c : inferred).trim().toUpperCase() || inferred;
        perCurrency.set(currency, ((_d = perCurrency.get(currency)) !== null && _d !== void 0 ? _d : 0) + c);
    }
    const fees = [...perCurrency.entries()].map(([currency, c]) => ({ currency, cost: c })).sort((a, b) => a.currency.localeCompare(b.currency));
    const feeRaw = order === null || order === void 0 ? void 0 : order.fee;
    const fee = feeRaw && num(feeRaw.cost) > 0 ? { cost: num(feeRaw.cost), currency: String((_e = feeRaw.currency) !== null && _e !== void 0 ? _e : inferred).toUpperCase() } : (_f = fees[0]) !== null && _f !== void 0 ? _f : null;
    return { status, filled, cost, average, acquired: side === "buy" ? filled : cost, fees, fee, raw: order !== null && order !== void 0 ? order : null };
}
function clientOrderIdFor(settlementId) {
    return String(settlementId).replace(/-/g, "").slice(0, 32);
}
async function planConversions(o, settings, exchange, provider, summary) {
    var _a;
    var _b, _c, _d, _e, _f, _g, _h;
    const onlyCurrency = ((_a = o.only) === null || _a === void 0 ? void 0 : _a.currency) ? String(o.only.currency).trim().toUpperCase() : null;
    const initiatedBy = o.trigger === "cron" ? "auto" : (_b = o.actorId) !== null && _b !== void 0 ? _b : "admin";
    const refuse = (currency, reason) => summary.refusals.push({ currency, reason, direction: exports.CONVERT_DIRECTION });
    const open = (await db_1.models.poolBackingObligation.findAll({
        where: { status: "OPEN", source: "conversion", side: "exchange", ...(onlyCurrency ? { currency: onlyCurrency } : {}) },
        raw: true,
    })).map(asRow).filter(isConvertible);
    const byCurrency = new Map();
    for (const r of open)
        byCurrency.set(r.currency, [...((_c = byCurrency.get(r.currency)) !== null && _c !== void 0 ? _c : []), r]);
    if (onlyCurrency && !byCurrency.has(onlyCurrency)) {
        refuse(onlyCurrency, "no open conversion obligations on the exchange side");
        return;
    }
    const currencies = [...byCurrency.keys()].sort();
    if (!currencies.length)
        return;
    const unsettledLegs = (await db_1.models.poolBackingObligation.findAll({
        where: { source: "conversion", side: "ecosystem", status: ["OPEN", "CLAIMED", "WAIVED", "CANCELLED"] },
        raw: true,
    })).map(asRow);
    const latestRecon = new Map();
    for (const r of (await db_1.models.poolBackingReconciliation.findAll({ where: { currency: currencies }, raw: true }))) {
        const prev = latestRecon.get(String(r.currency));
        if (!prev || timeOf(r.at) > timeOf(prev.at))
            latestRecon.set(String(r.currency), r);
    }
    const anchors = new Map();
    for (const a of (await db_1.models.poolBackingCurrency.findAll({ where: { currency: currencies } })))
        anchors.set(String(a.currency), a);
    const priced = new Set(["USDT", ...currencies]);
    for (const rows of byCurrency.values())
        for (const r of rows) {
            const c1 = c1Of(r);
            if (c1)
                priced.add(c1);
        }
    let rates = new Map();
    try {
        const { getUsdRates } = require("@b/api/finance/currency/utils");
        rates = await getUsdRates([...priced]);
    }
    catch (error) {
        console_1.logger.warn(LOG, `USD rates unavailable (${messageOf(error)}); the conversion cap cannot be applied this cycle`);
    }
    const usdOf = (currency) => {
        const r = rates.get(currency);
        if (r != null && r > 0)
            return r;
        return USD_STABLE.has(currency) ? 1 : null;
    };
    let markets = null;
    const loadMarkets = async () => {
        if (markets)
            return markets;
        markets = ((await exchange.loadMarkets()) || exchange.markets || {});
        return markets;
    };
    for (const currency of currencies) {
        const gate = reconciliationGate({ recon: (_d = latestRecon.get(currency)) !== null && _d !== void 0 ? _d : null, anchor: (_e = anchors.get(currency)) !== null && _e !== void 0 ? _e : null, trigger: o.trigger, now: Date.now() });
        if (gate) {
            refuse(currency, gate);
            continue;
        }
        const inFlight = await db_1.models.poolBackingSettlement.findOne({ where: { activeKey: `${currency}|${exports.CONVERT_DIRECTION}` }, attributes: ["id", "status"], raw: true });
        if (inFlight) {
            refuse(currency, `a conversion for ${currency} is already in flight (settlement ${inFlight.id}, ${inFlight.status})`);
            continue;
        }
        const { eligible, blocked } = selectEligible((_f = byCurrency.get(currency)) !== null && _f !== void 0 ? _f : [], unsettledLegs);
        if (!eligible.length) {
            const why = blocked.slice(0, 3).map((b) => b.reason);
            refuse(currency, blocked.length ? `${blocked.length} conversion row(s) wait on their C1 leg: ${why.join("; ")}${blocked.length > 3 ? "; …" : ""}` : "no convertible rows");
            continue;
        }
        const groups = new Map();
        for (const r of eligible) {
            const key = (_g = c1Of(r)) !== null && _g !== void 0 ? _g : "";
            groups.set(key, [...((_h = groups.get(key)) !== null && _h !== void 0 ? _h : []), r]);
        }
        const [c1Key, group] = [...groups.entries()].sort((a, b) => timeOf(a[1][0].createdAt) - timeOf(b[1][0].createdAt) || a[0].localeCompare(b[0]))[0];
        const c1 = c1Key || null;
        let catalogue;
        try {
            catalogue = await loadMarkets();
        }
        catch (error) {
            refuse(currency, `the exchange's markets could not be loaded: ${messageOf(error)}`);
            continue;
        }
        const chosen = chooseMarket({ c2: currency, c1, markets: catalogue });
        if ("refused" in chosen) {
            refuse(currency, chosen.refused);
            continue;
        }
        let ticker;
        try {
            ticker = await exchange.fetchTicker(chosen.symbol);
        }
        catch (error) {
            refuse(currency, `no ticker for ${chosen.symbol}: ${messageOf(error)}`);
            continue;
        }
        const price = priceFrom(ticker, chosen.side);
        if (!price) {
            refuse(currency, `no usable price on ${chosen.symbol}`);
            continue;
        }
        let usdPerUnit = usdOf(currency);
        if (usdPerUnit == null) {
            const other = usdOf(chosen.side === "buy" ? chosen.quote : chosen.base);
            if (other != null)
                usdPerUnit = chosen.side === "buy" ? price * other : other / price;
        }
        let capUnits = null;
        if (settings.maxSettlementUsd != null && settings.maxSettlementUsd >= 0) {
            if (usdPerUnit == null || !(usdPerUnit > 0)) {
                refuse(currency, `no USD rate for ${currency}; the ${settings.maxSettlementUsd} USD per-movement cap cannot be applied`);
                continue;
            }
            capUnits = settings.maxSettlementUsd / usdPerUnit;
        }
        const claim = claimUnderCap(group, capUnits);
        if (!claim.rows.length) {
            refuse(currency, `the oldest open conversion row alone exceeds the ${settings.maxSettlementUsd} USD per-movement cap (${fmt(capUnits !== null && capUnits !== void 0 ? capUnits : 0)} ${currency}); split it with Record external or raise poolBackingMaxSettlementUsd`);
            continue;
        }
        const sized = sizeOrder({
            side: chosen.side,
            requested: claim.amount,
            price,
            market: chosen.market,
            precisionMode: exchange === null || exchange === void 0 ? void 0 : exchange.precisionMode,
            amountToPrecision: (amount) => exchange.amountToPrecision(chosen.symbol, amount),
        });
        if ("refused" in sized) {
            refuse(currency, sized.refused);
            continue;
        }
        const claimed = await (0, engine_1.claimSettlement)({
            currency,
            direction: exports.CONVERT_DIRECTION,
            chain: null,
            networkId: null,
            amount: claim.amount,
            rowIds: claim.rows.map((r) => r.id),
            initiatedBy,
            proof: {
                symbol: chosen.symbol,
                side: chosen.side,
                base: chosen.base,
                quote: chosen.quote,
                c1,
                provider,
                plannedPrice: price,
                plannedOrderAmount: sized.amount,
                plannedSpend: sized.estSpend,
                spendCurrency: sized.spendCurrency,
                usdPerUnit,
            },
        });
        if ("refused" in claimed) {
            refuse(currency, claimed.refused);
            continue;
        }
        const id = String(claimed.settlement.id);
        summary.planned.push({
            currency,
            action: exports.CONVERT_DIRECTION,
            settlementId: id,
            amount: claim.amount,
            reason: `the exchange owes ${fmt(claim.amount)} ${currency} it never received; ${chosen.side} ${fmt(sized.amount)} ${chosen.base} on ${chosen.symbol} at ~${fmt(price)}`,
        });
        try {
            await (0, engine_1.dispatchSettlement)(id);
        }
        catch (error) {
            console_1.logger.error(LOG, `Dispatch of conversion ${id} failed: ${messageOf(error)}`, error);
        }
    }
}
function asRow(r) {
    var _a, _b, _c, _d;
    return {
        id: String(r.id),
        currency: String(r.currency),
        amount: r.amount,
        status: String(r.status),
        source: String(r.source),
        side: String(r.side),
        nettable: r.nettable === true || r.nettable === 1 || r.nettable === "1",
        sourceRef: (_a = r.sourceRef) !== null && _a !== void 0 ? _a : null,
        legs: (_b = r.legs) !== null && _b !== void 0 ? _b : null,
        chain: (_c = r.chain) !== null && _c !== void 0 ? _c : null,
        createdAt: (_d = r.createdAt) !== null && _d !== void 0 ? _d : null,
    };
}
function priceFrom(ticker, side) {
    var _a;
    const preferred = Number(side === "buy" ? ticker === null || ticker === void 0 ? void 0 : ticker.ask : ticker === null || ticker === void 0 ? void 0 : ticker.bid);
    if (Number.isFinite(preferred) && preferred > 0)
        return preferred;
    const last = Number((_a = ticker === null || ticker === void 0 ? void 0 : ticker.last) !== null && _a !== void 0 ? _a : ticker === null || ticker === void 0 ? void 0 : ticker.close);
    return Number.isFinite(last) && last > 0 ? last : null;
}
async function dispatchConversion(settlement) {
    const id = String(settlement.id);
    const currency = String(settlement.currency);
    const requested = num(settlement.amountRequested);
    const planned = (0, engine_1.proofOf)(settlement);
    const symbol = planned.symbol ? String(planned.symbol) : null;
    const side = planned.side === "buy" || planned.side === "sell" ? planned.side : null;
    const refuseUnsent = (reason) => (0, engine_1.failSettlement)(id, { reason, actor: "engine", allowMidDispatch: true });
    if (!symbol || !side) {
        await refuseUnsent("the plan names no market; nothing was ordered");
        return;
    }
    const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
    if (!settings.autoConvert) {
        await refuseUnsent("poolBackingAutoConvert was switched off before the order was placed; nothing was ordered");
        return;
    }
    const { exchange, provider } = await (0, engine_1.startExchange)();
    if (!exchange || !provider) {
        await refuseUnsent("the exchange is not reachable; nothing was ordered");
        return;
    }
    let market;
    try {
        const markets = ((await exchange.loadMarkets()) || exchange.markets || {});
        market = markets[symbol];
    }
    catch (error) {
        await refuseUnsent(`the exchange's markets could not be loaded: ${messageOf(error)}; nothing was ordered`);
        return;
    }
    if (!usableMarket(market)) {
        await refuseUnsent(`${symbol} is no longer a live spot market on ${provider}; nothing was ordered`);
        return;
    }
    let price;
    try {
        price = priceFrom(await exchange.fetchTicker(symbol), side);
    }
    catch (error) {
        await refuseUnsent(`no ticker for ${symbol}: ${messageOf(error)}; nothing was ordered`);
        return;
    }
    if (!price) {
        await refuseUnsent(`no usable price on ${symbol}; nothing was ordered`);
        return;
    }
    const sized = sizeOrder({
        side,
        requested,
        price,
        market,
        precisionMode: exchange === null || exchange === void 0 ? void 0 : exchange.precisionMode,
        amountToPrecision: (amount) => exchange.amountToPrecision(symbol, amount),
    });
    if ("refused" in sized) {
        await refuseUnsent(`${sized.refused}; nothing was ordered`);
        return;
    }
    let topUp;
    try {
        topUp = await (0, exchange_io_1.ensureTradingBalance)(exchange, provider, sized.spendCurrency, sized.estSpend * (1 + exports.SPEND_MARGIN));
    }
    catch (error) {
        await refuseUnsent(`${messageOf(error)}; nothing was ordered`);
        return;
    }
    const clientOrderId = clientOrderIdFor(id);
    const orderRequestedAt = new Date().toISOString();
    const intent = {
        ...(await currentProof(id)),
        clientOrderId,
        orderRequestedAt,
        orderAmount: sized.amount,
        orderPrice: price,
        estSpend: sized.estSpend,
        spendCurrency: sized.spendCurrency,
        topUp: topUp.moved > 0 ? topUp : undefined,
    };
    const stamped = await (0, engine_1.writeSettlement)(id, currency, { proof: intent }, { status: "PLANNED" });
    if (!stamped) {
        console_1.logger.warn(LOG, `Conversion ${id} is no longer PLANNED; no order placed`);
        return;
    }
    const params = CLIENT_ID_PROVIDERS.has(String(provider).toLowerCase()) ? { clientOrderId } : {};
    let order;
    try {
        order = await exchange.createOrder(symbol, "market", side, sized.amount, undefined, params);
    }
    catch (error) {
        if ((0, exchange_status_1.isIndeterminateExchangeError)(error)) {
            console_1.logger.warn(LOG, `Conversion ${id}: ${provider} createOrder on ${symbol} is INDETERMINATE (${messageOf(error)}); not retrying`);
            await recordOrderPlaced(id, currency, { ...intent, indeterminate: true, exchangeResponse: { error: messageOf(error) } });
            return;
        }
        await refuseUnsent(`the exchange refused the order on ${symbol}: ${messageOf(error)}`);
        return;
    }
    const orderId = (order === null || order === void 0 ? void 0 : order.id) !== null && (order === null || order === void 0 ? void 0 : order.id) !== undefined && String(order.id).trim() !== "" ? String(order.id) : null;
    if (!orderId) {
        console_1.logger.warn(LOG, `Conversion ${id}: ${provider} accepted the order on ${symbol} but returned no id; treating as indeterminate`);
        await recordOrderPlaced(id, currency, { ...intent, indeterminate: true, exchangeResponse: order !== null && order !== void 0 ? order : null });
        return;
    }
    const proof = { ...intent, exchangeOrderId: orderId, requested, orderPlacedAt: new Date().toISOString(), exchangeResponse: order !== null && order !== void 0 ? order : null };
    const written = await recordOrderPlaced(id, currency, proof);
    if (!written)
        return;
    console_1.logger.info(LOG, `Conversion ${id} DISPATCHED: ${side} ${fmt(sized.amount)} ${market.base} on ${symbol} (${provider} order ${orderId}) to acquire ${fmt(requested)} ${currency}`);
    try {
        const fresh = await db_1.models.poolBackingSettlement.findByPk(id);
        if (fresh && String(fresh.status) === "DISPATCHED")
            await verifyConversion(fresh, (0, engine_1.proofOf)(fresh), Date.now(), { exchange, provider });
    }
    catch (error) {
        console_1.logger.warn(LOG, `Conversion ${id}: first verification failed (${messageOf(error)}); the next cycle retries`);
    }
}
async function currentProof(settlementId) {
    return (0, engine_1.proofOf)(await db_1.models.poolBackingSettlement.findByPk(settlementId));
}
async function recordOrderPlaced(id, currency, proof) {
    const written = await (0, engine_1.writeSettlement)(id, currency, { status: "DISPATCHED", proof }, { status: "PLANNED" });
    if (written)
        return true;
    const what = proof.exchangeOrderId ? `order ${proof.exchangeOrderId} placed` : `an order under client id ${proof.clientOrderId} may have been placed`;
    const reason = `the order was placed after the dispatch window had expired and the row was parked (${what}); check the exchange, then mark it arrived or failed`;
    console_1.logger.error(LOG, `Conversion ${id}: DISPATCHED write matched no PLANNED row; ${reason}`);
    const row = await db_1.models.poolBackingSettlement.findByPk(id);
    if (!row)
        return false;
    const status = String(row.status);
    const late = { ...(0, engine_1.proofOf)(row), ...proof, lateOrderAt: new Date().toISOString() };
    if (status === "SETTLED" || status === "RECORDED") {
        await (0, engine_1.writeSettlement)(id, currency, { proof: late });
        return false;
    }
    if (status === "FAILED") {
        await (0, engine_1.writeSettlement)(id, currency, {
            status: "NEEDS_REVIEW",
            activeKey: null,
            note: reason,
            proof: { ...late, needsReviewAt: new Date().toISOString(), reviewReason: reason },
        });
        console_1.logger.warn(LOG, `Conversion ${id} NEEDS_REVIEW: ${reason} (was FAILED)`);
        return false;
    }
    await (0, engine_1.markNeedsReview)(id, reason, { proof: late });
    return false;
}
async function verifyConversion(s, proof, now, io) {
    var _a, _b, _c, _d, _e;
    const id = String(s.id);
    const currency = String(s.currency);
    const status = String(s.status);
    if (status !== "DISPATCHED" && status !== "CONFIRMED")
        return;
    const requested = num(s.amountRequested);
    const symbol = proof.symbol ? String(proof.symbol) : null;
    const side = proof.side === "sell" ? "sell" : "buy";
    const base = String((_a = proof.base) !== null && _a !== void 0 ? _a : (side === "buy" ? currency : (_b = proof.c1) !== null && _b !== void 0 ? _b : ""));
    const quote = String((_c = proof.quote) !== null && _c !== void 0 ? _c : (side === "buy" ? (_d = proof.c1) !== null && _d !== void 0 ? _d : "USDT" : currency));
    const startedAt = timeOf(proof.orderRequestedAt) || timeOf(s.createdAt);
    const age = now - startedAt;
    if (!symbol) {
        await (0, engine_1.markNeedsReview)(id, "the row names no market; check the exchange for an order under its client id before resolving");
        return;
    }
    const { exchange, provider } = io !== null && io !== void 0 ? io : (await (0, engine_1.startExchange)());
    if (!exchange || !provider) {
        console_1.logger.warn(LOG, `Conversion ${id}: exchange unreachable; verification deferred`);
        return;
    }
    let workingProof = { ...proof };
    let orderId = workingProof.exchangeOrderId ? String(workingProof.exchangeOrderId) : null;
    if (!orderId) {
        const clientOrderId = workingProof.clientOrderId ? String(workingProof.clientOrderId) : null;
        if (clientOrderId && CLIENT_ID_PROVIDERS.has(String(provider).toLowerCase())) {
            try {
                const found = await exchange.fetchOrder(undefined, symbol, { clientOrderId });
                if ((found === null || found === void 0 ? void 0 : found.id) !== null && (found === null || found === void 0 ? void 0 : found.id) !== undefined && String(found.id).trim() !== "") {
                    orderId = String(found.id);
                    workingProof = { ...workingProof, exchangeOrderId: orderId, indeterminate: false, adoptedAt: new Date().toISOString(), adoptedFrom: found };
                    await (0, engine_1.writeSettlement)(id, currency, { proof: workingProof }, { status });
                    console_1.logger.info(LOG, `Conversion ${id}: adopted ${provider} order ${orderId} for the indeterminate request (client id ${clientOrderId})`);
                }
            }
            catch (error) {
                console_1.logger.warn(LOG, `Conversion ${id}: order lookup by client id ${clientOrderId} failed (${messageOf(error)})`);
            }
        }
        if (!orderId) {
            if (age >= INDETERMINATE_GRACE_MS) {
                await (0, engine_1.markNeedsReview)(id, `the order request was indeterminate and the exchange lists no order under client id ${(_e = workingProof.clientOrderId) !== null && _e !== void 0 ? _e : "?"} on ${symbol} after 30 min; check the exchange before resolving`);
            }
            return;
        }
    }
    let order;
    try {
        order = await exchange.fetchOrder(orderId, symbol);
    }
    catch (error) {
        console_1.logger.warn(LOG, `Conversion ${id}: fetchOrder ${orderId} failed (${messageOf(error)}); verification deferred`);
        return;
    }
    const outcome = readOrderOutcome(order, side, base, quote);
    const outcomeProof = {
        exchangeOrderId: orderId,
        symbol,
        side,
        requested,
        filled: outcome.filled,
        cost: outcome.cost,
        average: outcome.average,
        fee: outcome.fee,
        fees: outcome.fees,
        orderStatus: outcome.status,
        exchangeOrder: outcome.raw,
        checkedAt: new Date().toISOString(),
    };
    let precision = null;
    try {
        const row = (await db_1.models.exchangeCurrency.findOne({ where: { currency }, attributes: ["precision"], raw: true }));
        precision = (row === null || row === void 0 ? void 0 : row.precision) != null ? Number(row.precision) : null;
    }
    catch (_f) {
        precision = null;
    }
    const tolerance = (0, reconcile_1.toleranceFor)(precision);
    if (outcome.status === "closed") {
        if (outcome.acquired + tolerance >= requested) {
            const settings = await (0, settings_1.getPoolBackingSettings)({ fresh: true });
            if (settings.paused) {
                console_1.logger.warn(LOG, `Conversion ${id} has filled but poolBackingPause is on; leaving it as is`);
                return;
            }
            const booked = await bookVenueFees(id, currency, outcome.fees, (0, engine_1.feesOf)(s));
            if (!booked)
                return;
            await (0, engine_1.writeSettlement)(id, currency, { proof: { ...workingProof, ...outcomeProof } }, { status });
            await (0, engine_1.completeSettlement)(id, {
                amountReceived: outcome.acquired,
                evidence: { ...outcomeProof, provider },
                actor: "engine",
            });
            return;
        }
        await (0, engine_1.markNeedsReview)(id, `${provider} order ${orderId} on ${symbol} closed with only ${fmt(outcome.acquired)} of ${fmt(requested)} ${currency} acquired; record the remainder with Record external or mark it arrived with what filled`, { proof: { ...outcomeProof } });
        return;
    }
    if (outcome.status === "canceled" || outcome.status === "rejected" || outcome.status === "expired") {
        if (outcome.acquired > EPSILON) {
            await (0, engine_1.markNeedsReview)(id, `${provider} ${outcome.status} order ${orderId} on ${symbol} after ${fmt(outcome.acquired)} of ${fmt(requested)} ${currency} was acquired; mark it arrived with that amount or record the remainder`, { proof: { ...outcomeProof } });
            return;
        }
        await (0, engine_1.writeSettlement)(id, currency, { proof: { ...workingProof, ...outcomeProof, nothingSent: true } }, { status });
        await (0, engine_1.failSettlement)(id, { reason: `${provider} ${outcome.status} order ${orderId} on ${symbol}; nothing filled`, actor: "engine", allowMidDispatch: true });
        return;
    }
    if (age < exports.ORDER_OPEN_LIMIT_MS) {
        if (outcome.filled > 0 && status !== "CONFIRMED") {
            await (0, engine_1.writeSettlement)(id, currency, { status: "CONFIRMED", proof: { ...workingProof, ...outcomeProof, confirmedAt: new Date().toISOString() } }, { status: "DISPATCHED" });
            console_1.logger.info(LOG, `Conversion ${id} CONFIRMED: ${provider} order ${orderId} is ${fmt(outcome.filled)} filled and still open`);
        }
        return;
    }
    let cancelled = false;
    try {
        await exchange.cancelOrder(orderId, symbol);
        cancelled = true;
    }
    catch (error) {
        console_1.logger.warn(LOG, `Conversion ${id}: cancelOrder ${orderId} failed (${messageOf(error)})`);
    }
    let after = outcome;
    try {
        after = readOrderOutcome(await exchange.fetchOrder(orderId, symbol), side, base, quote);
    }
    catch (_g) {
    }
    await (0, engine_1.markNeedsReview)(id, `${provider} order ${orderId} on ${symbol} was still ${outcome.status} after 30 min and was ${cancelled ? "cancelled" : "NOT cancelled (the cancel failed)"} with ${fmt(after.acquired)} of ${fmt(requested)} ${currency} acquired; check the exchange, then mark it arrived with that amount or record the remainder`, { proof: { ...outcomeProof, filled: after.filled, cost: after.cost, average: after.average, fee: after.fee, fees: after.fees, orderStatus: after.status, exchangeOrder: after.raw, cancelledAt: cancelled ? new Date().toISOString() : null } });
}
async function bookVenueFees(id, currency, fees, feesOnRow) {
    var _a;
    var _b, _c, _d, _e;
    const bookings = { ...((_b = feesOnRow.venueFeeBookings) !== null && _b !== void 0 ? _b : {}) };
    let changed = false;
    for (let i = 0; i < fees.length; i++) {
        const fee = fees[i];
        if (!(fee.cost > 0))
            continue;
        if ((_a = bookings[fee.currency]) === null || _a === void 0 ? void 0 : _a.bookedAt)
            continue;
        const referenceId = i === 0 ? `pool_backing_${id}_venue` : `pool_backing_${id}_venue_${fee.currency}`;
        let result = null;
        try {
            const { recordPlatformLoss } = require("@b/utils/fees");
            result = await recordPlatformLoss({
                currency: fee.currency,
                walletType: "SPOT",
                lossAmount: fee.cost,
                type: "POOL_BACKING",
                description: `Pool-backing conversion ${id} (${currency}): the exchange's trading fee`,
                referenceId,
                metadata: { settlementId: id, direction: exports.CONVERT_DIRECTION, currency, feeCurrency: fee.currency, feeCost: fee.cost },
            });
        }
        catch (error) {
            console_1.logger.error(LOG, `Conversion ${id}: could not book the ${fmt(fee.cost)} ${fee.currency} venue fee (${referenceId}): ${messageOf(error)}`);
            result = null;
        }
        if (!result) {
            console_1.logger.error(LOG, `Conversion ${id}: recordPlatformLoss wrote no row for the ${fmt(fee.cost)} ${fee.currency} venue fee (${referenceId}); left in flight for retry`);
            return false;
        }
        bookings[fee.currency] = { cost: fee.cost, referenceId, transactionId: (_c = result.transactionId) !== null && _c !== void 0 ? _c : null, bookedAt: new Date().toISOString() };
        changed = true;
    }
    if (changed) {
        const primary = fees[0];
        await (0, engine_1.writeSettlement)(id, currency, {
            fees: { ...feesOnRow, venueFee: (_d = primary === null || primary === void 0 ? void 0 : primary.cost) !== null && _d !== void 0 ? _d : null, venueFeeCurrency: (_e = primary === null || primary === void 0 ? void 0 : primary.currency) !== null && _e !== void 0 ? _e : null, venueFeeBookings: bookings },
        });
    }
    return true;
}
