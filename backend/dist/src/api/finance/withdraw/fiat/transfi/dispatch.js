"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.claimForDispatch = claimForDispatch;
exports.refundWithdrawal = refundWithdrawal;
exports.dispatchTransfiPayout = dispatchTransfiPayout;
exports.findInFlightPayouts = findInFlightPayouts;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const utils_1 = require("@b/api/finance/deposit/fiat/transfi/utils");
const utils_2 = require("./utils");
async function claimForDispatch(transactionId) {
    const [affected] = await db_1.models.transaction.update({ status: "PROCESSING" }, { where: { id: transactionId, status: "PENDING" } });
    return affected > 0;
}
async function releaseClaim(transactionId) {
    await db_1.models.transaction.update({ status: "PENDING" }, { where: { id: transactionId, status: "PROCESSING", referenceId: null } });
}
function parseMeta(row) {
    try {
        return JSON.parse(row.metadata || "{}");
    }
    catch (_a) {
        return {};
    }
}
async function refundWithdrawal(transactionId, reason) {
    return db_1.sequelize.transaction(async (t) => {
        var _a;
        const row = await db_1.models.transaction.findOne({
            where: { id: transactionId },
            transaction: t,
            lock: t.LOCK.UPDATE,
        });
        if (!row)
            return false;
        if (!["PENDING", "PROCESSING"].includes(row.status)) {
            console_1.logger.warn("TRANSFI", `refund skipped for ${transactionId}: status is ${row.status}, not in flight`);
            return false;
        }
        if (row.referenceId) {
            console_1.logger.error("TRANSFI", `refund REFUSED for ${transactionId}: it carries provider reference ${row.referenceId}`);
            return false;
        }
        const meta = parseMeta(row);
        const gross = Number((_a = meta.totalAmount) !== null && _a !== void 0 ? _a : row.amount) || 0;
        const refund = Math.min(Number(row.amount) || 0, gross) || gross;
        const debitedWallet = await db_1.models.wallet.findByPk(row.walletId, {
            transaction: t,
        });
        const refundCurrency = meta.currency || (debitedWallet === null || debitedWallet === void 0 ? void 0 : debitedWallet.currency);
        if (!refundCurrency) {
            console_1.logger.error("TRANSFI", `refund BLOCKED for ${transactionId}: no currency on the transaction metadata or on wallet ${row.walletId}`);
            return false;
        }
        try {
            await wallet_1.walletService.credit({
                idempotencyKey: `transfi_payout_refund_${transactionId}`,
                userId: row.userId,
                walletId: row.walletId,
                walletType: "FIAT",
                currency: refundCurrency,
                amount: refund,
                operationType: "REFUND",
                referenceId: `TFPR-${transactionId}`,
                description: `Refund of failed TransFi withdrawal: ${reason}`,
                metadata: { reason, transactionId, source: "transfi_dispatch" },
                transaction: t,
            });
        }
        catch (error) {
            if (!(error instanceof wallet_1.DuplicateOperationError))
                throw error;
            console_1.logger.info("TRANSFI", `refund for ${transactionId} already applied`);
        }
        await db_1.models.transaction.update({
            status: "FAILED",
            metadata: JSON.stringify({
                ...meta,
                dispatchFailure: reason,
                refundedAt: new Date().toISOString(),
            }),
        }, { where: { id: transactionId }, transaction: t });
        return true;
    });
}
async function dispatchTransfiPayout(params) {
    const { transactionId } = params;
    if (!(await claimForDispatch(transactionId))) {
        return { kind: "already_claimed" };
    }
    const row = await db_1.models.transaction.findByPk(transactionId);
    if (!row)
        return { kind: "uncertain", reason: "transaction disappeared after claim" };
    const meta = parseMeta(row);
    let recipientId;
    try {
        const resolved = await (0, utils_2.resolveOrCreateRecipient)(row.userId, params.beneficiary, params.currency);
        recipientId = resolved.recipientId;
    }
    catch (error) {
        const permanent = error instanceof utils_1.TransfiError && error.statusCode < 500;
        if (permanent) {
            const refunded = await refundWithdrawal(transactionId, `Beneficiary rejected by provider: ${error.message}`);
            return {
                kind: "refused",
                reason: error.message,
                code: error instanceof utils_1.TransfiError ? error.code : undefined,
                refunded,
            };
        }
        await releaseClaim(transactionId);
        return { kind: "uncertain", reason: `beneficiary registration failed: ${error === null || error === void 0 ? void 0 : error.message}` };
    }
    try {
        const order = await (0, utils_2.createPayoutOrder)({
            recipientId,
            partnerId: transactionId,
            sourceCurrency: (params.sourceCurrency || params.currency).toUpperCase(),
            amount: params.amount,
            destinationCurrency: params.currency.toUpperCase(),
            paymentCode: params.paymentCode,
            paymentType: params.paymentType,
            additionalPaymentDetails: params.additionalPaymentDetails,
        });
        await db_1.models.transaction.update({
            referenceId: order.orderId,
            metadata: JSON.stringify({
                ...meta,
                gateway: "transfi",
                transfiOrderId: order.orderId,
                transfiRecipientId: recipientId,
                feeData: order.feeData,
                dispatchedAt: new Date().toISOString(),
            }),
        }, { where: { id: transactionId } });
        console_1.logger.info("TRANSFI", `payout dispatched: ${transactionId} -> ${order.orderId}`);
        return { kind: "dispatched", orderId: order.orderId, feeData: order.feeData };
    }
    catch (error) {
        const alreadyUsed = error instanceof utils_1.TransfiError &&
            (error.code === "PARTNER_ID_ALREADY_USED" ||
                error.details.some((d) => (d === null || d === void 0 ? void 0 : d.code) === "PARTNER_ID_ALREADY_USED"));
        if (alreadyUsed) {
            console_1.logger.warn("TRANSFI", `payout ${transactionId} was already created upstream; leaving PROCESSING for the reconciler`);
            return {
                kind: "uncertain",
                reason: "partnerId already used — a payout for this withdrawal already exists",
            };
        }
        const permanent = error instanceof utils_1.TransfiError && error.statusCode >= 400 && error.statusCode < 500;
        if (permanent) {
            const why = (0, utils_2.isInsufficientBalance)(error)
                ? "Provider has insufficient payout balance"
                : error.message;
            const refunded = await refundWithdrawal(transactionId, why);
            if ((0, utils_2.isInsufficientBalance)(error)) {
                console_1.logger.error("TRANSFI", `PAYOUT BLOCKED: TransFi reports insufficient balance. Prefund the payout account.`);
            }
            return {
                kind: "refused",
                reason: why,
                code: error instanceof utils_1.TransfiError ? error.code : undefined,
                refunded,
            };
        }
        console_1.logger.error("TRANSFI", `payout ${transactionId} outcome UNKNOWN (${error === null || error === void 0 ? void 0 : error.message}); left PROCESSING for reconciliation`);
        return { kind: "uncertain", reason: (error === null || error === void 0 ? void 0 : error.message) || "provider unreachable" };
    }
}
async function findInFlightPayouts(limit = 100) {
    return db_1.models.transaction.findAll({
        where: {
            type: "WITHDRAW",
            status: "PROCESSING",
            referenceId: { [sequelize_1.Op.like]: "OR-%" },
        },
        order: [["createdAt", "ASC"]],
        limit,
    });
}
