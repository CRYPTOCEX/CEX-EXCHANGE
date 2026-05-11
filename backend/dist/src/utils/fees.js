"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getSuperAdmin = getSuperAdmin;
exports.isSuperAdmin = isSuperAdmin;
exports.collectPlatformFee = collectPlatformFee;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
let cachedSuperAdmin = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000;
async function getSuperAdmin() {
    const now = Date.now();
    if (cachedSuperAdmin && now - cacheTimestamp < CACHE_TTL) {
        return cachedSuperAdmin;
    }
    const superAdminRole = await db_1.models.role.findOne({
        where: { name: "Super Admin" },
    });
    if (!superAdminRole) {
        return null;
    }
    const superAdmin = await db_1.models.user.findOne({
        where: { roleId: superAdminRole.id },
        order: [["createdAt", "ASC"]],
    });
    if (superAdmin) {
        cachedSuperAdmin = { id: superAdmin.id, roleId: superAdminRole.id };
        cacheTimestamp = now;
    }
    return superAdmin;
}
async function isSuperAdmin(userId) {
    if (!userId)
        return false;
    const superAdmin = await getSuperAdmin();
    return (superAdmin === null || superAdmin === void 0 ? void 0 : superAdmin.id) === userId;
}
async function collectPlatformFee(params) {
    const { userId, currency, walletType, chain, feeAmount, type, description, referenceId, metadata, transaction: t, } = params;
    try {
        if (!feeAmount || feeAmount <= 0) {
            return null;
        }
        const superAdmin = await getSuperAdmin();
        if (userId && superAdmin && userId === superAdmin.id) {
            console_1.logger.debug("PLATFORM_FEE", `Skipped ${feeAmount} ${currency} ${type} fee — user is Super Admin`);
            return null;
        }
        if (!superAdmin) {
            console_1.logger.warn("PLATFORM_FEE", `No Super Admin found for fee collection: ${type} ${feeAmount} ${currency}`);
            return null;
        }
        const adminWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(superAdmin.id, walletType, currency, t);
        const adminWalletId = adminWalletResult.id;
        const idempotencyKey = `platform_fee_${type}_${referenceId}`;
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
                operationType: "FEE",
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
        await db_1.models.adminProfit.create({
            transactionId,
            type,
            amount: feeAmount,
            currency,
            chain: chain || null,
            description,
        }, t ? { transaction: t } : undefined);
        console_1.logger.debug("PLATFORM_FEE", `Collected ${feeAmount} ${currency} (${walletType}${chain ? "/" + chain : ""}) for ${type}: ${description}`);
        return { transactionId, adminWalletId };
    }
    catch (error) {
        console_1.logger.warn("PLATFORM_FEE", `Failed to collect fee: ${type} ${feeAmount} ${currency} ref=${referenceId} - ${error.message}`);
        return null;
    }
}
