"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.presentInvestment = presentInvestment;
exports.presentInvestments = presentInvestments;
const PLAN_OPERATOR_ONLY = ["defaultProfit", "defaultResult"];
const CONCEALED_WHILE_ACTIVE = ["result", "roiPercentage", "profit"];
function presentInvestment(investment) {
    if (!investment)
        return investment;
    const row = typeof investment.toJSON === "function"
        ? investment.toJSON()
        : { ...investment };
    if (row.plan && typeof row.plan === "object") {
        for (const key of PLAN_OPERATOR_ONLY)
            delete row.plan[key];
    }
    if (row.status === "ACTIVE") {
        for (const key of CONCEALED_WHILE_ACTIVE)
            row[key] = null;
    }
    return row;
}
function presentInvestments(investments) {
    return investments.map((investment) => presentInvestment(investment));
}
