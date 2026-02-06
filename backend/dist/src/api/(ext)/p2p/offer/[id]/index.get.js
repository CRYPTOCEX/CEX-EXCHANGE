"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get P2P Offer by ID",
    description: "Retrieves detailed offer data by its ID, including computed seller metrics and ratings.",
    operationId: "getP2POfferById",
    tags: ["P2P", "Offer"],
    logModule: "P2P",
    logTitle: "Get offer by ID",
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
        404: { description: "Offer not found." },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: false,
};
exports.default = async (data) => {
    const { id } = data.params || {};
    const { ctx } = data || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching offer details");
    try {
        const offer = await db_1.models.p2pOffer.findByPk(id, {
            include: [
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: ["id", "firstName", "lastName", "email", "avatar"],
                },
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name", "icon"],
                    through: { attributes: [] },
                },
                {
                    model: db_1.models.p2pOfferFlag,
                    as: "flag",
                    attributes: ["id", "isFlagged", "reason", "flaggedAt"],
                },
            ],
        });
        if (!offer) {
            return { error: "Offer not found" };
        }
        const plain = offer.get({ plain: true });
        const sellerId = plain.user.id;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating seller metrics");
        if (!plain.priceCurrency && plain.priceConfig) {
            plain.priceCurrency = plain.priceConfig.currency || "USD";
        }
        const totalTrades = await db_1.models.p2pTrade.count({ where: { sellerId } });
        const completedTrades = await db_1.models.p2pTrade.count({
            where: { sellerId, status: "COMPLETED" },
        });
        const volume = (await db_1.models.p2pTrade.sum("amount", {
            where: { sellerId, status: "COMPLETED" },
        })) || 0;
        const completionRate = totalTrades
            ? Math.round((completedTrades / totalTrades) * 100)
            : 0;
        const resp = await db_1.models.p2pTrade.findOne({
            where: { sellerId, paymentConfirmedAt: { [sequelize_1.Op.ne]: null } },
            attributes: [
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.literal)("TIMESTAMPDIFF(MINUTE, `createdAt`, `paymentConfirmedAt`)")),
                    "avgResponseTime",
                ],
            ],
            raw: true,
        });
        const avgResponseTime = (resp === null || resp === void 0 ? void 0 : resp.avgResponseTime)
            ? Math.round(resp.avgResponseTime)
            : null;
        const ratings = await db_1.models.p2pReview.findOne({
            where: { revieweeId: sellerId },
            attributes: [
                [
                    (0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("communicationRating")),
                    "avgCommunication",
                ],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("speedRating")), "avgSpeed"],
                [(0, sequelize_1.fn)("AVG", (0, sequelize_1.col)("trustRating")), "avgTrust"],
            ],
            raw: true,
        });
        const avgCommunication = (ratings === null || ratings === void 0 ? void 0 : ratings.avgCommunication) != null
            ? Math.round(ratings.avgCommunication)
            : null;
        const avgSpeed = (ratings === null || ratings === void 0 ? void 0 : ratings.avgSpeed) != null ? Math.round(ratings.avgSpeed) : null;
        const avgTrust = (ratings === null || ratings === void 0 ? void 0 : ratings.avgTrust) != null ? Math.round(ratings.avgTrust) : null;
        const avgOverall = avgCommunication != null && avgSpeed != null && avgTrust != null
            ? Math.round((avgCommunication + avgSpeed + avgTrust) / 3)
            : null;
        plain.user.stats = {
            totalTrades,
            volume,
            completionRate,
            avgResponseTime,
            ratings: {
                communication: avgCommunication,
                speed: avgSpeed,
                trust: avgTrust,
                overall: avgOverall,
            },
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved offer ${id.slice(0, 8)}...`);
        return plain;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve offer");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
