"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const sequelize_1 = require("sequelize");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "List Payment Methods",
    description: "Retrieves a list of available payment methods using the payment methods model.",
    operationId: "listPaymentMethods",
    tags: ["P2P", "Payment Method"],
    logModule: "P2P",
    logTitle: "List payment methods",
    responses: {
        200: { description: "Payment methods retrieved successfully." },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching payment methods");
    try {
        const globalMethods = await db_1.models.p2pPaymentMethod.findAll({
            where: {
                available: true,
                [sequelize_1.Op.or]: [
                    { isGlobal: true },
                    { userId: null }
                ]
            },
            order: [
                ["isGlobal", "DESC"],
                ["popularityRank", "ASC"],
                ["name", "ASC"]
            ],
            raw: true,
        });
        let userMethods = [];
        if (user === null || user === void 0 ? void 0 : user.id) {
            userMethods = await db_1.models.p2pPaymentMethod.findAll({
                where: {
                    userId: user.id,
                    available: true,
                },
                order: [
                    ["popularityRank", "ASC"],
                    ["name", "ASC"]
                ],
                raw: true,
            });
            const userMethodIds = userMethods.map(m => m.id);
            if (userMethodIds.length > 0) {
                const activeTradesWithMethods = await db_1.models.p2pTrade.findAll({
                    where: {
                        status: { [sequelize_1.Op.in]: ["PENDING", "PAYMENT_SENT", "DISPUTED"] },
                        paymentMethod: { [sequelize_1.Op.in]: userMethodIds }
                    },
                    attributes: ["paymentMethod"],
                    raw: true,
                });
                const lockedByTradeIds = new Set(activeTradesWithMethods.map((t) => t.paymentMethod));
                const activeOffersWithMethods = await db_1.models.p2pOffer.findAll({
                    include: [
                        {
                            model: db_1.models.p2pPaymentMethod,
                            as: "paymentMethods",
                            where: { id: { [sequelize_1.Op.in]: userMethodIds } },
                            attributes: ["id"],
                            through: { attributes: [] },
                        },
                    ],
                    where: {
                        status: { [sequelize_1.Op.in]: ["ACTIVE", "PENDING_APPROVAL", "PAUSED"] },
                    },
                    attributes: ["id"],
                });
                const lockedByOfferIds = new Set();
                for (const offer of activeOffersWithMethods) {
                    const paymentMethods = offer.paymentMethods || [];
                    for (const pm of paymentMethods) {
                        lockedByOfferIds.add(pm.id);
                    }
                }
                userMethods = userMethods.map(method => {
                    const hasActiveTrade = lockedByTradeIds.has(method.id);
                    const hasActiveOffer = lockedByOfferIds.has(method.id);
                    return {
                        ...method,
                        icon: null,
                        isCustom: true,
                        isGlobal: false,
                        isSystem: false,
                        canEdit: !hasActiveTrade,
                        canDelete: !hasActiveTrade && !hasActiveOffer,
                        hasActiveTrade,
                        hasActiveOffer,
                        usageInfo: hasActiveTrade || hasActiveOffer ? {
                            inActiveTrade: hasActiveTrade,
                            inActiveOffer: hasActiveOffer,
                        } : null,
                    };
                });
            }
        }
        const globalMethodsWithMetadata = globalMethods.map(method => ({
            ...method,
            isCustom: false,
            isGlobal: method.isGlobal === true || method.isGlobal === 1,
            isSystem: method.userId === null && !method.isGlobal,
            canEdit: false,
            canDelete: false,
            hasActiveTrade: false,
        }));
        console_1.logger.info("P2P_PAYMENT_METHOD", `Found ${globalMethods.length} global/system and ${userMethods.length} custom methods for user ${(user === null || user === void 0 ? void 0 : user.id) || 'anonymous'}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${globalMethods.length} global and ${userMethods.length} custom methods`);
        return {
            global: globalMethodsWithMetadata,
            custom: userMethods,
        };
    }
    catch (err) {
        console_1.logger.error("P2P_PAYMENT_METHOD", "Error fetching payment methods", err);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to fetch payment methods");
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error: " + err.message });
    }
};
