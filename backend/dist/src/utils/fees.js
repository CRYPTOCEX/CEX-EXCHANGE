"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperAdmin = getSuperAdmin;
exports.isSuperAdmin = isSuperAdmin;
exports.collectPlatformFee = collectPlatformFee;
exports.ensureAdminProfitRow = ensureAdminProfitRow;
exports.collectPlatformFeeOutcome = collectPlatformFeeOutcome;
exports.recordInvestmentOutcome = recordInvestmentOutcome;
exports.recordPlatformLoss = recordPlatformLoss;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const fee_decisions_1 = require("./fee-decisions");
const wallet_1 = require("@b/services/wallet");
const errors_1 = require("@b/services/wallet/errors");
let cachedSuperAdmin = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;
async function getSuperAdmin(options = {}) {
    const now = Date.now();
    if (!options.fresh && cachedSuperAdmin && now - cacheTimestamp < CACHE_TTL) {
        return cachedSuperAdmin;
    }
    const superAdminRole = await db_1.models.role.findOne({
        where: { name: "Super Admin" },
    });
    if (!superAdminRole) {
        console_1.logger.error("PLATFORM_FEE", "[CRITICAL] No Super Admin role configured — platform fees are being dropped!");
        return null;
    }
    const superAdmin = await db_1.models.user.findOne({
        where: { roleId: superAdminRole.id },
        order: [["createdAt", "ASC"]],
    });
    if (superAdmin) {
        cachedSuperAdmin = { id: superAdmin.id, roleId: superAdminRole.id };
        cacheTimestamp = now;
        return superAdmin;
    }
    console_1.logger.error("PLATFORM_FEE", "[CRITICAL] No Super Admin user configured — platform fees are being dropped!");
    return null;
}
async function isSuperAdmin(userId) {
    if (!userId)
        return false;
    const superAdmin = await getSuperAdmin();
    return (superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.id) === userId;
}
async function collectPlatformFee(params) {
    const outcome = await collectPlatformFeeOutcome(params);
    return outcome.outcome === "landed" ? { transactionId: outcome.transactionId, adminWalletId: outcome.adminWalletId } : null;
}
const adminProfitRepairs = new Map();
async function ensureAdminProfitRow(transactionId, values, context) {
    var _a;
    const write = async () => {
        try {
            const options = context.transaction ? { transaction: context.transaction } : undefined;
            const profit = await db_1.models.adminProfit.findOne({ where: { transactionId }, ...(options !== null && options !== void 0 ? options : {}) });
            if (profit)
                return;
            await db_1.models.adminProfit.create({ transactionId, ...values }, options);
            if (context.repairing) {
                console_1.logger.warn("PLATFORM_FEE", `Repaired the adminProfit row of fee ${context.referenceId} (transaction ${transactionId}) on a re-run: the credit had landed without it`);
            }
        }
        catch (error) {
            console_1.logger.warn("PLATFORM_FEE", `Could not ${context.repairing ? "repair" : "write"} the adminProfit row of fee ${context.referenceId}: ${error === null || error === void 0 ? void 0 : error.message}`);
            if (!context.repairing && context.transaction)
                throw error;
        }
    };
    if (context.transaction)
        return write();
    const previous = (_a = adminProfitRepairs.get(transactionId)) !== null && _a !== void 0 ? _a : Promise.resolve();
    const link = previous.then(write, write);
    adminProfitRepairs.set(transactionId, link);
    try {
        await link;
    }
    finally {
        if (adminProfitRepairs.get(transactionId) === link)
            adminProfitRepairs.delete(transactionId);
    }
}
async function collectPlatformFeeOutcome(params) {
    var _a;
    var _b, _c, _d;
    const { userId, currency, walletType, chain, feeAmount, type, description, referenceId, metadata, transaction: t, } = params;
    try {
        const superAdmin = await getSuperAdmin();
        const decision = (0, fee_decisions_1.decideFeeCollection)({
            feeAmount,
            userId,
            superAdminId: (_b = superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.id) !== null && _b !== void 0 ? _b : null,
        });
        if (!decision.collect) {
            if (decision.reason === "user-is-the-house") {
                console_1.logger.debug("PLATFORM_FEE", `Skipped ${feeAmount} ${currency} ${type} fee — user is Super Admin`);
            }
            else if (decision.reason === "no-super-admin") {
                console_1.logger.error("PLATFORM_FEE", `[CRITICAL] Dropped platform fee — no Super Admin configured. ` +
                    `type=${type} amount=${feeAmount} currency=${currency} ` +
                    `walletType=${walletType}${chain ? " chain=" + chain : ""} ` +
                    `referenceId=${referenceId} description="${description}"`);
            }
            return { outcome: "declined", reason: String((_c = decision.reason) !== null && _c !== void 0 ? _c : "declined") };
        }
        if (!superAdmin)
            return { outcome: "declined", reason: "no-super-admin" };
        const adminWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletType, currency, t);
        const adminWalletId = adminWalletResult.id;
        const idempotencyKey = (0, fee_decisions_1.platformFeeIdempotencyKey)(type, referenceId);
        let transactionId;
        if (walletType === "ECO" && chain) {
            const ecoResult = await wallet_1.walletService.ecoCredit({
                idempotencyKey,
                userId: superAdmin.id,
                walletId: adminWalletId,
                currency,
                chain: chain,
                amount: feeAmount,
                operationType: "ECO_FEE",
                referenceId: `${referenceId}_fee`,
                description,
                metadata: {
                    type: "PLATFORM_FEE",
                    sourceType: type,
                    referenceId,
                    ...metadata,
                },
                transaction: t,
            });
            transactionId = ecoResult.transactionId;
        }
        else {
            const creditResult = await wallet_1.walletService.credit({
                idempotencyKey,
                userId: superAdmin.id,
                walletId: adminWalletId,
                walletType: walletType,
                currency,
                amount: feeAmount,
                operationType: "PLATFORM_FEE",
                referenceId: `${referenceId}_fee`,
                description,
                metadata: {
                    type: "PLATFORM_FEE",
                    sourceType: type,
                    referenceId,
                    ...metadata,
                },
                transaction: t,
            });
            transactionId = creditResult.transactionId;
        }
        await ensureAdminProfitRow(transactionId, { type, amount: feeAmount, currency, chain: chain || null, description }, { referenceId, repairing: false, transaction: t });
        console_1.logger.debug("PLATFORM_FEE", `Collected ${feeAmount} ${currency} (${walletType}${chain ? "/" + chain : ""}) for ${type}: ${description}`);
        return { outcome: "landed", transactionId, adminWalletId };
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.code) === "DUPLICATE_OPERATION") {
            const existingTransactionId = typeof ((_a = error === null || error === void 0 ? void 0 : error.details) === null || _a === void 0 ? void 0 : _a.existingTransactionId) === "string" ? error.details.existingTransactionId : null;
            if (existingTransactionId && !t) {
                await ensureAdminProfitRow(existingTransactionId, { type, amount: feeAmount, currency, chain: chain || null, description }, { referenceId, repairing: true });
            }
            return { outcome: "duplicate", transactionId: existingTransactionId };
        }
        console_1.logger.warn("PLATFORM_FEE", `Failed to collect fee: ${type} ${feeAmount} ${currency} ref=${referenceId} - ${error.message}`);
        return { outcome: "failed", message: String((_d = error === null || error === void 0 ? void 0 : error.message) !== null && _d !== void 0 ? _d : error) };
    }
}
async function recordInvestmentOutcome(params) {
    const booking = (0, fee_decisions_1.decideInvestmentOutcome)({
        result: params.result,
        roi: params.roi,
        referenceId: params.referenceId,
    });
    if (booking.action === "none")
        return;
    const shared = {
        currency: params.currency,
        walletType: params.walletType,
        ...(params.chain ? { chain: params.chain } : {}),
        type: params.type,
        description: params.description,
        metadata: params.metadata,
        transaction: params.transaction,
    };
    if (booking.action === "loss") {
        await recordPlatformLoss({
            ...shared,
            lossAmount: booking.amount,
            referenceId: booking.referenceId,
        });
        return;
    }
    await collectPlatformFee({
        ...shared,
        ...(params.userId ? { userId: params.userId } : {}),
        feeAmount: booking.amount,
        referenceId: booking.referenceId,
    });
}
async function recordPlatformLoss(params) {
    var _a, _b;
    const { currency, walletType, chain, lossAmount, type, description, referenceId, metadata, transaction: t, debitTreasury = true, } = params;
    try {
        if (!lossAmount || lossAmount <= 0)
            return null;
        if (debitTreasury === false) {
            await db_1.models.adminProfit.create({
                transactionId: null,
                type,
                amount: -lossAmount,
                currency,
                chain: chain || null,
                description,
            }, t ? { transaction: t } : undefined);
            return { transactionId: null };
        }
        const superAdmin = await getSuperAdmin();
        if (!superAdmin) {
            console_1.logger.error("PLATFORM_FEE", `[CRITICAL] Unrecorded platform loss — no Super Admin configured. ` +
                `type=${type} amount=${lossAmount} currency=${currency} ` +
                `walletType=${walletType} referenceId=${referenceId}`);
            return null;
        }
        const adminWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletType, currency, t);
        const adminWalletId = adminWalletResult.id;
        const available = Number((_a = adminWalletResult.balance) !== null && _a !== void 0 ? _a : 0);
        const debitable = (0, fee_decisions_1.debitableLoss)(lossAmount, available);
        let transactionId = null;
        let debitRefusal = null;
        if (debitable > 0) {
            try {
                const debitResult = await wallet_1.walletService.debit({
                    idempotencyKey: (0, fee_decisions_1.platformLossIdempotencyKey)(type, referenceId),
                    userId: superAdmin.id,
                    walletId: adminWalletId,
                    walletType: walletType,
                    currency,
                    amount: debitable,
                    operationType: "PLATFORM_LOSS",
                    referenceId: `${referenceId}_loss`,
                    description,
                    metadata: {
                        type: "PLATFORM_LOSS",
                        sourceType: type,
                        referenceId,
                        ...metadata,
                    },
                    transaction: t,
                });
                transactionId = (_b = debitResult === null || debitResult === void 0 ? void 0 : debitResult.transactionId) !== null && _b !== void 0 ? _b : null;
            }
            catch (error) {
                if (error instanceof errors_1.DuplicateOperationError ||
                    (error === null || error === void 0 ? void 0 : error.code) === "DUPLICATE_OPERATION") {
                    console_1.logger.debug("PLATFORM_FEE", `Skipped replayed ${type} loss of ${lossAmount} ${currency} — already ` +
                        `debited and booked. referenceId=${referenceId}`);
                    return null;
                }
                debitRefusal = (error === null || error === void 0 ? void 0 : error.message) || String(error);
                console_1.logger.warn("PLATFORM_FEE", `Treasury debit REFUSED on ${type} payout of ${lossAmount} ${currency}: ` +
                    `${debitRefusal}. Booking the loss unfunded. referenceId=${referenceId}`);
            }
        }
        if (debitable < lossAmount) {
            console_1.logger.warn("PLATFORM_FEE", `Treasury short on ${type} payout: owed ${lossAmount} ${currency}, debited ${debitable}. ` +
                `The full amount is still recorded against admin profit. referenceId=${referenceId}`);
        }
        if (!transactionId && !debitRefusal) {
            console_1.logger.warn("PLATFORM_FEE", `Recorded ${type} loss of ${lossAmount} ${currency} with NO treasury debit ` +
                `(treasury empty). referenceId=${referenceId}`);
        }
        await db_1.models.adminProfit.create({
            transactionId,
            type,
            amount: -lossAmount,
            currency,
            chain: chain || null,
            description,
        }, t ? { transaction: t } : undefined);
        return { transactionId };
    }
    catch (error) {
        console_1.logger.warn("PLATFORM_FEE", `Failed to record platform loss: ${type} ${lossAmount} ${currency} ref=${referenceId} - ${error.message}`);
        return null;
    }
}
