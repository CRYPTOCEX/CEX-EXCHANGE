"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normaliseTxid = normaliseTxid;
exports.getExchangeDepositAddress = getExchangeDepositAddress;
exports.ensureWithdrawableBalance = ensureWithdrawableBalance;
exports.ensureTradingBalance = ensureTradingBalance;
exports.issueExchangeWithdrawal = issueExchangeWithdrawal;
exports.findExchangeWithdrawal = findExchangeWithdrawal;
exports.findExchangeDeposit = findExchangeDeposit;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const exchange_status_1 = require("@b/api/finance/withdraw/exchange-status");
const funding = require("@b/utils/exchange-funding");
const tx_hash_1 = require("@b/api/finance/withdraw/tx-hash");
const evidence_1 = require("./evidence");
const EVM_HASH = /^0x[0-9a-fA-F]{64}$/;
const BARE_HEX_HASH = /^[0-9a-fA-F]{64}$/;
function normaliseTxid(txid) {
    if (txid === null || txid === undefined)
        return null;
    let s = String(txid).trim();
    if (!s)
        return null;
    const at = s.indexOf("@");
    if (at > 0)
        s = s.slice(0, at);
    if (EVM_HASH.test(s) || BARE_HEX_HASH.test(s))
        s = s.toLowerCase();
    return s || null;
}
function finiteOrNull(value) {
    if (value === null || value === undefined || value === "")
        return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
}
function ceil8(value) {
    return Math.ceil(value * 1e8 - 1e-9) / 1e8;
}
async function getExchangeDepositAddress(exchange, provider, currency, networkId) {
    var _a, _b, _c, _d;
    const { resolveExchangeDepositAddress } = require("@b/api/finance/currency/deposit-address");
    const raw = await resolveExchangeDepositAddress(exchange, provider, currency, networkId);
    const address = (raw === null || raw === void 0 ? void 0 : raw.address) || (raw === null || raw === void 0 ? void 0 : raw.Address);
    if (!address || typeof address !== "string") {
        throw (0, error_1.createError)({
            statusCode: 502,
            message: `${provider} returned no deposit address for ${currency} on ${networkId}`,
        });
    }
    const tagRaw = (_d = (_c = (_b = (_a = raw === null || raw === void 0 ? void 0 : raw.tag) !== null && _a !== void 0 ? _a : raw === null || raw === void 0 ? void 0 : raw.memo) !== null && _b !== void 0 ? _b : raw === null || raw === void 0 ? void 0 : raw.Memo) !== null && _c !== void 0 ? _c : raw === null || raw === void 0 ? void 0 : raw.paymentId) !== null && _d !== void 0 ? _d : null;
    const tag = tagRaw !== null && tagRaw !== undefined && String(tagRaw).trim() !== "" ? String(tagRaw).trim() : null;
    return { address: address.trim(), tag };
}
async function ensureWithdrawableBalance(exchange, provider, currency, amount) {
    let from;
    let to;
    switch (String(provider !== null && provider !== void 0 ? provider : "").toLowerCase()) {
        case "kucoin":
            from = "trade";
            to = "main";
            break;
        case "okx":
            from = "trading";
            to = "funding";
            break;
        default:
            return { moved: 0 };
    }
    return ensureAccountBalance(exchange, provider, currency, amount, from, to, "a withdrawal");
}
async function ensureTradingBalance(exchange, provider, currency, amount) {
    let from;
    let to;
    switch (String(provider !== null && provider !== void 0 ? provider : "").toLowerCase()) {
        case "kucoin":
            from = "main";
            to = "trade";
            break;
        case "okx":
            from = "funding";
            to = "trading";
            break;
        default:
            return { moved: 0 };
    }
    return ensureAccountBalance(exchange, provider, currency, amount, from, to, "an order");
}
async function ensureAccountBalance(exchange, provider, currency, amount, from, to, purpose) {
    var _a, _b, _c;
    var _d, _e;
    const balance = await exchange.fetchBalance({ type: to });
    const free = Number((_e = (_d = (_a = balance === null || balance === void 0 ? void 0 : balance.free) === null || _a === void 0 ? void 0 : _a[currency]) !== null && _d !== void 0 ? _d : (_b = balance === null || balance === void 0 ? void 0 : balance[currency]) === null || _b === void 0 ? void 0 : _b.free) !== null && _e !== void 0 ? _e : 0) || 0;
    if (free >= amount)
        return { moved: 0, from, to };
    const shortfall = ceil8(amount - free);
    if (!((_c = exchange === null || exchange === void 0 ? void 0 : exchange.has) === null || _c === void 0 ? void 0 : _c.transfer)) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `${provider} ${to} account holds ${free} ${currency} and ${amount} is needed; the exchange offers no account transfer to top it up`,
        });
    }
    try {
        await exchange.transfer(currency, shortfall, from, to);
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: `${provider} could not move ${shortfall} ${currency} from ${from} to ${to}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        });
    }
    console_1.logger.info("POOL_BACKING", `Moved ${shortfall} ${currency} ${from} -> ${to} on ${provider} ahead of ${purpose} of ${amount}`);
    return { moved: shortfall, from, to };
}
async function issueExchangeWithdrawal(exchange, provider, p) {
    var _a;
    const prepared = await funding.prepareWithdrawal(exchange, provider, p.currency, p.networkId, p.address, p.tag, p.amount);
    funding.validateWithdrawalAmount(exchange, prepared.currency, prepared.network, p.amount);
    let response;
    try {
        response = await exchange.withdraw(p.currency, p.amount, p.address, (_a = p.tag) !== null && _a !== void 0 ? _a : undefined, prepared.params);
    }
    catch (error) {
        if ((0, exchange_status_1.isIndeterminateExchangeError)(error)) {
            console_1.logger.warn("POOL_BACKING", `${provider} withdraw of ${p.amount} ${p.currency} on ${p.networkId} is INDETERMINATE (${(error === null || error === void 0 ? void 0 : error.message) || error}); not retrying`);
            return { id: null, txid: null, raw: { error: String((error === null || error === void 0 ? void 0 : error.message) || error) }, indeterminate: true };
        }
        throw (0, error_1.createError)({
            statusCode: 502,
            message: `${provider} refused the withdrawal of ${p.amount} ${p.currency} on ${p.networkId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        });
    }
    const id = (response === null || response === void 0 ? void 0 : response.id) !== null && (response === null || response === void 0 ? void 0 : response.id) !== undefined && String(response.id).trim() !== "" ? String(response.id) : null;
    if (!id) {
        console_1.logger.warn("POOL_BACKING", `${provider} accepted a withdrawal of ${p.amount} ${p.currency} on ${p.networkId} but returned no id; treating as indeterminate`);
        return { id: null, txid: normaliseTxid((0, tx_hash_1.extractExchangeTxHash)(response)), raw: response !== null && response !== void 0 ? response : null, indeterminate: true };
    }
    return { id, txid: normaliseTxid((0, tx_hash_1.extractExchangeTxHash)(response)), raw: response !== null && response !== void 0 ? response : null, indeterminate: false };
}
async function findExchangeWithdrawal(exchange, currency, id, since) {
    var _a, _b;
    if (!((_a = exchange === null || exchange === void 0 ? void 0 : exchange.has) === null || _a === void 0 ? void 0 : _a.fetchWithdrawals)) {
        throw (0, error_1.createError)({ statusCode: 501, message: "the exchange cannot list withdrawals" });
    }
    const list = (await exchange.fetchWithdrawals(currency, since)) || [];
    const wanted = String(id);
    const found = list.find((w) => (w === null || w === void 0 ? void 0 : w.id) !== null && (w === null || w === void 0 ? void 0 : w.id) !== undefined && String(w.id) === wanted);
    if (!found)
        return null;
    return {
        status: (0, exchange_status_1.normalizeExchangeWithdrawStatus)(found.status),
        txid: normaliseTxid((0, tx_hash_1.extractExchangeTxHash)(found)),
        amount: finiteOrNull(found.amount),
        fee: finiteOrNull((_b = found.fee) === null || _b === void 0 ? void 0 : _b.cost),
        raw: found,
    };
}
async function findExchangeDeposit(exchange, currency, p) {
    var _a, _b;
    var _c, _d;
    if (!((_a = exchange === null || exchange === void 0 ? void 0 : exchange.has) === null || _a === void 0 ? void 0 : _a.fetchDeposits)) {
        throw (0, error_1.createError)({ statusCode: 501, message: "the exchange cannot list deposits" });
    }
    const none = { found: false, ok: false, amount: null, fee: null, addressMismatch: false, raw: null };
    const wanted = normaliseTxid(p.txid);
    if (!wanted)
        return none;
    const list = (await exchange.fetchDeposits(currency, p.since)) || [];
    let { found, ok } = (0, evidence_1.matchDeposit)(list, String(p.txid).trim());
    if (!found) {
        const normalised = list.map((d) => { var _a; return ({ ...d, txid: (_a = normaliseTxid(d === null || d === void 0 ? void 0 : d.txid)) !== null && _a !== void 0 ? _a : d === null || d === void 0 ? void 0 : d.txid }); });
        ({ found, ok } = (0, evidence_1.matchDeposit)(normalised, wanted));
    }
    if (!found)
        return none;
    let addressMismatch = false;
    const seenAddress = found.addressTo || found.address;
    if (p.address && seenAddress && String(seenAddress).trim().toLowerCase() !== String(p.address).trim().toLowerCase()) {
        addressMismatch = true;
    }
    const seenTag = (_c = found.tagTo) !== null && _c !== void 0 ? _c : found.tag;
    if (p.tag && seenTag !== null && seenTag !== undefined && String(seenTag).trim() !== "" && String(seenTag).trim() !== String(p.tag).trim()) {
        addressMismatch = true;
    }
    if (addressMismatch) {
        console_1.logger.warn("POOL_BACKING", `Deposit ${wanted} for ${currency} is listed at ${seenAddress !== null && seenAddress !== void 0 ? seenAddress : "?"}${seenTag ? `/${seenTag}` : ""}, not at the settlement's ${(_d = p.address) !== null && _d !== void 0 ? _d : "?"}${p.tag ? `/${p.tag}` : ""}`);
    }
    const amount = finiteOrNull(found.amount);
    if (p.amount !== undefined && amount !== null && amount !== p.amount) {
        console_1.logger.debug("POOL_BACKING", `Deposit ${wanted}: sent ${p.amount} ${currency}, the exchange lists ${amount}`);
    }
    return {
        found: true,
        ok: !!ok,
        amount,
        fee: finiteOrNull((_b = found.fee) === null || _b === void 0 ? void 0 : _b.cost),
        addressMismatch,
        raw: found,
    };
}
