"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveBinaryLossSplit = resolveBinaryLossSplit;
exports.resolveBinaryCancelSplit = resolveBinaryCancelSplit;
function resolveBinaryLossSplit(stake, profit) {
    const stakeAmount = Number(stake);
    const signedProfit = Number(profit);
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
        return { payout: 0, consumed: 0 };
    }
    const raw = Number.isFinite(signedProfit) && signedProfit !== 0
        ? stakeAmount + signedProfit
        : 0;
    const payout = Math.min(Math.max(raw, 0), stakeAmount);
    return { payout, consumed: stakeAmount - payout };
}
function resolveBinaryCancelSplit(stake, penaltyPercentage) {
    const stakeAmount = Number(stake);
    if (!Number.isFinite(stakeAmount) || stakeAmount <= 0) {
        return { partialReturn: 0, penalty: 0 };
    }
    if (penaltyPercentage === undefined || !Number.isFinite(penaltyPercentage)) {
        return { partialReturn: stakeAmount, penalty: 0 };
    }
    const cutAmount = stakeAmount * (Math.abs(penaltyPercentage) / 100);
    const partialReturn = Math.min(Math.max(stakeAmount - cutAmount, 0), stakeAmount);
    return { partialReturn, penalty: stakeAmount - partialReturn };
}
