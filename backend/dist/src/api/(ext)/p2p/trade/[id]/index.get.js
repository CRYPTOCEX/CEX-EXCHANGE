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
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Get Trade by ID",
    description: "Retrieves detailed trade data for the given trade ID.",
    operationId: "getP2PTradeById",
    tags: ["P2P", "Trade"],
    logModule: "P2P",
    logTitle: "Get trade by ID",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Trade ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Trade retrieved successfully." },
        401: query_1.unauthorizedResponse,
        404: { description: "Trade not found." },
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { id } = data.params || {};
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying trade access");
    try {
        const tradeExists = await db_1.models.p2pTrade.findOne({
            where: { id },
            attributes: ['id', 'buyerId', 'sellerId'],
        });
        if (!tradeExists) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        const isParticipant = tradeExists.buyerId === user.id ||
            tradeExists.sellerId === user.id;
        if (!isParticipant) {
            throw (0, error_1.createError)({ statusCode: 403, message: "You don't have permission to view this trade" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching trade details with counterparty info");
        const trade = await db_1.models.p2pTrade.findOne({
            where: { id },
            include: [
                { association: "buyer", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
                { association: "seller", attributes: ["id", "firstName", "lastName", "email", "avatar"] },
                { association: "dispute" },
                {
                    association: "paymentMethodDetails",
                    attributes: ["id", "name", "icon", "processingTime", "instructions"],
                    required: false
                },
                {
                    association: "offer",
                    attributes: ["id", "currency", "priceCurrency", "walletType", "type", "tradeSettings"],
                    required: false
                },
            ],
        });
        if (!trade) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Trade not found" });
        }
        const tradeData = trade.toJSON();
        const getCounterpartyStats = async (userId) => {
            const totalTrades = await db_1.models.p2pTrade.count({
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }],
                    status: { [sequelize_1.Op.in]: ["COMPLETED", "DISPUTE_RESOLVED", "CANCELLED", "EXPIRED"] },
                },
            });
            const completedTrades = await db_1.models.p2pTrade.count({
                where: {
                    [sequelize_1.Op.or]: [{ buyerId: userId }, { sellerId: userId }],
                    status: "COMPLETED",
                },
            });
            const completionRate = totalTrades > 0 ? Math.round((completedTrades / totalTrades) * 100) : 100;
            return { completedTrades, completionRate };
        };
        if (tradeData.buyer) {
            tradeData.buyer.name = `${tradeData.buyer.firstName || ''} ${tradeData.buyer.lastName || ''}`.trim();
            const buyerStats = await getCounterpartyStats(tradeData.buyer.id);
            tradeData.buyer.completedTrades = buyerStats.completedTrades;
            tradeData.buyer.completionRate = buyerStats.completionRate;
        }
        if (tradeData.seller) {
            tradeData.seller.name = `${tradeData.seller.firstName || ''} ${tradeData.seller.lastName || ''}`.trim();
            const sellerStats = await getCounterpartyStats(tradeData.seller.id);
            tradeData.seller.completedTrades = sellerStats.completedTrades;
            tradeData.seller.completionRate = sellerStats.completionRate;
        }
        if (tradeData.paymentDetails && typeof tradeData.paymentDetails === "string") {
            try {
                tradeData.paymentDetails = JSON.parse(tradeData.paymentDetails);
            }
            catch (_f) {
            }
        }
        if (tradeData.timeline && typeof tradeData.timeline === "string") {
            try {
                tradeData.timeline = JSON.parse(tradeData.timeline);
            }
            catch (_g) {
            }
        }
        if (((_a = tradeData.offer) === null || _a === void 0 ? void 0 : _a.tradeSettings) && typeof tradeData.offer.tradeSettings === "string") {
            try {
                tradeData.offer.tradeSettings = JSON.parse(tradeData.offer.tradeSettings);
            }
            catch (_h) {
            }
        }
        const { CacheManager } = await Promise.resolve().then(() => __importStar(require("@b/utils/cache")));
        const cacheManager = CacheManager.getInstance();
        const defaultPaymentWindow = await cacheManager.getSetting("p2pDefaultPaymentWindow") || 240;
        tradeData.paymentWindow = ((_c = (_b = tradeData.offer) === null || _b === void 0 ? void 0 : _b.tradeSettings) === null || _c === void 0 ? void 0 : _c.autoCancel) ||
            ((_e = (_d = tradeData.offer) === null || _d === void 0 ? void 0 : _d.tradeSettings) === null || _e === void 0 ? void 0 : _e.paymentWindow) ||
            defaultPaymentWindow;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved trade ${id.slice(0, 8)}... (${tradeData.status})`);
        return tradeData;
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(err.message || "Failed to retrieve trade");
        throw (0, error_1.createError)({ statusCode: 500, message: err.message || "Internal Server Error" });
    }
};
