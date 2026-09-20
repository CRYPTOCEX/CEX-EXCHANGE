"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deriveGeneralSettlementTerms = deriveGeneralSettlementTerms;
exports.computeGeneralPayout = computeGeneralPayout;
exports.isPrincipalOutstanding = isPrincipalOutstanding;
exports.planAdminInvestmentStatusChange = planAdminInvestmentStatusChange;
exports.assertInvestmentEditable = assertInvestmentEditable;
function toNumber(value) {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
}
function deriveGeneralSettlementTerms(investment) {
    var _a;
    var _b, _c;
    const amount = toNumber(investment === null || investment === void 0 ? void 0 : investment.amount);
    let roi;
    let roiPercentage;
    let orphaned = false;
    if ((investment === null || investment === void 0 ? void 0 : investment.roiPercentage) != null) {
        roiPercentage = toNumber(investment.roiPercentage);
        roi = (amount * roiPercentage) / 100;
    }
    else if ((investment === null || investment === void 0 ? void 0 : investment.profit) != null) {
        roi = toNumber(investment.profit);
        roiPercentage = amount > 0 ? (roi / amount) * 100 : 0;
    }
    else if (investment === null || investment === void 0 ? void 0 : investment.plan) {
        roiPercentage = toNumber((_c = (_b = investment.plan.profitPercentage) !== null && _b !== void 0 ? _b : investment.plan.defaultProfit) !== null && _c !== void 0 ? _c : 0);
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
function computeGeneralPayout(amount, roi, result) {
    const principal = toNumber(amount);
    const profit = toNumber(roi);
    if (result === "WIN")
        return principal + profit;
    if (result === "LOSS")
        return Math.max(0, principal - profit);
    return principal;
}
function isPrincipalOutstanding(investment) {
    if (!investment)
        return false;
    if (investment.deletedAt)
        return false;
    return investment.status === "ACTIVE";
}
function planAdminInvestmentStatusChange(investment, next) {
    if (!investment) {
        return { ok: false, reason: "Investment not found" };
    }
    if (next !== "COMPLETED" && next !== "CANCELLED" && next !== "REJECTED") {
        return {
            ok: false,
            reason: `Cannot set an investment to ${next} from this door. ` +
                `Re-activating a settled investment makes the settlement cron pay it again.`,
        };
    }
    if (investment.status === next) {
        return { ok: false, reason: `Investment is already ${next}` };
    }
    if (investment.deletedAt) {
        return {
            ok: false,
            reason: "This investment was already cancelled by the user and its principal returned. " +
                "Restore it first if the cancellation was a mistake.",
        };
    }
    if (investment.status !== "ACTIVE") {
        return {
            ok: false,
            reason: `Cannot change the status of a ${String(investment.status).toLowerCase()} investment: ` +
                `its funds have already been settled.`,
        };
    }
    const amount = toNumber(investment.amount);
    if (next === "COMPLETED") {
        const { roi, roiPercentage, result } = deriveGeneralSettlementTerms(investment);
        return {
            ok: true,
            action: "PAYOUT",
            status: next,
            credit: computeGeneralPayout(amount, roi, result),
            roi,
            roiPercentage,
            result,
        };
    }
    return {
        ok: true,
        action: "REFUND",
        status: next,
        credit: amount,
        roi: 0,
        roiPercentage: 0,
        result: "DRAW",
    };
}
const IMMUTABLE_INVESTMENT_FIELDS = [
    "amount",
    "userId",
    "planId",
    "durationId",
];
function assertInvestmentEditable(current, patch) {
    var _a;
    if (!current)
        return { ok: false, reason: "Investment not found" };
    const changed = [];
    for (const field of IMMUTABLE_INVESTMENT_FIELDS) {
        const submitted = patch === null || patch === void 0 ? void 0 : patch[field];
        if (submitted === undefined || submitted === null || submitted === "") {
            continue;
        }
        const stored = current[field];
        const differs = field === "amount"
            ? toNumber(submitted) !== toNumber(stored)
            : String(submitted) !== String(stored !== null && stored !== void 0 ? stored : "");
        if (differs)
            changed.push(field);
    }
    if (changed.length) {
        return {
            ok: false,
            reason: `Cannot change ${changed.join(", ")} on an investment that has already been funded. ` +
                `The settlement pays out from these columns, so rewriting them credits an amount, ` +
                `a currency or a user that never funded it. Cancel the investment to return the ` +
                `principal and create a new one instead.`,
        };
    }
    const nextStatus = patch === null || patch === void 0 ? void 0 : patch.status;
    if (nextStatus !== undefined &&
        nextStatus !== null &&
        nextStatus !== "" &&
        String(nextStatus) !== String((_a = current.status) !== null && _a !== void 0 ? _a : "")) {
        return {
            ok: false,
            reason: `Cannot change status through the edit door. A status change settles money — ` +
                `use the status action so the payout or refund is actually paid.`,
        };
    }
    return { ok: true };
}
