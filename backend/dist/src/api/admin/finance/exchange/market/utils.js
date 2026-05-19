"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MarketStoreSchema = exports.MarketUpdateSchema = exports.baseMarketSchema = exports.marketSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the market");
const currency = (0, schema_1.baseStringSchema)("Trading currency of the market", 191);
const pair = (0, schema_1.baseStringSchema)("Trading pair of the market", 191);
const isTrending = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the market is currently trending"),
    nullable: true,
};
const isHot = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the market is considered 'hot'"),
    nullable: true,
};
const metadata = {
    type: "object",
    nullable: true,
    properties: {
        precision: {
            type: "object",
            properties: {
                amount: (0, schema_1.baseNumberSchema)("Amount precision"),
                price: (0, schema_1.baseNumberSchema)("Price precision"),
            },
        },
        limits: {
            type: "object",
            properties: {
                amount: {
                    type: "object",
                    properties: {
                        min: (0, schema_1.baseNumberSchema)("Minimum amount"),
                        max: (0, schema_1.baseNumberSchema)("Maximum amount", true),
                    },
                },
                price: {
                    type: "object",
                    properties: {
                        min: (0, schema_1.baseNumberSchema)("Minimum price", true),
                        max: (0, schema_1.baseNumberSchema)("Maximum price", true),
                    },
                },
                cost: {
                    type: "object",
                    properties: {
                        min: (0, schema_1.baseNumberSchema)("Minimum cost"),
                        max: (0, schema_1.baseNumberSchema)("Maximum cost"),
                    },
                },
                leverage: {
                    type: "object",
                    properties: {
                        type: (0, schema_1.baseStringSchema)("Leverage type", 50, 0, true),
                        value: (0, schema_1.baseNumberSchema)("Leverage value", true),
                    },
                },
            },
        },
        taker: (0, schema_1.baseNumberSchema)("Taker fee"),
        maker: (0, schema_1.baseNumberSchema)("Maker fee"),
    },
};
const status = (0, schema_1.baseBooleanSchema)("Operational status of the market");
exports.marketSchema = {
    id,
    currency,
    pair,
    isTrending,
    isHot,
    metadata,
    status,
};
exports.baseMarketSchema = {
    id,
    currency,
    pair,
    isTrending,
    isHot,
    metadata,
    status,
};
exports.MarketUpdateSchema = {
    type: "object",
    properties: {
        currency,
        pair,
        isTrending,
        isHot,
        metadata,
    },
};
exports.MarketStoreSchema = {
    description: `Market created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseMarketSchema,
            },
        },
    },
};
