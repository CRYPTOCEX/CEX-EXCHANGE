"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BinaryMarketUpdateSchema = exports.BinaryMarketStoreSchema = exports.binaryMarketSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the binary market");
const currency = (0, schema_1.baseStringSchema)("Trading currency of the binary market", 191);
const pair = (0, schema_1.baseStringSchema)("Trading pair of the binary market", 191);
const isTrending = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the binary market is currently trending"),
    nullable: true,
};
const isHot = {
    ...(0, schema_1.baseBooleanSchema)("Indicates if the binary market is considered 'hot'"),
    nullable: true,
};
const status = (0, schema_1.baseBooleanSchema)("Operational status of the binary market");
const source = {
    type: "string",
    enum: ["EXCHANGE", "ECOSYSTEM"],
    description: "Price feed backing this market. EXCHANGE reads the centralized exchange; ECOSYSTEM reads the ecosystem market (and its AI Market Maker, when one is running). Omit to auto-detect.",
    nullable: true,
};
exports.binaryMarketSchema = {
    id,
    currency,
    pair,
    source,
    isTrending,
    isHot,
    status,
};
exports.BinaryMarketStoreSchema = {
    type: "object",
    properties: {
        currency,
        pair,
        source,
        isTrending,
        isHot,
        status,
    },
    required: ["currency", "pair", "status"],
};
exports.BinaryMarketUpdateSchema = {
    type: "object",
    properties: {
        currency,
        pair,
        source,
        isTrending,
        isHot,
        status,
    },
    required: ["currency", "pair"],
};
