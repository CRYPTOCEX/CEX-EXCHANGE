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
const error_1 = require("@b/utils/error");
const Middleware_1 = require("@b/handler/Middleware");
const ownership_1 = require("../../../../p2p/utils/ownership");
const console_1 = require("@b/utils/console");
const json_parser_1 = require("../../../../p2p/utils/json-parser");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Approve P2P offer",
    description: "Approves a pending P2P offer and sets it to ACTIVE status. Validates offer requirements (amount, payment methods) and sends approval notification to the offer owner.",
    operationId: "approveAdminP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminOfferRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Approve P2P offer",
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
        description: "Optional notes for approval",
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        notes: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Offer approved successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { notes } = body;
    const { sanitizeInput, validateOfferStatusTransition } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/validation")));
    const { notifyOfferEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching offer");
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    through: { attributes: [] },
                }
            ],
            lock: true,
            transaction,
        });
        if (!offer) {
            await transaction.rollback();
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting admin information");
        const adminUser = await db_1.models.user.findByPk(user.id, {
            attributes: ["id", "firstName", "lastName", "email"],
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offer status transition");
        if (!validateOfferStatusTransition(offer.status, "ACTIVE")) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Cannot approve offer from status: ${offer.status}`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot approve offer from status: ${offer.status}`
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offer requirements");
        const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
        if (!amountConfig.total || amountConfig.total <= 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer has invalid amount");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot approve offer with zero or invalid amount"
            });
        }
        if (!offer.paymentMethods || offer.paymentMethods.length === 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer has no payment methods");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Cannot approve offer without payment methods"
            });
        }
        const sanitizedNotes = notes ? sanitizeInput(notes) : null;
        const adminName = adminUser
            ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
            : 'Admin';
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Approving offer");
        await offer.update({
            status: "ACTIVE",
            adminNotes: sanitizedNotes,
            activityLog: [
                ...(offer.activityLog || []),
                {
                    type: "APPROVAL",
                    adminId: user.id,
                    adminName: adminName,
                    createdAt: new Date().toISOString(),
                },
            ],
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await (0, ownership_1.logP2PAdminAction)(user.id, "OFFER_APPROVED", "OFFER", offer.id, {
            offerUserId: offer.userId,
            offerType: offer.type,
            currency: offer.currency,
            amount: amountConfig.total,
            previousStatus: offer.status,
            adminNotes: sanitizedNotes,
            approvedBy: adminName,
        });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
        notifyOfferEvent(offer.id, "OFFER_APPROVED", {
            adminNotes: sanitizedNotes,
            approvedBy: adminName,
        }).catch((error) => console_1.logger.error("P2P", "Failed to send offer approved notification", error));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer approved successfully");
        return {
            message: "Offer approved successfully.",
            offer: {
                id: offer.id,
                status: "ACTIVE",
            }
        };
    }
    catch (err) {
        try {
            await transaction.rollback();
        }
        catch (_) { }
        if (err.statusCode)
            throw err;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to approve offer");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to approve offer: " + err.message,
        });
    }
};
