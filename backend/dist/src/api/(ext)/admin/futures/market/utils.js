"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FuturesMarketStoreSchema = exports.FuturesMarketUpdateSchema = exports.baseFuturesMarketSchema = exports.futuresMarketSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the futures market");
const currency = (0, schema_1.baseStringSchema)("Trading currency of the futures market", 191);
const pair = (0, schema_1.baseStringSchema)("Trading pair of the futures market", 191);
const isTrending = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the futures market is currently trending"),
    nullable: true,
};
const isHot = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the futures market is considered 'hot'"),
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
                leverage: (0, schema_1.baseStringSchema)("Leverage"),
            },
        },
        taker: (0, schema_1.baseNumberSchema)("Taker fee"),
        maker: (0, schema_1.baseNumberSchema)("Maker fee"),
    },
};
const status = (0, schema_1.baseBooleanSchema)("Operational status of the futures market");
exports.futuresMarketSchema = {
    id,
    currency,
    pair,
    isTrending,
    isHot,
    metadata,
    status,
};
exports.baseFuturesMarketSchema = {
    id,
    currency,
    pair,
    isTrending,
    isHot,
    metadata,
    status,
};
exports.FuturesMarketUpdateSchema = {
    type: "object",
    properties: {
        isTrending,
        isHot,
        metadata,
    },
};
exports.FuturesMarketStoreSchema = {
    description: `Futures Market created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseFuturesMarketSchema,
            },
        },
    },
};
