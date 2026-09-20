"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MONTHLY_LIMIT = exports.DEFAULT_DAILY_LIMIT = void 0;
exports.currentWindows = currentWindows;
exports.checkWithdrawLimits = checkWithdrawLimits;
exports.consumeWithdrawAllowance = consumeWithdrawAllowance;
exports.DEFAULT_DAILY_LIMIT = 5000;
exports.DEFAULT_MONTHLY_LIMIT = 50000;
const DAY_MS = 24 * 60 * 60 * 1000;
function currentWindows(account, now = new Date()) {
    var _a, _b;
    const dailyAnchor = account.lastWithdrawReset
        ? new Date(account.lastWithdrawReset)
        : new Date(0);
    const monthlyAnchor = account.lastMonthlyWithdrawReset
        ? new Date(account.lastMonthlyWithdrawReset)
        : dailyAnchor;
    const daysSinceDaily = (now.getTime() - dailyAnchor.getTime()) / DAY_MS;
    const daysSinceMonthly = (now.getTime() - monthlyAnchor.getTime()) / DAY_MS;
    const dailyReset = daysSinceDaily >= 1;
    const monthlyReset = daysSinceMonthly >= 30;
    return {
        dailyWithdrawn: dailyReset ? 0 : Number((_a = account.dailyWithdrawn) !== null && _a !== void 0 ? _a : 0),
        monthlyWithdrawn: monthlyReset ? 0 : Number((_b = account.monthlyWithdrawn) !== null && _b !== void 0 ? _b : 0),
        dailyLimit: Number(account.dailyWithdrawLimit) || exports.DEFAULT_DAILY_LIMIT,
        monthlyLimit: Number(account.monthlyWithdrawLimit) || exports.DEFAULT_MONTHLY_LIMIT,
        dailyReset,
        monthlyReset,
    };
}
function checkWithdrawLimits(account, gross, now = new Date()) {
    const w = currentWindows(account, now);
    if (w.dailyWithdrawn + gross > w.dailyLimit) {
        const remaining = Math.max(0, w.dailyLimit - w.dailyWithdrawn);
        return {
            allowed: false,
            reason: `Daily withdrawal limit exceeded. You can withdraw up to ${remaining} more today.`,
        };
    }
    if (w.monthlyWithdrawn + gross > w.monthlyLimit) {
        const remaining = Math.max(0, w.monthlyLimit - w.monthlyWithdrawn);
        return {
            allowed: false,
            reason: `Monthly withdrawal limit exceeded. You can withdraw up to ${remaining} more this month.`,
        };
    }
    return { allowed: true };
}
function consumeWithdrawAllowance(account, gross, now = new Date()) {
    const w = currentWindows(account, now);
    const patch = {
        dailyWithdrawn: w.dailyWithdrawn + gross,
        monthlyWithdrawn: w.monthlyWithdrawn + gross,
    };
    if (w.dailyReset)
        patch.lastWithdrawReset = now;
    if (w.monthlyReset)
        patch.lastMonthlyWithdrawReset = now;
    return patch;
}
