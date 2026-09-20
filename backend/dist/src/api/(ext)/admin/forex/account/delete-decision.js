"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.blockersForForexAccountDelete = blockersForForexAccountDelete;
exports.describeAccountDeleteBlockers = describeAccountDeleteBlockers;
const DUST = 1e-9;
function num(value) {
    const n = Number(value !== null && value !== void 0 ? value : 0);
    return Number.isFinite(n) ? n : 0;
}
function attributeWithdrawal(withdrawal, accounts) {
    if (withdrawal.forexAccountId) {
        return accounts.filter((a) => a.id === withdrawal.forexAccountId);
    }
    return accounts.filter((a) => a.type === "LIVE" && !!a.userId && a.userId === withdrawal.userId);
}
function blockersForForexAccountDelete(accounts, pendingWithdrawals = [], activeInvestments = []) {
    const blockers = [];
    for (const account of accounts) {
        const reasons = [];
        const balance = num(account.balance);
        if (balance > DUST) {
            const unit = account.currency ? ` ${account.currency}` : "";
            reasons.push(`it still holds ${balance}${unit}`);
        }
        const withdrawals = pendingWithdrawals.filter((w) => attributeWithdrawal(w, [account]).length > 0);
        if (withdrawals.length) {
            const total = withdrawals.reduce((sum, w) => sum + num(w.amount), 0);
            reasons.push(`${withdrawals.length} pending withdrawal${withdrawals.length === 1 ? "" : "s"} ` +
                `worth ${total} ${withdrawals.length === 1 ? "was" : "were"} already debited from it ` +
                `and can only be settled against it`);
        }
        if (account.type === "LIVE" && account.userId) {
            const investments = activeInvestments.filter((i) => i.userId === account.userId);
            if (investments.length) {
                const total = investments.reduce((sum, i) => sum + num(i.amount), 0);
                reasons.push(`${investments.length} active investment${investments.length === 1 ? "" : "s"} ` +
                    `holding ${total} of principal ${investments.length === 1 ? "returns" : "return"} to it at maturity`);
            }
        }
        if (reasons.length)
            blockers.push({ accountId: account.id, reasons });
    }
    return blockers;
}
function describeAccountDeleteBlockers(blockers) {
    if (!blockers.length)
        return "";
    const detail = blockers
        .map((b) => `${b.accountId}: ${b.reasons.join("; ")}`)
        .join(" | ");
    return (`Cannot delete ${blockers.length} forex account${blockers.length === 1 ? "" : "s"} — ${detail}. ` +
        `Deleting one makes the balance unreachable and leaves those withdrawals and investments ` +
        `with nowhere to settle. Reject the pending withdrawals, cancel or settle the investments ` +
        `(both return the money), withdraw the remaining balance, then delete.`);
}
