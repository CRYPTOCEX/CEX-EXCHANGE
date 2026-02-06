"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const console_1 = require("@b/utils/console");
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
                                model: { type: "string", enum: ["fixed", "dynamic"] },
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
    var _a;
    const { user, params, body, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: User not authenticated",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding and validating offer ownership");
    const { p2pOffer, p2pPaymentMethod, p2pTrade } = db_1.models;
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating and preparing update data");
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
        if (updateData.status === "ACTIVE" && offer.status === "DRAFT") {
            throw (0, error_1.createError)({
                statusCode: 422,
                message: "Cannot activate a draft offer. Please complete all required fields first.",
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
        updateData.tradeSettings = {
            ...offer.tradeSettings,
            ...settings,
        };
    }
    if (updateData.priceConfig) {
        const priceConfig = updateData.priceConfig;
        const existingPriceConfig = typeof offer.priceConfig === "string"
            ? JSON.parse(offer.priceConfig)
            : offer.priceConfig || {};
        if (priceConfig.model && !["fixed", "dynamic"].includes(priceConfig.model)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid price model. Must be 'fixed' or 'dynamic'",
            });
        }
        if (priceConfig.model === "fixed") {
            const fixedPrice = priceConfig.fixedPrice !== undefined
                ? priceConfig.fixedPrice
                : existingPriceConfig.fixedPrice || existingPriceConfig.finalPrice || 0;
            if (fixedPrice < 0) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Fixed price must be greater than or equal to 0",
                });
            }
            priceConfig.fixedPrice = fixedPrice;
        }
        if (priceConfig.model === "dynamic") {
            const dynamicOffset = priceConfig.dynamicOffset !== undefined
                ? Number(priceConfig.dynamicOffset)
                : Number(existingPriceConfig.dynamicOffset) || 0;
            if (dynamicOffset < -50 || dynamicOffset > 50) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Dynamic offset must be between -50% and +50%",
                });
            }
            priceConfig.dynamicOffset = dynamicOffset;
        }
        const targetModel = priceConfig.model || existingPriceConfig.model || "fixed";
        const mergedPriceConfig = {
            model: targetModel,
            currency: priceConfig.currency || existingPriceConfig.currency,
        };
        if (mergedPriceConfig.model === "fixed") {
            mergedPriceConfig.fixedPrice = priceConfig.fixedPrice !== undefined
                ? priceConfig.fixedPrice
                : (existingPriceConfig.fixedPrice || existingPriceConfig.finalPrice || 0);
        }
        else {
            mergedPriceConfig.dynamicOffset = priceConfig.dynamicOffset !== undefined
                ? priceConfig.dynamicOffset
                : (existingPriceConfig.dynamicOffset || 0);
            mergedPriceConfig.marketPrice = priceConfig.marketPrice || existingPriceConfig.marketPrice;
        }
        if (mergedPriceConfig.model === "fixed") {
            mergedPriceConfig.finalPrice = mergedPriceConfig.fixedPrice;
            mergedPriceConfig.value = mergedPriceConfig.finalPrice;
        }
        else if (mergedPriceConfig.model === "dynamic") {
            if (!mergedPriceConfig.finalPrice) {
                mergedPriceConfig.finalPrice = mergedPriceConfig.marketPrice || existingPriceConfig.finalPrice || 0;
            }
        }
        updateData.priceConfig = mergedPriceConfig;
        if (priceConfig.currency) {
            updateData.priceCurrency = priceConfig.currency;
        }
    }
    if (updateData.amountConfig) {
        const amountConfig = updateData.amountConfig;
        const existingAmountConfig = typeof offer.amountConfig === "string"
            ? JSON.parse(offer.amountConfig)
            : offer.amountConfig || {};
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
        const finalMin = amountConfig.min !== undefined ? amountConfig.min : existingAmountConfig.min;
        const finalMax = amountConfig.max !== undefined ? amountConfig.max : existingAmountConfig.max;
        if (finalMin > finalMax) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Minimum amount cannot be greater than maximum amount",
            });
        }
        updateData.amountConfig = {
            ...existingAmountConfig,
            ...amountConfig,
        };
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
        updateData.userRequirements = {
            ...offer.userRequirements,
            ...requirements,
        };
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
        updateData.locationSettings = {
            ...offer.locationSettings,
            ...location,
        };
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
        const { paymentMethodIds, ...offerUpdateData } = updateData;
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
        if (error.code === 'ECONNRESET' || ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('ECONNRESET'))) {
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
