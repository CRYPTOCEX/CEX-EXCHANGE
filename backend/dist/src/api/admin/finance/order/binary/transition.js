"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.classifyBinaryOrderStatusChange = classifyBinaryOrderStatusChange;
exports.isBinaryOrderDeletable = isBinaryOrderDeletable;
const SETTLED_STATUSES = ["WIN", "LOSS", "DRAW", "CANCELED"];
function classifyBinaryOrderStatusChange(current, next) {
    const from = String(current !== null && current !== void 0 ? current : "");
    const to = String(next !== null && next !== void 0 ? next : "");
    if (!to)
        return { ok: false, reason: "Missing status" };
    if (from === to)
        return { ok: true };
    if (from === "ERROR" && to === "PENDING")
        return { ok: true };
    if (SETTLED_STATUSES.includes(from)) {
        return {
            ok: false,
            reason: `This order is already settled (${from}) and its wallet movements have been made. ` +
                `Re-opening it hands it back to the settlement cron, which pays the stake a second ` +
                `time under a different idempotency key. Adjust the wallet directly if a correction ` +
                `is genuinely owed.`,
        };
    }
    return {
        ok: false,
        reason: `Writing ${to} over a ${from || "(missing)"} order settles nothing: no hold is ` +
            `released, no wallet is credited, and both the expiry timer and the settlement cron ` +
            `skip the order afterwards because they only claim PENDING rows. The customer's ` +
            `stake would sit in wallet.inOrder permanently. Let it expire, or cancel it from ` +
            `the order door.`,
    };
}
function isBinaryOrderDeletable(status) {
    if (String(status !== null && status !== void 0 ? status : "") === "PENDING") {
        return {
            ok: false,
            reason: "This order is still open and the customer's stake is held in wallet.inOrder. " +
                "Deleting it only sets deletedAt, and every settler claims rows by status PENDING, " +
                "so nothing would ever release that hold — the stake becomes permanently unspendable. " +
                "Wait for it to expire, or cancel it so the stake is returned first.",
        };
    }
    return { ok: true };
}
