"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.platformLossIdempotencyKey = exports.platformFeeIdempotencyKey = void 0;
exports.decideFeeCollection = decideFeeCollection;
exports.debitableLoss = debitableLoss;
exports.decideInvestmentOutcome = decideInvestmentOutcome;
function decideFeeCollection(input) {
    const amount = Number(input.feeAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
        return { collect: false, reason: "no-fee" };
    }
    if (input.userId && input.superAdminId && input.userId === input.superAdminId) {
        return { collect: false, reason: "user-is-the-house" };
    }
    if (!input.superAdminId) {
        return { collect: false, reason: "no-super-admin" };
    }
    return { collect: true, reason: "collect" };
}
function debitableLoss(lossAmount, availableBalance) {
    const loss = Number(lossAmount);
    if (!Number.isFinite(loss) || loss <= 0)
        return 0;
    const available = Number(availableBalance);
    return Math.min(loss, Math.max(0, Number.isFinite(available) ? available : 0));
}
function decideInvestmentOutcome(input) {
    const magnitude = Math.abs(Number(input.roi));
    if (!Number.isFinite(magnitude) || magnitude <= 0)
        return { action: "none" };
    if (input.result === "DRAW")
        return { action: "none" };
    if (input.result === "WIN") {
        return { action: "loss", amount: magnitude, referenceId: `${input.referenceId}_payout` };
    }
    return { action: "fee", amount: magnitude, referenceId: `${input.referenceId}_house` };
}
const platformFeeIdempotencyKey = (type, referenceId) => `platform_fee_${type}_${referenceId}`;
exports.platformFeeIdempotencyKey = platformFeeIdempotencyKey;
const platformLossIdempotencyKey = (type, referenceId) => `platform_loss_${type}_${referenceId}`;
exports.platformLossIdempotencyKey = platformLossIdempotencyKey;
