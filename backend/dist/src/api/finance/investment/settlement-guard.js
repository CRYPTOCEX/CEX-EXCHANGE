"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.investmentClaimRefusal = investmentClaimRefusal;
function investmentClaimRefusal(row) {
    if (!row)
        return "GONE";
    if (row.deletedAt != null)
        return "DELETED";
    if (row.status !== "ACTIVE")
        return "NOT_ACTIVE";
    return null;
}
