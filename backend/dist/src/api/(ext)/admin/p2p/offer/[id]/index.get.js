"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Get P2P offer by ID",
    description: "Retrieves detailed information about a specific P2P offer including user details, payment methods, statistics, and pricing configuration.",
    operationId: "getAdminP2POfferById",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Get P2P Offer",
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
    responses: {
        200: { description: "Offer retrieved successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "view.p2p.offer",
    demoMask: ["user.email"],
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { id } = params;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching data");
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar", "createdAt"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
            ],
        });
        if (!offer) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        const stats = {
            totalTrades: 0,
            completedTrades: 0,
            avgCompletionTime: 0,
            successRate: 0,
        };
        const userStats = {
            totalOffers: await db_1.models.p2pOffer.count({ where: { userId: offer.userId } }),
            completedTrades: 0,
            rating: 0,
            disputes: 0,
        };
        const result = offer.toJSON();
        result.stats = stats;
        result.user = { ...result.user, stats: userStats };
        if (!result.priceCurrency && result.priceConfig) {
            result.priceCurrency = result.priceConfig.currency || "USD";
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Operation completed successfully");
        return result;
    }
    catch (err) {
        if (err.statusCode) {
            throw err;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
