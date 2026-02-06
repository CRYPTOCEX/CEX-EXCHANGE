"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/admin/finance/exchange/market/utils");
const db_1 = require("@b/db");
const errors_1 = require("@b/utils/schema/errors");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Creates a new ecosystem market",
    description: "Creates a new ecosystem market with the specified currency and pair tokens. The endpoint validates that both tokens exist and are active, checks for duplicate markets, and stores the new market with trending/hot indicators and metadata. The market is created with active status by default.",
    operationId: "storeEcosystemMarket",
    tags: ["Admin", "Ecosystem", "Market"],
    logModule: "ADMIN_ECO",
    logTitle: "Create market",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.MarketUpdateSchema,
            },
        },
    },
    responses: {
        200: utils_1.MarketStoreSchema,
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Token"),
        409: (0, errors_1.conflictResponse)("Ecosystem Market"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "create.ecosystem.market",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { currency, pair, isTrending, isHot, metadata } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating currency token");
    const currencyToken = await db_1.models.ecosystemToken.findOne({
        where: {
            ...(currency.length > 10 ? { id: currency } : { currency: currency }),
            status: true
        },
    });
    if (!currencyToken) {
        throw (0, error_1.createError)(404, "Currency token not found or inactive");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating pair token");
    const pairToken = await db_1.models.ecosystemToken.findOne({
        where: {
            ...(pair.length > 10 ? { id: pair } : { currency: pair }),
            status: true
        },
    });
    if (!pairToken) {
        throw (0, error_1.createError)(404, "Pair token not found or inactive");
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing market");
    const existingMarket = await db_1.models.ecosystemMarket.findOne({
        where: {
            currency: currencyToken.currency,
            pair: pairToken.currency,
        },
    });
    if (existingMarket) {
        throw (0, error_1.createError)(409, "Ecosystem market with the given currency and pair already exists.");
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating market record");
        const result = await (0, query_1.storeRecord)({
            model: "ecosystemMarket",
            data: {
                currency: currencyToken.currency,
                pair: pairToken.currency,
                isTrending,
                isHot,
                metadata,
                status: true,
            },
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Market created successfully");
        return result;
    }
    catch (error) {
        if (error.name === "SequelizeUniqueConstraintError") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Market already exists");
            throw (0, error_1.createError)(409, "Ecosystem market already exists.");
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message);
        throw error;
    }
};
