"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const Middleware_1 = require("@b/handler/Middleware");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const utils_1 = require("../../utils");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update P2P offer",
    description: "Updates a P2P offer with admin privileges. Handles status transitions (approval, rejection, etc.), sends email notifications to users, and manages locked funds for SELL offers.",
    operationId: "updateAdminP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminOfferRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Update P2P offer",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Offer update data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        type: {
                            type: "string",
                            enum: ["BUY", "SELL"],
                            description: "Trade type"
                        },
                        currency: {
                            type: "string",
                            description: "Cryptocurrency"
                        },
                        walletType: {
                            type: "string",
                            enum: ["SPOT", "FIAT", "ECO"],
                            description: "Wallet type"
                        },
                        status: {
                            type: "string",
                            enum: ["ACTIVE", "PENDING_APPROVAL", "PAUSED", "DISABLED", "FLAGGED", "REJECTED", "DRAFT", "COMPLETED", "CANCELLED", "EXPIRED"],
                            description: "Offer status"
                        },
                        amountConfig: {
                            type: "string",
                            description: "JSON string of amount configuration"
                        },
                        priceConfig: {
                            type: "string",
                            description: "JSON string of price configuration"
                        },
                        tradeSettings: {
                            type: "string",
                            description: "JSON string of trade settings"
                        },
                        locationSettings: {
                            type: "string",
                            description: "JSON string of location settings"
                        },
                        userRequirements: {
                            type: "string",
                            description: "JSON string of user requirements"
                        },
                        paymentMethodIds: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of payment method IDs"
                        },
                        adminNotes: {
                            type: "string",
                            description: "Admin notes about the offer"
                        },
                        rejectionReason: {
                            type: "string",
                            description: "Reason for rejection (used when status is set to REJECTED)"
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Offer updated successfully" },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching P2P offer");
        const offer = await db_1.models.p2pOffer.findByPk(id);
        if (!offer) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        const offerUser = await db_1.models.user.findByPk(offer.userId, {
            attributes: ["id", "firstName", "lastName", "email"],
        });
        const adminUser = await db_1.models.user.findByPk(user.id, {
            attributes: ["id", "firstName", "lastName", "email"],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing update data");
        const originalStatus = offer.status;
        const updateData = {};
        if (body.type !== undefined)
            updateData.type = body.type;
        if (body.currency !== undefined)
            updateData.currency = body.currency;
        if (body.walletType !== undefined)
            updateData.walletType = body.walletType;
        if (body.status !== undefined)
            updateData.status = body.status;
        if (body.adminNotes !== undefined)
            updateData.adminNotes = body.adminNotes;
        if (body.amountConfig !== undefined) {
            try {
                const amountConfig = typeof body.amountConfig === 'string'
                    ? JSON.parse(body.amountConfig)
                    : body.amountConfig;
                updateData.amountConfig = amountConfig;
            }
            catch (e) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid amountConfig format" });
            }
        }
        if (body.priceConfig !== undefined) {
            try {
                const priceConfig = typeof body.priceConfig === 'string'
                    ? JSON.parse(body.priceConfig)
                    : body.priceConfig;
                updateData.priceConfig = priceConfig;
            }
            catch (e) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid priceConfig format" });
            }
        }
        if (body.tradeSettings !== undefined) {
            try {
                const tradeSettings = typeof body.tradeSettings === 'string'
                    ? JSON.parse(body.tradeSettings)
                    : body.tradeSettings;
                updateData.tradeSettings = tradeSettings;
            }
            catch (e) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid tradeSettings format" });
            }
        }
        if (body.locationSettings !== undefined) {
            try {
                const locationSettings = typeof body.locationSettings === 'string'
                    ? JSON.parse(body.locationSettings)
                    : body.locationSettings;
                updateData.locationSettings = locationSettings;
            }
            catch (e) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid locationSettings format" });
            }
        }
        if (body.userRequirements !== undefined) {
            try {
                const userRequirements = typeof body.userRequirements === 'string'
                    ? JSON.parse(body.userRequirements)
                    : body.userRequirements;
                updateData.userRequirements = userRequirements;
            }
            catch (e) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid userRequirements format" });
            }
        }
        if (updateData.amountConfig || updateData.priceConfig) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating trade amounts");
            const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
            const cacheManager = CacheManager.getInstance();
            const minTradeAmount = await cacheManager.getSetting("p2pMinimumTradeAmount");
            const maxTradeAmount = await cacheManager.getSetting("p2pMaximumTradeAmount");
            const amountConfig = updateData.amountConfig || offer.amountConfig;
            const priceConfig = updateData.priceConfig || offer.priceConfig;
            const priceCurrency = (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.currency) || "USD";
            const offerMin = (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.min) || 0;
            const offerMax = (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.max) || (amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.total) || 0;
            if (minTradeAmount && offerMin < minTradeAmount) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Minimum trade amount cannot be less than platform minimum of ${minTradeAmount} ${priceCurrency}`,
                });
            }
            if (maxTradeAmount && offerMax > maxTradeAmount) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Maximum trade amount cannot exceed platform maximum of ${maxTradeAmount} ${priceCurrency}`,
                });
            }
            const { validateMinimumTradeAmount } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/fees")));
            if ((amountConfig === null || amountConfig === void 0 ? void 0 : amountConfig.min) && (priceConfig === null || priceConfig === void 0 ? void 0 : priceConfig.finalPrice)) {
                const currency = updateData.currency || offer.currency;
                const cryptoMinAmount = amountConfig.min / priceConfig.finalPrice;
                const minimumValidation = await validateMinimumTradeAmount(cryptoMinAmount, currency);
                if (!minimumValidation.valid && minimumValidation.minimum) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Minimum trade amount for ${currency} is ${minimumValidation.minimum} ${currency}. Current minimum converts to ${cryptoMinAmount.toFixed(8)} ${currency}.`,
                    });
                }
            }
        }
        let actionType = "ADMIN_UPDATE";
        let shouldSendEmail = false;
        let emailType = "";
        let emailReplacements = {};
        if (body.status && body.status !== originalStatus) {
            switch (body.status) {
                case "ACTIVE":
                    if (originalStatus === "PENDING_APPROVAL") {
                        actionType = "OFFER_APPROVED";
                        shouldSendEmail = true;
                        emailType = "approval";
                        emailReplacements = {
                            OFFER_TYPE: offer.type,
                            CURRENCY: offer.currency,
                            APPROVED_BY: adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin' : 'Admin',
                            NOTES: body.adminNotes || "",
                            USER_NAME: offerUser ? `${offerUser.firstName || ''} ${offerUser.lastName || ''}`.trim() || 'User' : 'User',
                        };
                    }
                    break;
                case "REJECTED":
                    actionType = "OFFER_REJECTED";
                    shouldSendEmail = true;
                    emailType = "rejection";
                    emailReplacements = {
                        OFFER_TYPE: offer.type,
                        CURRENCY: offer.currency,
                        REJECTED_BY: adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin' : 'Admin',
                        REASON: body.rejectionReason || "Does not meet platform requirements",
                        USER_NAME: offerUser ? `${offerUser.firstName || ''} ${offerUser.lastName || ''}`.trim() || 'User' : 'User',
                    };
                    updateData.adminNotes = `Rejected: ${body.rejectionReason || "No reason provided"}\n${body.adminNotes || ""}`;
                    break;
                case "FLAGGED":
                    actionType = "OFFER_FLAGGED";
                    shouldSendEmail = true;
                    emailType = "flagged";
                    emailReplacements = {
                        OFFER_TYPE: offer.type,
                        CURRENCY: offer.currency,
                        FLAGGED_BY: adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin' : 'Admin',
                        REASON: body.adminNotes || "Flagged for review",
                        USER_NAME: offerUser ? `${offerUser.firstName || ''} ${offerUser.lastName || ''}`.trim() || 'User' : 'User',
                    };
                    break;
                case "DISABLED":
                    actionType = "OFFER_DISABLED";
                    shouldSendEmail = true;
                    emailType = "disabled";
                    emailReplacements = {
                        OFFER_TYPE: offer.type,
                        CURRENCY: offer.currency,
                        DISABLED_BY: adminUser ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin' : 'Admin',
                        REASON: body.adminNotes || "Disabled by admin",
                        USER_NAME: offerUser ? `${offerUser.firstName || ''} ${offerUser.lastName || ''}`.trim() || 'User' : 'User',
                    };
                    break;
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offer");
        await offer.update(updateData);
        if (body.paymentMethodIds && Array.isArray(body.paymentMethodIds)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating payment methods");
            try {
                const offerWithAssociations = await db_1.models.p2pOffer.findByPk(id);
                if (offerWithAssociations && offerWithAssociations.setPaymentMethods) {
                    await offerWithAssociations.setPaymentMethods(body.paymentMethodIds);
                }
                else {
                    await db_1.sequelize.query('DELETE FROM p2p_offer_payment_method WHERE offerId = :offerId', {
                        replacements: { offerId: id },
                        type: sequelize_1.QueryTypes.DELETE,
                    });
                    for (const methodId of body.paymentMethodIds) {
                        await db_1.sequelize.query('INSERT INTO p2p_offer_payment_method (offerId, paymentMethodId) VALUES (:offerId, :methodId)', {
                            replacements: { offerId: id, methodId: methodId },
                            type: sequelize_1.QueryTypes.INSERT,
                        });
                    }
                }
            }
            catch (pmError) {
                console_1.logger.error("P2P_OFFER", "Failed to update payment methods", pmError);
            }
        }
        if (shouldSendEmail && (offerUser === null || offerUser === void 0 ? void 0 : offerUser.email)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending email notification");
            try {
                switch (emailType) {
                    case "approval":
                        await (0, utils_1.sendOfferApprovalEmail)(offerUser.email, emailReplacements);
                        break;
                    case "rejection":
                        await (0, utils_1.sendOfferRejectionEmail)(offerUser.email, emailReplacements);
                        break;
                    case "flagged":
                        await (0, utils_1.sendOfferFlaggedEmail)(offerUser.email, emailReplacements);
                        break;
                    case "disabled":
                        await (0, utils_1.sendOfferDisabledEmail)(offerUser.email, emailReplacements);
                        break;
                }
            }
            catch (emailError) {
                console_1.logger.error("P2P_OFFER", "Failed to send email notification", emailError);
            }
        }
        if (body.status && body.status !== originalStatus && offerUser) {
            try {
                let notificationTitle = "";
                let notificationMessage = "";
                switch (body.status) {
                    case "ACTIVE":
                        notificationTitle = "Offer Approved";
                        notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been approved and is now active.`;
                        break;
                    case "REJECTED":
                        notificationTitle = "Offer Rejected";
                        notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been rejected. Reason: ${body.rejectionReason || "Does not meet requirements"}`;
                        break;
                    case "FLAGGED":
                        notificationTitle = "Offer Flagged";
                        notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been flagged for review.`;
                        break;
                    case "DISABLED":
                        notificationTitle = "Offer Disabled";
                        notificationMessage = `Your ${offer.type} offer for ${offer.currency} has been disabled by an administrator.`;
                        break;
                }
                if (notificationMessage) {
                    await (0, notifications_1.createNotification)({
                        userId: offerUser.id,
                        type: "system",
                        title: notificationTitle,
                        message: notificationMessage,
                        link: `/p2p/offer/${offer.id}`,
                    }, ctx);
                }
            }
            catch (notifError) {
                console_1.logger.error("P2P_OFFER", "Failed to create notification", notifError);
            }
        }
        const updatedOffer = await db_1.models.p2pOffer.findByPk(id);
        if (updatedOffer && offerUser) {
            updatedOffer.dataValues.user = offerUser.dataValues;
        }
        if (updatedOffer && body.paymentMethodIds && body.paymentMethodIds.length > 0) {
            try {
                const paymentMethods = await db_1.models.p2pPaymentMethod.findAll({
                    where: {
                        id: body.paymentMethodIds
                    },
                    attributes: ["id", "name", "icon"],
                    raw: true,
                });
                updatedOffer.dataValues.paymentMethods = paymentMethods;
            }
            catch (pmError) {
                console_1.logger.error("P2P_OFFER", "Failed to fetch payment methods", pmError);
                updatedOffer.dataValues.paymentMethods = [];
            }
        }
        else if (updatedOffer) {
            updatedOffer.dataValues.paymentMethods = [];
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin action");
        try {
            const { logP2PAdminAction } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/ownership")));
            const adminName = adminUser
                ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
                : 'Admin';
            await logP2PAdminAction(user.id, actionType, "OFFER", offer.id, {
                offerUserId: offer.userId,
                offerType: offer.type,
                currency: offer.currency,
                changes: Object.keys(updateData).filter(key => key !== 'activityLog'),
                updatedBy: adminName,
                statusChange: body.status && originalStatus !== body.status ? `${originalStatus} -> ${body.status}` : null,
            });
        }
        catch (logError) {
            console_1.logger.error("P2P_OFFER", "Failed to log admin action", logError);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer updated successfully");
        return {
            message: body.status && body.status !== originalStatus
                ? `Offer ${body.status.toLowerCase()} successfully`
                : "Offer updated successfully",
            data: updatedOffer,
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update offer");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: err.message || "Internal Server Error",
        });
    }
};
