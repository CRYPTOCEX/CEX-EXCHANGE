"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Get current user's P2P offers",
    description: "Retrieves all offers created by the authenticated user, including ACTIVE and PAUSED offers",
    operationId: "getUserP2POffers",
    tags: ["P2P", "Offers"],
    logModule: "P2P",
    logTitle: "Get user's offers",
    requiresAuth: true,
    responses: {
        200: {
            description: "User offers retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user's P2P offers");
    try {
        const offers = await db_1.models.p2pOffer.findAll({
            where: {
                userId: user.id,
                status: {
                    [sequelize_1.Op.in]: ["ACTIVE", "PAUSED", "PENDING_APPROVAL"],
                },
            },
            include: [
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
            ],
            order: [["createdAt", "DESC"]],
        });
        const processedOffers = offers.map((offer) => {
            const plain = offer.get({ plain: true });
            if (!plain.priceCurrency && plain.priceConfig) {
                plain.priceCurrency = plain.priceConfig.currency || "USD";
            }
            return plain;
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${processedOffers.length} user offers`);
        return processedOffers;
    }
    catch (error) {
        console_1.logger.error("P2P_OFFER", "Error fetching user P2P offers", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Failed to fetch user offers");
        throw (0, error_1.createError)(500, "Failed to fetch user offers");
    }
};
