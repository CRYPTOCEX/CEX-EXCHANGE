"use strict";
const { models, sequelize } = require('@b/db');
const { walletService } = require('@b/services/wallet');
const { createError } = require('@b/utils/error');
const { sendOrderStatusUpdateEmail } = require('./utils');
const fail = (statusCode, message) => { throw createError({ statusCode, message }); };
exports.transitionOrders = async (ids, status, ctx) => {
    if (!Array.isArray(ids) || !ids.length || ids.length > 100 || ids.some(id => typeof id !== 'string' || !id) || !['PENDING','COMPLETED','CANCELLED','REJECTED'].includes(status)) fail(400, 'Invalid order status request');
    const result = await sequelize.transaction(async t => {
        const changed = [], orders = [];
        for (const id of [...new Set(ids)].sort()) {
            const order = await models.ecommerceOrder.findByPk(id, { transaction: t, lock: t.LOCK.UPDATE });
            if (!order) fail(404, 'Order not found');
            orders.push(order);
            // A committed retry must neither refund nor restock twice.
            if (order.status === status) continue;
            if (order.status !== 'PENDING') fail(409, 'Only pending orders can change status');
            const purchase = await models.transaction.findOne({ where: {
                idempotencyKey: `ecom_order_${id}`, userId: order.userId,
                type: 'ECOMMERCE_PURCHASE', status: 'COMPLETED'
            }, transaction: t, lock: t.LOCK.UPDATE });
            const free = order.total != null && Number(order.total) === 0;
            if (!purchase && !free) fail(409, 'Original purchase payment could not be verified');
            if (purchase && (!Number.isFinite(Number(purchase.amount)) || Number(purchase.amount) <= 0)) fail(409, 'Invalid original payment');
            if (status === 'CANCELLED' || status === 'REJECTED') {
                if (order.shippingId) {
                    const shipment = await models.ecommerceShipping.findByPk(order.shippingId, { transaction: t, lock: t.LOCK.UPDATE });
                    if (!shipment || !['PENDING', 'CANCELLED'].includes(shipment.loadStatus)) fail(409, 'Dispatched orders require a returns workflow before restocking');
                }
                const items = await models.ecommerceOrderItem.findAll({ where: { orderId: id }, transaction: t, order: [['productId','ASC']] });
                for (const item of items) {
                    if (!Number.isSafeInteger(Number(item.quantity)) || Number(item.quantity) <= 0) fail(409, 'Invalid order item quantity');
                    const product = await models.ecommerceProduct.findByPk(item.productId, { transaction: t, lock: t.LOCK.UPDATE, paranoid: false });
                    if (!product) fail(409, 'Product inventory requires reconciliation');
                    if (product.type === 'PHYSICAL') {
                        const stock = Number(product.inventoryQuantity) + Number(item.quantity);
                        if (!Number.isSafeInteger(stock) || stock < 0 || stock > 2147483647) fail(409, 'Invalid restored inventory');
                        await product.update({ inventoryQuantity: stock }, { transaction: t });
                    }
                }
                if (purchase) {
                    const wallet = await models.wallet.findByPk(purchase.walletId, { transaction: t });
                    if (!wallet || wallet.userId !== order.userId || (order.currency && wallet.currency !== order.currency) || (order.walletType && wallet.type !== order.walletType)) fail(409, 'Purchase wallet does not match order');
                    const revenue = await models.transaction.findOne({ where: { idempotencyKey: `platform_fee_TRADE_${id}`, type: 'PLATFORM_FEE', status: 'COMPLETED' }, transaction: t, lock: t.LOCK.UPDATE });
                    if (revenue) {
                        const amount = Number(revenue.amount);
                        const treasury = await models.wallet.findByPk(revenue.walletId, { transaction: t });
                        if (!Number.isFinite(amount) || amount <= 0 || amount > Number(purchase.amount) || !treasury || treasury.userId !== revenue.userId || treasury.type !== wallet.type || treasury.currency !== wallet.currency) fail(409, 'Order revenue requires reconciliation');
                        // Reverse the actual recipient's posted revenue, not today's configured admin.
                        // Insufficient treasury funds abort the whole refund transaction.
                        const reversal = await walletService.debit({ idempotencyKey: `ecom_revenue_refund_${id}`, userId: revenue.userId, walletId: treasury.id, walletType: treasury.type, currency: treasury.currency, amount: revenue.amount, operationType: 'PLATFORM_LOSS', referenceId: id, description: `Reverse ecommerce revenue for ${id}`, metadata: { orderId: id, revenueTransactionId: revenue.id }, transaction: t });
                        await models.adminProfit.create({ transactionId: reversal.transactionId, type: 'TRADE', amount: -amount, currency: treasury.currency, chain: null, description: `Ecommerce refund ${id}` }, { transaction: t });
                    }
                    await walletService.credit({ idempotencyKey: `ecom_order_refund_${id}`, userId: order.userId, walletId: wallet.id, walletType: wallet.type, currency: wallet.currency, amount: purchase.amount, operationType: 'REFUND', referenceId: id, description: `Refund for ${status.toLowerCase()} order ${id}`, metadata: { orderId: id, transactionId: purchase.id, status }, transaction: t });
                }
            }
            await order.update({ status }, { transaction: t });
            changed.push(order);
        }
        return { orders, changed };
    });
    for (const order of result.changed) {
        try {
            const user = await models.user.findByPk(order.userId);
            if (user) await sendOrderStatusUpdateEmail(user, order, status, ctx);
        } catch (error) { console.error('Order committed; status notification failed:', error.message); }
    }
    return { message: 'Order status updated', updatedCount: result.changed.length, unchangedCount: result.orders.length - result.changed.length };
};
