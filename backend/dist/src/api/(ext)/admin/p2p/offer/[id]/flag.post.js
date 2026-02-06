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
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Flag P2P offer for review",
    description: "Flags a P2P offer for administrative review. Marks the offer as flagged with a reason and notifies the offer owner. Does not change the offer status.",
    operationId: "flagAdminP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    middleware: [Middleware_1.p2pAdminOfferRateLimit],
    logModule: "ADMIN_P2P",
    logTitle: "Flag P2P offer",
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
        description: "Reason for flagging",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string" },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Offer flagged successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { reason } = body;
    const { sanitizeInput } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/validation")));
    const { notifyOfferEvent } = await Promise.resolve().then(() => __importStar(require("../../../../p2p/utils/notifications")));
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching offer");
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email"],
                },
            ],
        });
        if (!offer) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting admin information");
        const adminUser = await db_1.models.user.findByPk(user.id, {
            attributes: ["id", "firstName", "lastName", "email"],
        });
        const sanitizedReason = sanitizeInput(reason);
        const adminName = adminUser
            ? `${adminUser.firstName || ''} ${adminUser.lastName || ''}`.trim() || 'Admin'
            : 'Admin';
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Flagging offer");
        await offer.update({
            adminNotes: `Flagged for review: ${sanitizedReason}`,
            activityLog: [
                ...(offer.activityLog || []),
                {
                    type: "FLAGGED",
                    reason: sanitizedReason,
                    adminId: user.id,
                    adminName: adminName,
                    createdAt: new Date().toISOString(),
                },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await (0, ownership_1.logP2PAdminAction)(user.id, "OFFER_FLAGGED", "OFFER", offer.id, {
            offerUserId: offer.userId,
            offerType: offer.type,
            currency: offer.currency,
            previousStatus: offer.status,
            reason: sanitizedReason,
            flaggedBy: adminName,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification");
        notifyOfferEvent(offer.id, "OFFER_FLAGGED", {
            reason: sanitizedReason,
            flaggedBy: adminName,
        }).catch((error) => console_1.logger.error("P2P", "Failed to send offer flagged notification", error));
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Offer flagged successfully");
        return {
            message: "Offer flagged successfully.",
            offer: {
                id: offer.id,
                isFlagged: true,
            }
        };
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to flag offer");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
