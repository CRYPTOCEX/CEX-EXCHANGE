"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/admin/ico/utils");
const notifications_1 = require("@b/utils/notifications");
const Middleware_1 = require("@b/handler/Middleware");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const wallet_1 = require("@b/services/wallet");
const fees_1 = require("@b/utils/fees");
const affiliate_1 = require("@b/utils/affiliate");
exports.metadata = {
    summary: "Create a New ICO Investment",
    description: "Creates a new ICO investment transaction for the authenticated user using icoTransaction only. The wallet type and currency are derived from the associated plan. It also deducts funds from the user's wallet, records the transaction, updates offering stats, and sends email and in‑app notifications to both investor and seller.",
    operationId: "createIcoInvestment",
    tags: ["ICO", "Investments"],
    requiresAuth: true,
    logModule: "ICO_INVESTMENT",
    logTitle: "Purchase ICO tokens",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        offeringId: { type: "string", description: "ICO offering ID" },
                        amount: { type: "number", description: "Investment amount" },
                        walletAddress: {
                            type: "string",
                            description: "Wallet address where tokens will be sent",
                        },
                    },
                    required: ["offeringId", "amount", "walletAddress"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "ICO investment transaction created successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            transactionId: {
                                type: "string",
                                description: "Transaction ID",
                            },
                            tokenAmount: {
                                type: "number",
                                description: "Number of tokens purchased",
                            },
                        },
                    },
                },
            },
        },
        400: { description: "Missing required fields or insufficient balance." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
function validateWalletAddress(address, blockchain) {
    const validators = {
        ethereum: /^0x[a-fA-F0-9]{40}$/,
        bsc: /^0x[a-fA-F0-9]{40}$/,
        polygon: /^0x[a-fA-F0-9]{40}$/,
        bitcoin: /^(bc1[a-zA-HJ-NP-Z0-9]{25,87}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/,
        solana: /^[1-9A-HJ-NP-Za-km-z]{32,44}$/,
    };
    const validator = validators[blockchain.toLowerCase()];
    if (!validator) {
        return address.length >= 20 && address.length <= 128 && !/\s/.test(address);
    }
    return validator.test(address);
}
async function getInvestmentLimits() {
    const settings = await db_1.models.settings.findAll({
        where: {
            key: {
                [sequelize_1.Op.in]: ['icoMinInvestmentAmount', 'icoMaxInvestmentAmount', 'icoMaxPerUser', 'icoPlatformFeePercentage']
            }
        }
    });
    const limits = settings.reduce((acc, setting) => {
        var _a;
        acc[setting.key] = parseFloat((_a = setting.value) !== null && _a !== void 0 ? _a : '0') || 0;
        return acc;
    }, {});
    return {
        minInvestment: limits.icoMinInvestmentAmount || 10,
        maxInvestment: limits.icoMaxInvestmentAmount || 100000,
        maxPerUser: limits.icoMaxPerUser || 50000,
        feePercentage: limits.icoPlatformFeePercentage || 0,
    };
}
exports.default = async (data) => {
    var _a, _b;
    await Middleware_1.rateLimiters.orderCreation(data);
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating purchase request");
    const { offeringId, amount, walletAddress } = body;
    if (!offeringId || !amount || !walletAddress) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing required fields" });
    }
    if (!Number.isFinite(amount) || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid investment amount" });
    }
    const transaction = await db_1.sequelize.transaction();
    let committed = false;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving ICO offering details");
        const offering = await db_1.models.icoTokenOffering.findByPk(offeringId, {
            include: [
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    required: true,
                },
            ],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Offering not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offering status and eligibility");
        if (offering.status !== 'ACTIVE') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Offering is ${offering.status.toLowerCase()}. Only active offerings can receive investments.`
            });
        }
        const now = new Date();
        if (now < offering.startDate) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Offering has not started yet"
            });
        }
        if (now > offering.endDate) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Offering has ended"
            });
        }
        const blockchain = offering.tokenDetail.blockchain;
        if (!validateWalletAddress(walletAddress, blockchain)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid ${blockchain} wallet address format`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking investment limits and user eligibility");
        const limits = await getInvestmentLimits();
        if (amount < limits.minInvestment) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Minimum investment is ${limits.minInvestment} ${offering.purchaseWalletCurrency}`
            });
        }
        if (amount > limits.maxInvestment) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Maximum investment is ${limits.maxInvestment} ${offering.purchaseWalletCurrency}`
            });
        }
        const existingInvestments = await db_1.models.icoTransaction.findAll({
            where: {
                userId: user.id,
                offeringId: offering.id,
                status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
            },
            transaction,
        });
        const totalUserInvestment = existingInvestments.reduce((sum, inv) => {
            return sum + (inv.amount * inv.price);
        }, 0);
        if (totalUserInvestment + amount > limits.maxPerUser) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Maximum investment per user is ${limits.maxPerUser} ${offering.purchaseWalletCurrency}. You have already invested ${totalUserInvestment}.`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding active phase and calculating token amount");
        const activePhase = await db_1.models.icoTokenOfferingPhase.findOne({
            where: {
                offeringId: offering.id,
                remaining: { [sequelize_1.Op.gt]: 0 }
            },
            order: [['sequence', 'ASC']],
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!activePhase) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No tokens available for sale"
            });
        }
        const tokenPrice = activePhase.tokenPrice;
        const ecosystemToken = await db_1.models.ecosystemToken.findOne({
            where: {
                currency: offering.symbol,
                chain: blockchain.toLowerCase()
            },
            transaction,
        });
        const decimals = (ecosystemToken === null || ecosystemToken === void 0 ? void 0 : ecosystemToken.decimals) || 18;
        const tokenAmount = (amount / tokenPrice) * Math.pow(10, decimals);
        const tokenAmountNormalized = amount / tokenPrice;
        if (tokenAmountNormalized > activePhase.remaining) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Only ${activePhase.remaining} tokens remaining in current phase`
            });
        }
        const totalRaisedResult = await db_1.models.icoTransaction.findOne({
            where: {
                offeringId: offering.id,
                status: { [sequelize_1.Op.in]: ['PENDING', 'VERIFICATION', 'RELEASED'] }
            },
            attributes: [
                [db_1.sequelize.fn('SUM', db_1.sequelize.literal('amount * price')), 'totalRaised']
            ],
            raw: true,
            transaction,
            lock: transaction.LOCK.SHARE,
        });
        const totalRaised = parseFloat(totalRaisedResult === null || totalRaisedResult === void 0 ? void 0 : totalRaisedResult.totalRaised) || 0;
        if (totalRaised + amount > offering.targetAmount) {
            const remainingCap = offering.targetAmount - totalRaised;
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Investment exceeds target amount. Only ${remainingCap} ${offering.purchaseWalletCurrency} remaining.`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet balance");
        const wallet = await db_1.models.wallet.findOne({
            where: {
                userId: user.id,
                type: offering.purchaseWalletType,
                currency: offering.purchaseWalletCurrency,
            },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!wallet) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `No ${offering.purchaseWalletType} wallet found for ${offering.purchaseWalletCurrency}. Please create a wallet first.`,
            });
        }
        const availableBalance = wallet.balance || 0;
        const feeAmount = amount * (limits.feePercentage / 100);
        if (availableBalance < amount + feeAmount) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Insufficient wallet balance. Required: ${amount + feeAmount} ${offering.purchaseWalletCurrency} (${amount} + ${feeAmount} fee), Available: ${availableBalance} ${offering.purchaseWalletCurrency}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating ICO transaction record");
        const icoTransaction = await db_1.models.icoTransaction.create({
            userId: user.id,
            offeringId: offering.id,
            amount: tokenAmountNormalized,
            price: tokenPrice,
            status: "PENDING",
            walletAddress,
            notes: JSON.stringify({
                phase: activePhase.name,
                decimals,
                rawTokenAmount: tokenAmount.toString(),
                investmentAmount: amount,
                feePercentage: limits.feePercentage,
                feeAmount,
                currency: offering.purchaseWalletCurrency,
            }),
        }, { transaction });
        const transactionId = icoTransaction.id;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting payment from wallet");
        const idempotencyKey = `ico_purchase_${icoTransaction.id}`;
        const walletResult = await wallet_1.walletService.debit({
            idempotencyKey,
            userId: user.id,
            walletId: wallet.id,
            walletType: offering.purchaseWalletType,
            currency: offering.purchaseWalletCurrency,
            amount,
            fee: feeAmount,
            operationType: "ICO_CONTRIBUTION",
            description: `ICO Investment in ${offering.name} - ${tokenAmountNormalized} tokens at ${tokenPrice} ${offering.purchaseWalletCurrency} each`,
            metadata: {
                offeringId: offering.id,
                offeringName: offering.name,
                phase: activePhase.name,
                tokenAmount: tokenAmountNormalized,
                tokenPrice,
                walletAddress,
                feePercentage: limits.feePercentage,
                feeAmount,
                icoTransactionId: icoTransaction.id,
            },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Linking wallet transaction to ICO record");
        const icoNotes = JSON.parse(icoTransaction.notes);
        icoNotes.walletTransactionId = walletResult.transactionId;
        icoNotes.transactionId = transactionId;
        await icoTransaction.update({ notes: JSON.stringify(icoNotes) }, { transaction });
        if (feeAmount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Collecting ICO platform fee");
            await (0, fees_1.collectPlatformFee)({
                userId: user.id,
                currency: offering.purchaseWalletCurrency,
                walletType: offering.purchaseWalletType,
                feeAmount,
                type: "ICO_CONTRIBUTION",
                description: `ICO purchase fee for ${offering.name}`,
                referenceId: icoTransaction.id,
                metadata: {
                    offeringId: offering.id,
                    offeringName: offering.name,
                    phase: activePhase.name,
                    feePercentage: limits.feePercentage,
                    icoTransactionId: icoTransaction.id,
                },
                transaction,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Crediting ICO escrow wallet");
        const escrowAdmin = await (0, fees_1.getSuperAdmin)();
        if (!escrowAdmin) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "ICO escrow is not configured: no Super Admin wallet available to hold contributed funds.",
            });
        }
        const escrowWalletResult = await wallet_1.walletCreationService.getOrCreateWallet(escrowAdmin.id, offering.purchaseWalletType, offering.purchaseWalletCurrency, transaction);
        const escrowWalletId = (_b = (_a = escrowWalletResult === null || escrowWalletResult === void 0 ? void 0 : escrowWalletResult.wallet) === null || _a === void 0 ? void 0 : _a.id) !== null && _b !== void 0 ? _b : escrowWalletResult === null || escrowWalletResult === void 0 ? void 0 : escrowWalletResult.id;
        if (!escrowWalletId) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Failed to resolve ICO escrow wallet.",
            });
        }
        await wallet_1.walletService.credit({
            idempotencyKey: `ico_purchase_credit_${icoTransaction.id}`,
            userId: escrowAdmin.id,
            walletId: escrowWalletId,
            walletType: offering.purchaseWalletType,
            currency: offering.purchaseWalletCurrency,
            amount,
            operationType: "ICO_CONTRIBUTION",
            referenceId: icoTransaction.id,
            description: `ICO escrow hold for ${offering.name} (tx ${icoTransaction.id})`,
            metadata: {
                escrow: true,
                offeringId: offering.id,
                offeringName: offering.name,
                buyerId: user.id,
                icoTransactionId: icoTransaction.id,
            },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating phase and offering statistics");
        await activePhase.update({ remaining: db_1.sequelize.literal(`remaining - ${parseFloat(String(tokenAmountNormalized))}`) }, { transaction });
        const isNewParticipant = existingInvestments.length === 0;
        if (isNewParticipant) {
            await offering.update({ participants: db_1.sequelize.literal('participants + 1') }, { transaction });
        }
        await db_1.models.icoAdminActivity.create({
            type: "INVESTMENT_CREATED",
            offeringId: offering.id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                investor: user.email,
                amount,
                tokenAmount: tokenAmountNormalized,
                phase: activePhase.name,
                walletAddress,
            }),
        }, { transaction });
        await transaction.commit();
        committed = true;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email and in-app notifications");
        if (user.email) {
            await (0, utils_1.sendIcoBuyerEmail)(user.email, {
                INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
                OFFERING_NAME: offering.name,
                AMOUNT_INVESTED: amount.toFixed(2),
                TOKEN_AMOUNT: tokenAmountNormalized.toFixed(4),
                TOKEN_PRICE: tokenPrice.toFixed(4),
                TRANSACTION_ID: transactionId,
            }, ctx);
        }
        const owner = await db_1.models.user.findByPk(offering.userId);
        if (owner && owner.email) {
            await (0, utils_1.sendIcoSellerEmail)(owner.email, {
                SELLER_NAME: `${owner.firstName} ${owner.lastName}`,
                OFFERING_NAME: offering.name,
                INVESTOR_NAME: `${user.firstName} ${user.lastName}`,
                AMOUNT_INVESTED: amount.toFixed(2),
                TOKEN_AMOUNT: tokenAmountNormalized.toFixed(4),
                TRANSACTION_ID: transactionId,
            }, ctx);
        }
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: offering.id,
                type: "investment",
                title: "Investment Confirmed",
                message: `Your investment of ${amount} ${offering.purchaseWalletCurrency} in ${offering.name} has been confirmed.`,
                details: `You have purchased ${tokenAmountNormalized.toFixed(4)} tokens at ${tokenPrice} ${offering.purchaseWalletCurrency} per token. Transaction ID: ${transactionId}`,
                link: `/ico/dashboard?tab=transactions`,
                actions: [
                    {
                        label: "View Transaction",
                        link: `/ico/dashboard?tab=transactions`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console_1.logger.error("ICO_TRANSACTION", "Failed to create in-app notification for buyer", notifErr);
        }
        try {
            await (0, notifications_1.createNotification)({
                userId: offering.userId,
                relatedId: offering.id,
                type: "system",
                title: "New Investment Received",
                message: `New investment of ${amount} ${offering.purchaseWalletCurrency} in ${offering.name}`,
                details: `Investor: ${user.firstName} ${user.lastName}\nAmount: ${amount} ${offering.purchaseWalletCurrency}\nTokens: ${tokenAmountNormalized.toFixed(4)}\nPhase: ${activePhase.name}`,
                link: `/ico/creator/token/${offering.id}?tab=transactions`,
                actions: [
                    {
                        label: "View Details",
                        link: `/ico/creator/token/${offering.id}?tab=transactions`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console_1.logger.error("ICO_TRANSACTION", "Failed to create in-app notification for seller", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Purchased ${tokenAmountNormalized.toFixed(4)} tokens for ${amount} ${offering.purchaseWalletCurrency}`);
        try {
            await (0, affiliate_1.processRewards)(user.id, amount, "ICO_CONTRIBUTION", offering.purchaseWalletCurrency, `ICO_CONTRIBUTION:ico_transaction:${icoTransaction.id}`);
        }
        catch (affiliateError) {
            console_1.logger.error("ICO_TRANSACTION", "Failed to process affiliate rewards", affiliateError);
        }
        return {
            message: "ICO investment transaction created successfully.",
            transactionId,
            tokenAmount: tokenAmountNormalized,
        };
    }
    catch (err) {
        if (!committed) {
            await transaction.rollback();
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to process ICO investment");
        throw err;
    }
};
