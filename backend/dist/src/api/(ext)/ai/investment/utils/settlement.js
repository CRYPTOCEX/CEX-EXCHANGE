"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveSettlementTerms = deriveSettlementTerms;
exports.computePayout = computePayout;
function deriveSettlementTerms(investment) {
    var _a;
    var _b, _c, _d;
    const amount = Number((_b = investment === null || investment === void 0 ? void 0 : investment.amount) !== null && _b !== void 0 ? _b : 0);
    let roi;
    let roiPercentage;
    let orphaned = false;
    if ((investment === null || investment === void 0 ? void 0 : investment.roiPercentage) != null) {
        roiPercentage = Number(investment.roiPercentage);
        roi = (amount * roiPercentage) / 100;
    }
    else if ((investment === null || investment === void 0 ? void 0 : investment.profit) != null) {
        roi = Number(investment.profit);
        roiPercentage = amount > 0 ? (roi / amount) * 100 : 0;
    }
    else if (investment === null || investment === void 0 ? void 0 : investment.plan) {
        roiPercentage = Number((_d = (_c = investment.plan.profitPercentage) !== null && _c !== void 0 ? _c : investment.plan.defaultProfit) !== null && _d !== void 0 ? _d : 0);
        roi = (amount * roiPercentage) / 100;
    }
    else {
        roiPercentage = 0;
        roi = 0;
        orphaned = true;
    }
    if (!Number.isFinite(roi))
        roi = 0;
    if (!Number.isFinite(roiPercentage))
        roiPercentage = 0;
    const result = ((investment === null || investment === void 0 ? void 0 : investment.result) ||
        ((_a = investment === null || investment === void 0 ? void 0 : investment.plan) === null || _a === void 0 ? void 0 : _a.defaultResult) ||
        "DRAW");
    return { roi, roiPercentage, result, orphaned };
}
function computePayout(amount, roi, result) {
    if (result === "WIN")
        return amount + roi;
    if (result === "LOSS")
        return Math.max(0, amount - roi);
    return amount;
}
