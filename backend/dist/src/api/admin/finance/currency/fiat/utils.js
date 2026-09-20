"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fiatCurrencyStoreSchema = exports.fiatCurrencyUpdateSchema = exports.baseFiatCurrencySchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the created currency");
const name = (0, schema_1.baseStringSchema)("Name of the created currency", 100);
const symbol = (0, schema_1.baseStringSchema)("Symbol of the created currency", 10);
const precision = (0, schema_1.baseNumberSchema)("Precision of the created currency values");
const price = (0, schema_1.baseNumberSchema)("Current price of the created currency", true);
const status = (0, schema_1.baseBooleanSchema)("Status of the created currency");
exports.baseFiatCurrencySchema = {
    id,
    name,
    symbol,
    precision,
    price,
    status,
};
exports.fiatCurrencyUpdateSchema = {
    type: "object",
    properties: {
        price: {
            ...price,
            minimum: 0,
        },
    },
    required: ["price"],
};
exports.fiatCurrencyStoreSchema = {
    description: `Currency created successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseFiatCurrencySchema,
            },
        },
    },
};
