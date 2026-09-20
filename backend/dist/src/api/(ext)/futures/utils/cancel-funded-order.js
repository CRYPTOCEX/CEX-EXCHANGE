"use strict";
const { refundForOrder } = require("./refund-math");
// Dependencies make the cross-database failure boundaries testable without
// opening the production databases. The order row remains as the retry record.
exports.cancelFundedOrder = async function (deps, userId, id, createdAt) {
    return deps.lock(async () => {
        const order = await deps.read(userId, id, createdAt);
        if (!order || String(order.userId) !== String(userId)) throw deps.error(404, "Order not found");
        if (!["OPEN", "CANCELED"].includes(order.status)) throw deps.error(409, "Order is no longer cancellable");
        const refund = refundForOrder(order);
        const hold = await deps.hold(id, userId);
        const metadata = typeof hold?.metadata === "string" ? JSON.parse(hold.metadata) : hold?.metadata;
        if (!hold || metadata?.futuresOrder?.id !== String(id) || metadata.futuresOrder.symbol !== order.symbol || metadata.futuresOrder.cost !== String(order.cost) || metadata.futuresOrder.fee !== String(order.fee) || metadata.futuresOrder.amount !== String(order.amount)) {
            throw deps.error(503, "Order funding evidence is missing or inconsistent; automatic refund requires reconciliation");
        }
        if (order.status === "OPEN") await deps.markCancelled(order);
        try { deps.evict(id, order.symbol); } catch (_) { /* next guarded engine refresh reloads terminal rows */ }
        if (deps.refresh) await deps.refresh(order);
        if (deps.beforeRelease) await deps.beforeRelease();
        if (refund.raw > 0n) {
            try {
                await deps.release({ userId, walletId: hold.walletId, walletType: "FUTURES", currency: refund.currency, amount: refund.amount,
                    idempotencyKey: `futures_cancel_${id}`, reason: "Futures unfilled collateral refund",
                    metadata: { orderId: String(id), symbol: order.symbol, remaining: String(order.remaining), amount: String(order.amount) } });
            } catch (error) {
                if (error?.name !== "DuplicateOperationError") throw error;
            }
        }
        return { id: String(id), status: "CANCELED", refundAmount: refund.amount, currency: refund.currency };
    });
};
