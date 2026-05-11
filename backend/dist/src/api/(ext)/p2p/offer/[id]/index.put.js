"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const utils_1 = require("@b/api/finance/wallet/utils");
const wallet_1 = require("@b/services/wallet");
const console_1 = require("@b/utils/console");
const ownership_1 = require("@b/api/(ext)/p2p/utils/ownership");
exports.metadata = {
    summary: "Updates a P2P offer",
    description: "Updates specific fields of a P2P offer with security restrictions",
    tags: ["P2P", "Offers"],
    logModule: "P2P_OFFER",
    logTitle: "Update P2P offer",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The ID of the P2P offer to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        priceConfig: {
                            type: "object",
                            properties: {
                                model: { type: "string" },
                                fixedPrice: { type: "number", minimum: 0 },
                                dynamicOffset: { type: "number", minimum: -50, maximum: 50 },
                                currency: { type: "string" },
                            },
                        },
                        amountConfig: {
                            type: "object",
                            properties: {
                                min: { type: "number", minimum: 0 },
                                max: { type: "number", minimum: 0 },
                                total: { type: "number", minimum: 0 },
                            },
                        },
                        tradeSettings: {
                            type: "object",
                            properties: {
                                autoCancel: { type: "number", minimum: 5, maximum: 1440 },
                                kycRequired: { type: "boolean" },
                                visibility: { type: "string", enum: ["PUBLIC", "PRIVATE"] },
                                termsOfTrade: { type: "string", maxLength: 1000 },
                                additionalNotes: { type: "string", maxLength: 500 },
                            },
                        },
                        locationSettings: {
                            type: "object",
                            properties: {
                                country: { type: "string", maxLength: 100 },
                                region: { type: "string", maxLength: 100 },
                                city: { type: "string", maxLength: 100 },
                                restrictions: { type: "array", items: { type: "string" } },
                            },
                        },
                        userRequirements: {
                            type: "object",
                            properties: {
                                minCompletedTrades: { type: "number", minimum: 0, maximum: 1000 },
                                minSuccessRate: { type: "number", minimum: 0, maximum: 100 },
                                minAccountAge: { type: "number", minimum: 0, maximum: 365 },
                                trustedOnly: { type: "boolean" },
                            },
                        },
                        paymentMethodIds: {
                            type: "array",
                            items: { type: "string", format: "uuid" },
                            description: "Array of P2P payment method IDs to update",
                            minItems: 1,
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "PAUSED"],
                            description: "Only ACTIVE and PAUSED statuses can be set by users",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Offer updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            data: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid input data" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden - Not the offer owner" },
        404: { description: "Offer not found" },
        422: { description: "Cannot edit offer in current state" },
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f;
    const { user, params, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: User not authenticated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating and preparing update data");
    const { p2pOffer, p2pPaymentMethod, p2pTrade } = db_1.models;
    const allowedFields = ["priceConfig", "amountConfig", "tradeSettings", "locationSettings", "userRequirements", "paymentMethodIds", "status"];
    const jsonFields = ["priceConfig", "amountConfig", "tradeSettings", "locationSettings", "userRequirements"];
    const updateData = {};
    for (const field of allowedFields) {
        if (body[field] !== undefined) {
            if (jsonFields.includes(field)) {
                const parsed = (0, json_parser_1.safeParseJSON)(body[field]);
                if (parsed !== null) {
                    updateData[field] = parsed;
                }
                else {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Invalid JSON for field ${field}`,
                    });
                }
            }
            else {
                updateData[field] = body[field];
            }
        }
    }
    if (updateData.status) {
        const allowedStatuses = ["ACTIVE", "PAUSED"];
        if (!allowedStatuses.includes(updateData.status)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid status. Only ACTIVE and PAUSED are allowed.",
            });
        }
    }
    if (updateData.tradeSettings) {
        const settings = updateData.tradeSettings;
        if (settings.autoCancel !== undefined) {
            if (settings.autoCancel < 5 || settings.autoCancel > 1440) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Auto cancel time must be between 5 and 1440 minutes",
                });
            }
        }
        if (settings.termsOfTrade && settings.termsOfTrade.length > 1000) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Terms of trade cannot exceed 1000 characters",
            });
        }
        if (settings.additionalNotes && settings.additionalNotes.length > 500) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Additional notes cannot exceed 500 characters",
            });
        }
    }
    if (updateData.priceConfig) {
        const priceConfig = updateData.priceConfig;
        if (priceConfig.model) {
            priceConfig.model = priceConfig.model.toUpperCase();
        }
        if (priceConfig.model && !["FIXED", "MARGIN"].includes(priceConfig.model)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid price model. Must be 'FIXED' or 'MARGIN'",
            });
        }
        if (priceConfig.model === "FIXED" && priceConfig.fixedPrice !== undefined && priceConfig.fixedPrice < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Fixed price must be greater than or equal to 0",
            });
        }
        if (priceConfig.model === "MARGIN" && priceConfig.dynamicOffset !== undefined) {
            const dynamicOffset = Number(priceConfig.dynamicOffset);
            if (dynamicOffset < -50 || dynamicOffset > 50) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Dynamic offset must be between -50% and +50%",
                });
            }
            priceConfig.dynamicOffset = dynamicOffset;
        }
    }
    if (updateData.amountConfig) {
        const amountConfig = updateData.amountConfig;
        if (amountConfig.min !== undefined && amountConfig.min < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum amount must be greater than or equal to 0",
            });
        }
        if (amountConfig.max !== undefined && amountConfig.max < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Maximum amount must be greater than or equal to 0",
            });
        }
        if (amountConfig.total !== undefined && amountConfig.total < 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Total amount must be greater than or equal to 0",
            });
        }
        if (amountConfig.min !== undefined && amountConfig.max !== undefined && amountConfig.min > amountConfig.max) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum amount cannot be greater than maximum amount",
            });
        }
        if (amountConfig.min !== undefined) {
            updateData.minLimit = amountConfig.min;
        }
        if (amountConfig.max !== undefined) {
            updateData.maxLimit = amountConfig.max;
        }
    }
    if (updateData.userRequirements) {
        const requirements = updateData.userRequirements;
        if (requirements.minCompletedTrades !== undefined && (requirements.minCompletedTrades < 0 || requirements.minCompletedTrades > 1000)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum completed trades must be between 0 and 1000",
            });
        }
        if (requirements.minSuccessRate !== undefined && (requirements.minSuccessRate < 0 || requirements.minSuccessRate > 100)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum success rate must be between 0 and 100",
            });
        }
        if (requirements.minAccountAge !== undefined && (requirements.minAccountAge < 0 || requirements.minAccountAge > 365)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum account age must be between 0 and 365 days",
            });
        }
    }
    if (updateData.locationSettings) {
        const location = updateData.locationSettings;
        if (location.country && location.country.length > 100) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Country name cannot exceed 100 characters",
            });
        }
        if (location.region && location.region.length > 100) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Region name cannot exceed 100 characters",
            });
        }
        if (location.city && location.city.length > 100) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "City name cannot exceed 100 characters",
            });
        }
    }
    if (updateData.paymentMethodIds) {
        if (!Array.isArray(updateData.paymentMethodIds) || updateData.paymentMethodIds.length === 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "At least one payment method is required",
            });
        }
        const existingMethods = await p2pPaymentMethod.findAll({
            where: { id: updateData.paymentMethodIds },
        });
        if (existingMethods.length !== updateData.paymentMethodIds.length) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "One or more payment method IDs are invalid",
            });
        }
        for (const methodId of updateData.paymentMethodIds) {
            const owns = await (0, ownership_1.isPaymentMethodOwner)(user.id, methodId);
            if (!owns) {
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: "You do not have permission to use one or more of the provided payment methods",
                });
            }
        }
    }
    if (Object.keys(updateData).length === 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No valid fields provided for update",
        });
    }
    const cacheManager = cache_1.CacheManager.getInstance();
    const autoApprove = await cacheManager.getSetting("p2pAutoApproveOffers");
    const shouldAutoApprove = autoApprove === true || autoApprove === "true";
    const isStatusOnlyChange = Object.keys(updateData).length === 1 && updateData.status;
    const userExplicitlySetStatus = updateData.status !== undefined;
    if (!isStatusOnlyChange && !userExplicitlySetStatus) {
        updateData.status = shouldAutoApprove ? "ACTIVE" : "PENDING_APPROVAL";
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offer with new configuration");
    let transaction;
    try {
        transaction = await db_1.sequelize.transaction();
        const offer = await p2pOffer.findOne({
            where: { id, userId: user.id },
            include: [
                {
                    model: p2pTrade,
                    as: "trades",
                    where: { status: { [sequelize_1.Op.in]: ["PENDING", "ACTIVE", "ESCROW"] } },
                    required: false,
                },
            ],
            lock: true,
            transaction,
        });
        if (!offer) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "Offer not found or you don't have permission to edit it",
            });
        }
        const canEdit = ["DRAFT", "PENDING_APPROVAL", "ACTIVE", "PAUSED"].includes(offer.status);
        if (!canEdit) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: `Cannot edit offer in ${offer.status} status`,
            });
        }
        const activeTrades = offer.trades || [];
        if (activeTrades.length > 0) {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Cannot edit offer while there are active trades. Please wait for trades to complete.",
            });
        }
        if (updateData.status === "ACTIVE" && offer.status === "DRAFT") {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Cannot activate a draft offer. Please complete all required fields first.",
            });
        }
        if (updateData.tradeSettings) {
            const existingTradeSettings = typeof offer.tradeSettings === "string"
                ? JSON.parse(offer.tradeSettings)
                : offer.tradeSettings || {};
            updateData.tradeSettings = {
                ...existingTradeSettings,
                ...updateData.tradeSettings,
            };
            if (updateData.tradeSettings.autoCancel !== undefined) {
                updateData.tradeSettings.autoCancel = Number(updateData.tradeSettings.autoCancel) || existingTradeSettings.autoCancel || 30;
            }
        }
        if (updateData.priceConfig) {
            const existingPriceConfig = typeof offer.priceConfig === "string"
                ? JSON.parse(offer.priceConfig)
                : offer.priceConfig || {};
            const priceConfig = updateData.priceConfig;
            const targetModel = priceConfig.model || existingPriceConfig.model || "FIXED";
            const mergedPriceConfig = {
                model: targetModel,
                currency: priceConfig.currency || existingPriceConfig.currency,
            };
            if (mergedPriceConfig.model === "FIXED") {
                mergedPriceConfig.fixedPrice = priceConfig.fixedPrice !== undefined
                    ? priceConfig.fixedPrice
                    : (existingPriceConfig.fixedPrice || existingPriceConfig.finalPrice || 0);
                mergedPriceConfig.finalPrice = mergedPriceConfig.fixedPrice;
                mergedPriceConfig.value = mergedPriceConfig.finalPrice;
            }
            else {
                mergedPriceConfig.dynamicOffset = priceConfig.dynamicOffset !== undefined
                    ? priceConfig.dynamicOffset
                    : (existingPriceConfig.dynamicOffset || 0);
                mergedPriceConfig.marketPrice = priceConfig.marketPrice || existingPriceConfig.marketPrice;
                mergedPriceConfig.finalPrice = mergedPriceConfig.marketPrice || existingPriceConfig.finalPrice || 0;
            }
            if (priceConfig.currency) {
                updateData.priceCurrency = priceConfig.currency;
            }
            updateData.priceConfig = mergedPriceConfig;
        }
        if (updateData.amountConfig) {
            const existingAmountConfig = typeof offer.amountConfig === "string"
                ? JSON.parse(offer.amountConfig)
                : offer.amountConfig || {};
            const amountConfig = updateData.amountConfig;
            const finalMin = amountConfig.min !== undefined ? amountConfig.min : existingAmountConfig.min;
            const finalMax = amountConfig.max !== undefined ? amountConfig.max : existingAmountConfig.max;
            if (finalMin !== undefined && finalMax !== undefined && finalMin > finalMax) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Minimum amount cannot be greater than maximum amount",
                });
            }
            updateData.amountConfig = {
                ...existingAmountConfig,
                ...amountConfig,
            };
        }
        if (updateData.userRequirements) {
            updateData.userRequirements = {
                ...offer.userRequirements,
                ...updateData.userRequirements,
            };
        }
        if (updateData.locationSettings) {
            updateData.locationSettings = {
                ...offer.locationSettings,
                ...updateData.locationSettings,
            };
        }
        if (offer.type === "SELL" && offer.status === "ACTIVE" && ((_a = updateData.amountConfig) === null || _a === void 0 ? void 0 : _a.total) !== undefined) {
            const oldTotal = (0, json_parser_1.parseAmountConfig)(offer.amountConfig).total;
            const newTotal = updateData.amountConfig.total;
            const delta = newTotal - oldTotal;
            if (delta !== 0) {
                const sellerWallet = await db_1.models.wallet.findOne({
                    where: { userId: offer.userId, type: offer.walletType, currency: offer.currency },
                    lock: true,
                    transaction,
                });
                if (sellerWallet) {
                    const updateScope = offer.updatedAt ? new Date(offer.updatedAt).getTime() : "no_updated_at";
                    if (delta > 0) {
                        if (sellerWallet.balance < delta) {
                            throw (0, error_1.createError)({ statusCode: 409, message: `Insufficient balance to increase offer amount. Available: ${sellerWallet.balance}` });
                        }
                        await wallet_1.walletService.hold({
                            idempotencyKey: `p2p_offer_increase_${offer.id}_${updateScope}`,
                            userId: offer.userId,
                            walletId: sellerWallet.id,
                            walletType: offer.walletType,
                            currency: offer.currency,
                            amount: delta,
                            operationType: "P2P_OFFER_INCREASE",
                            description: `Lock additional ${delta} ${offer.currency} for P2P offer increase`,
                            metadata: { offerId: offer.id },
                            transaction,
                        });
                    }
                    else {
                        const releaseAmount = Math.min(Math.abs(delta), (_b = sellerWallet.inOrder) !== null && _b !== void 0 ? _b : 0);
                        if (releaseAmount > 0) {
                            await wallet_1.walletService.release({
                                idempotencyKey: `p2p_offer_decrease_${offer.id}_${updateScope}`,
                                userId: offer.userId,
                                walletId: sellerWallet.id,
                                walletType: offer.walletType,
                                currency: offer.currency,
                                amount: releaseAmount,
                                operationType: "P2P_OFFER_DECREASE",
                                description: `Release ${releaseAmount} ${offer.currency} from P2P offer decrease`,
                                metadata: { offerId: offer.id },
                                transaction,
                            });
                        }
                    }
                }
            }
        }
        const { paymentMethodIds, ...offerUpdateData } = updateData;
        const previousOfferStatus = offer.status;
        if (offer.type === "SELL" && updateData.status && updateData.status !== previousOfferStatus) {
            const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            const offerAmount = amountConfig.total;
            if (offerAmount > 0) {
                if (updateData.status === "PAUSED") {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Releasing ${offerAmount} ${offer.currency} - offer paused`);
                    const wallet = await (0, utils_1.getWalletSafe)(user.id, offer.walletType, offer.currency, false, ctx);
                    if (wallet && ((_c = wallet.inOrder) !== null && _c !== void 0 ? _c : 0) >= offerAmount) {
                        await wallet_1.walletService.release({
                            idempotencyKey: `p2p_offer_pause_release_${offer.id}`,
                            userId: user.id,
                            walletId: wallet.id,
                            walletType: offer.walletType,
                            currency: offer.currency,
                            amount: offerAmount,
                            operationType: "P2P_OFFER_PAUSE",
                            description: `Release ${offerAmount} ${offer.currency} - P2P offer paused`,
                            metadata: { offerId: offer.id },
                            transaction,
                        });
                    }
                }
                else if (updateData.status === "ACTIVE" && previousOfferStatus === "PAUSED") {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Re-locking ${offerAmount} ${offer.currency} - offer resumed`);
                    const wallet = await (0, utils_1.getWalletSafe)(user.id, offer.walletType, offer.currency, false, ctx);
                    if (!wallet || ((_d = wallet.balance) !== null && _d !== void 0 ? _d : 0) < offerAmount) {
                        await transaction.rollback();
                        throw (0, error_1.createError)({
                            statusCode: 400,
                            message: `Insufficient balance to resume offer. Available: ${(_e = wallet === null || wallet === void 0 ? void 0 : wallet.balance) !== null && _e !== void 0 ? _e : 0} ${offer.currency}, Required: ${offerAmount} ${offer.currency}`,
                        });
                    }
                    await wallet_1.walletService.hold({
                        idempotencyKey: `p2p_offer_resume_lock_${offer.id}`,
                        userId: user.id,
                        walletId: wallet.id,
                        walletType: offer.walletType,
                        currency: offer.currency,
                        amount: offerAmount,
                        operationType: "P2P_OFFER_LOCK",
                        description: `Lock ${offerAmount} ${offer.currency} - P2P offer resumed`,
                        metadata: { offerId: offer.id },
                        transaction,
                    });
                }
            }
        }
        await offer.update(offerUpdateData, { transaction });
        if (paymentMethodIds) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating payment methods (${paymentMethodIds.length} methods)`);
            await offer.setPaymentMethods(paymentMethodIds, { transaction });
        }
        await transaction.commit();
        const updatedOffer = await p2pOffer.findByPk(offer.id, {
            include: [
                {
                    model: p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
            ],
        });
        const message = shouldAutoApprove
            ? "Offer updated successfully. Your offer is now active."
            : "Offer updated successfully. Your offer is now pending approval.";
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Updated offer ${id} (status: ${updatedOffer === null || updatedOffer === void 0 ? void 0 : updatedOffer.status})`);
        return {
            message,
            data: updatedOffer,
        };
    }
    catch (error) {
        if (transaction) {
            try {
                if (!transaction.finished) {
                    await transaction.rollback();
                }
            }
            catch (rollbackError) {
                const errorMessage = rollbackError.message || "";
                const isIgnorableError = errorMessage.includes("already been finished") ||
                    errorMessage.includes("closed state") ||
                    errorMessage.includes("ECONNRESET");
                if (!isIgnorableError) {
                    console_1.logger.error("P2P_OFFER", "Transaction rollback failed", rollbackError);
                }
            }
        }
        if (error.name === 'SequelizeValidationError') {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Validation error: ${error.message}`,
            });
        }
        if (error.name === 'SequelizeDatabaseError') {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Database error: ${error.message}`,
            });
        }
        if (error.code === 'ECONNRESET' || ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('ECONNRESET'))) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Database connection error. Please try again.",
            });
        }
        throw (0, error_1.createError)({
            statusCode: error.statusCode || 500,
            message: error.message || "Failed to update offer",
        });
    }
};
