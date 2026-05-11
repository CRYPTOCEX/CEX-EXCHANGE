"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const json_parser_1 = require("@b/api/(ext)/p2p/utils/json-parser");
const visibility_1 = require("@b/api/(ext)/p2p/utils/visibility");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/finance/currency/utils");
exports.metadata = {
    summary: "Submit Guided Matching Criteria",
    description: "Finds matching offers based on guided matching criteria provided by the authenticated user.",
    operationId: "submitP2PGuidedMatching",
    tags: ["P2P", "Guided Matching"],
    requiresAuth: true,
    logModule: "P2P_MATCHING",
    logTitle: "Submit guided matching criteria",
    requestBody: {
        description: "Guided matching criteria",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        tradeType: { type: "string", enum: ["buy", "sell"] },
                        cryptocurrency: { type: "string" },
                        amount: { type: "string" },
                        paymentMethods: { type: "array", items: { type: "string" } },
                        pricePreference: { type: "string" },
                        traderPreference: { type: "string" },
                        location: { type: "string" },
                    },
                    required: [
                        "tradeType",
                        "cryptocurrency",
                        "amount",
                        "paymentMethods",
                        "pricePreference",
                        "traderPreference",
                        "location",
                    ],
                },
            },
        },
    },
    responses: {
        200: { description: "Matching results retrieved successfully." },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
const calculateMatchScore = ({ price, bestPrice, completionRate, verified, methodOverlap, }) => {
    let score = 0;
    score +=
        bestPrice && price
            ? (1 - Math.abs((price - bestPrice) / bestPrice)) * 40
            : 0;
    score += (completionRate || 0) * 0.3;
    score += verified ? 20 : 0;
    score += methodOverlap ? 10 : 0;
    return Math.round(score);
};
async function getMarketPrice(currency, walletType) {
    switch (walletType) {
        case "FIAT":
            return (0, utils_1.getFiatPriceInUSD)(currency);
        case "SPOT":
            return (0, utils_1.getSpotPriceInUSD)(currency);
        case "ECO":
            return (0, utils_1.getEcoPriceInUSD)(currency);
        default:
            return null;
    }
}
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing matching criteria");
    try {
        const amount = parseFloat(body.amount) || 0;
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Finding ${body.tradeType} offers for ${body.cryptocurrency}`);
        const offers = await db_1.models.p2pOffer.findAll({
            where: {
                currency: body.cryptocurrency,
                type: body.tradeType.toUpperCase(),
                status: "ACTIVE",
                ...(body.location &&
                    body.location !== "any" && {
                    "locationSettings.country": body.location,
                }),
                [sequelize_1.Op.and]: [(0, visibility_1.publicVisibilityLiteral)()],
            },
            include: [
                {
                    model: db_1.models.p2pPaymentMethod,
                    as: "paymentMethods",
                    attributes: ["id", "name"],
                    through: { attributes: [] },
                },
                {
                    model: db_1.models.user,
                    as: "user",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "avatar",
                        "profile",
                        "emailVerified",
                    ],
                    include: [
                        {
                            model: db_1.models.p2pTrade,
                            as: "p2pTrades",
                            attributes: ["id", "status"],
                        },
                        {
                            model: db_1.models.p2pReview,
                            as: "p2pReviews",
                            attributes: ["communicationRating", "speedRating", "trustRating"],
                            where: {
                                revieweeId: { [sequelize_1.Op.col]: "user.id" }
                            },
                            required: false,
                        },
                    ],
                },
            ],
            limit: 30,
            order: [["priceConfig.finalPrice", "ASC"]],
        });
        if (!offers.length) {
            return {
                matches: [],
                matchCount: 0,
                estimatedSavings: 0,
                bestPrice: 0,
            };
        }
        const filteredOffers = amount
            ? offers.filter((offer) => {
                const priceConfig = (0, json_parser_1.parsePriceConfig)(offer.priceConfig);
                const amountCfg = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
                const finalPrice = priceConfig.finalPrice;
                if (!finalPrice || finalPrice <= 0)
                    return true;
                const amountInPriceCurrency = amount * finalPrice;
                const minOk = !amountCfg.min || amountInPriceCurrency >= amountCfg.min;
                const maxOk = !amountCfg.max || amountInPriceCurrency <= amountCfg.max;
                return minOk && maxOk;
            })
            : offers;
        if (!filteredOffers.length) {
            return {
                matches: [],
                matchCount: 0,
                estimatedSavings: 0,
                bestPrice: 0,
            };
        }
        const prices = filteredOffers.map((o) => {
            const priceConfig = (0, json_parser_1.parsePriceConfig)(o.priceConfig);
            return priceConfig.finalPrice;
        });
        const bestPrice = body.tradeType === "buy" ? Math.min(...prices) : Math.max(...prices);
        let marketPrice = null;
        try {
            marketPrice = await getMarketPrice(body.cryptocurrency, filteredOffers[0].walletType);
        }
        catch (e) {
            marketPrice = prices.reduce((a, b) => a + b, 0) / (prices.length || 1);
        }
        const userMethodIds = new Set(body.paymentMethods);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Scoring and ranking ${filteredOffers.length} matching offers`);
        const scoredOffers = filteredOffers.map((offer) => {
            var _a;
            const priceConfig = (0, json_parser_1.parsePriceConfig)(offer.priceConfig);
            const amountConfig = (0, json_parser_1.parseAmountConfig)(offer.amountConfig);
            const paymentMethods = (offer.paymentMethods || []).map((pm) => pm.name);
            const offerMethodIds = (offer.paymentMethods || []).map((pm) => pm.id);
            const methodOverlap = offerMethodIds.some((id) => userMethodIds.has(id))
                ? 1
                : 0;
            const trader = offer.user;
            let traderName = (trader === null || trader === void 0 ? void 0 : trader.firstName) || "Trader";
            if (trader === null || trader === void 0 ? void 0 : trader.lastName)
                traderName += " " + trader.lastName;
            const trades = (trader === null || trader === void 0 ? void 0 : trader.p2pTrades) || [];
            const completed = trades.filter((t) => t.status === "COMPLETED").length;
            const total = trades.length || 1;
            const completionRate = Math.round((completed / total) * 100);
            const reviews = (trader === null || trader === void 0 ? void 0 : trader.p2pReviews) || [];
            let avgRating = 0;
            if (reviews.length > 0) {
                avgRating =
                    reviews.reduce((sum, r) => sum +
                        (r.communicationRating || 0) +
                        (r.speedRating || 0) +
                        (r.trustRating || 0), 0) /
                        (reviews.length * 3);
                avgRating = Math.round(avgRating * 10) / 10;
            }
            const verified = !!(trader === null || trader === void 0 ? void 0 : trader.emailVerified);
            return {
                id: offer.id,
                type: offer.type.toLowerCase(),
                coin: offer.currency,
                walletType: offer.walletType,
                price: priceConfig.finalPrice,
                minLimit: amountConfig.min,
                maxLimit: amountConfig.max,
                availableAmount: amountConfig.availableBalance || amountConfig.total,
                paymentMethods,
                matchScore: calculateMatchScore({
                    price: priceConfig.finalPrice,
                    bestPrice,
                    completionRate,
                    verified,
                    methodOverlap,
                }),
                trader: {
                    id: trader === null || trader === void 0 ? void 0 : trader.id,
                    name: traderName,
                    avatar: trader === null || trader === void 0 ? void 0 : trader.avatar,
                    completedTrades: completed,
                    completionRate,
                    verified,
                    responseTime: 5,
                    avgRating,
                },
                benefits: [
                    completionRate > 90 ? "High completion rate" : "Solid completion",
                    avgRating > 90 ? "Highly rated" : "Community trusted",
                    methodOverlap ? "Your preferred payment method" : "Flexible payments",
                    verified ? "KYC Verified" : "Active user",
                ],
                location: ((_a = offer.locationSettings) === null || _a === void 0 ? void 0 : _a.country) || "Global",
                createdAt: offer.createdAt,
                updatedAt: offer.updatedAt,
            };
        });
        scoredOffers.sort((a, b) => b.matchScore - a.matchScore);
        let estimatedSavings = 0;
        if (marketPrice && bestPrice) {
            if (body.tradeType === "buy") {
                estimatedSavings = (marketPrice - bestPrice) * amount;
            }
            else if (body.tradeType === "sell") {
                estimatedSavings = (bestPrice - marketPrice) * amount;
            }
            estimatedSavings =
                Math.round((estimatedSavings + Number.EPSILON) * 100) / 100;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${scoredOffers.length} matching offers (savings: ${estimatedSavings})`);
        return {
            matches: scoredOffers,
            matchCount: scoredOffers.length,
            estimatedSavings,
            bestPrice,
        };
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
