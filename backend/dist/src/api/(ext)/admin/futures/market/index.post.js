"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("./utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Creates a new futures market",
    operationId: "storeFuturesMarket",
    tags: ["Admin", "Futures", "Market"],
    description: "Creates a new futures trading market by pairing two active ecosystem tokens. Validates that both tokens exist and are active, and ensures the market pair doesn't already exist.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.FuturesMarketUpdateSchema,
            },
        },
    },
    responses: {
        200: {
            description: "Futures market created successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: utils_1.baseFuturesMarketSchema,
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Currency or Pair Token"),
        409: (0, errors_1.conflictResponse)("Futures Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.futures.market",
    logModule: "ADMIN_FUTURES",
    logTitle: "Create futures market",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { currency, pair, isTrending, isHot, metadata } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency token");
    const currencyToken = await db_1.models.ecosystemToken.findOne({
        where: { id: currency, status: true },
    });
    if (!currencyToken) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Currency token not found or inactive");
        throw (0, error_1.createError)(404, "Currency token not found or inactive");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating pair token");
    const pairToken = await db_1.models.ecosystemToken.findOne({
        where: { id: pair, status: true },
    });
    if (!pairToken) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Pair token not found or inactive");
        throw (0, error_1.createError)(404, "Pair token not found or inactive");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing market");
    const existingMarket = await db_1.models.futuresMarket.findOne({
        where: {
            currency: currencyToken.currency,
            pair: pairToken.currency,
        },
    });
    if (existingMarket) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Futures market already exists");
        throw (0, error_1.createError)(409, "Futures market with the given currency and pair already exists.");
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating futures market");
        const result = await (0, query_1.storeRecord)({
            model: "futuresMarket",
            data: {
                currency: currencyToken.currency,
                pair: pairToken.currency,
                isTrending,
                isHot,
                metadata,
                status: true,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Futures market created successfully");
        return result;
    }
    catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unique constraint violation");
            throw (0, error_1.createError)(409, "Futures market already exists.");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to create futures market: ${error.message}`);
        throw error;
    }
};
