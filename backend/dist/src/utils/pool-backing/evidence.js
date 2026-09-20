"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseOffChainTxid = parseOffChainTxid;
exports.matchDeposit = matchDeposit;
exports.gatherSpotDepositEvidence = gatherSpotDepositEvidence;
const console_1 = require("@b/utils/console");
function parseOffChainTxid(txid) {
    const patterns = [/off-?chain transfer\s+(\w+)/i, /офчейн\s+перевод\s+(\w+)/i, /transferência\s+off-chain\s+(\w+)/i, /transferencia\s+off-chain\s+(\w+)/i];
    for (const p of patterns) {
        const m = txid.match(p);
        if (m && m[1])
            return m[1];
    }
    return txid;
}
function matchDeposit(deposits, referenceId) {
    const wanted = String(referenceId).trim();
    if (!wanted)
        return { found: null, ok: false };
    const found = deposits.find((d) => {
        const txid = (d === null || d === void 0 ? void 0 : d.txid) ? String(d.txid) : "";
        return txid === wanted || parseOffChainTxid(txid) === wanted || ((d === null || d === void 0 ? void 0 : d.id) != null && String(d.id) === wanted);
    });
    return { found: found !== null && found !== void 0 ? found : null, ok: !!found && found.status === "ok" };
}
async function gatherSpotDepositEvidence(params) {
    var _a;
    const checkedAt = new Date().toISOString();
    const referenceId = params.referenceId ? String(params.referenceId).trim() : "";
    if (!referenceId)
        return { backed: false, reason: "no reference id on the deposit row", checkedAt };
    try {
        const ExchangeManager = require("@b/utils/exchange").default;
        const exchange = await ExchangeManager.startExchange();
        if (!exchange)
            return { backed: false, reason: "exchange not available", checkedAt };
        if (!exchange.has || !exchange.has["fetchDeposits"])
            return { backed: false, reason: "exchange cannot list deposits", checkedAt };
        const deposits = await exchange.fetchDeposits(params.currency);
        const { found, ok } = matchDeposit(deposits || [], referenceId);
        if (!found)
            return { backed: false, reason: "the exchange lists no deposit with this reference", checkedAt };
        return {
            backed: ok,
            reason: ok ? "the exchange lists this deposit as accepted" : `the exchange lists this deposit as ${found.status}`,
            exchangeDepositId: found.id != null ? String(found.id) : null,
            exchangeStatus: (_a = found.status) !== null && _a !== void 0 ? _a : null,
            exchangeAmount: Number(found.amount) || null,
            checkedAt,
        };
    }
    catch (error) {
        console_1.logger.warn("POOL_BACKING", `Deposit evidence lookup failed for ${params.currency}/${referenceId}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        return { backed: false, reason: `evidence lookup failed: ${String((error === null || error === void 0 ? void 0 : error.message) || error)}`, checkedAt };
    }
}
