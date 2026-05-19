"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
const cache_1 = require("@b/utils/cache");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
exports.metadata = {
    summary: "Updates a specific exchange",
    operationId: "updateExchange",
    tags: ["Admin", "Exchanges"],
    parameters: [
        {
            index: 0,
            name: "productId",
            in: "path",
            description: "Product ID of the exchange to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the exchange",
        content: {
            "application/json": {
                schema: utils_1.exchangeUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Exchange"),
    requiresAuth: true,
    permission: "edit.exchange",
    logModule: "ADMIN_FIN",
    logTitle: "Update Exchange Provider",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { productId } = params;
    const { proxyUrl } = body;
    const exchange = await db_1.models.exchange.findOne({
        where: { id: productId },
    });
    if (!exchange) {
        throw new Error("Exchange not found");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating exchange provider");
    await exchange.update({ proxyUrl });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing cache");
    const cacheManager = cache_1.CacheManager.getInstance();
    await cacheManager.clearCache();
    if (exchange.name) {
        exchange_1.default.removeExchange(exchange.name);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return exchange;
};
