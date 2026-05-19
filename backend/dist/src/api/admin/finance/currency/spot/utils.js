"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exchangeCurrencyUpdateSchema = exports.baseExchangeCurrencySchema = void 0;
const schema_1 = require("@b/utils/schema");
const currency = (0, schema_1.baseStringSchema)("Currency code, like USDT, ETH", 10);
const name = (0, schema_1.baseStringSchema)("Full name of the currency.", 100);
const precision = (0, schema_1.baseNumberSchema)("Number of decimal places to which this currency is accounted.");
const price = (0, schema_1.baseNumberSchema)("Current exchange rate relative to a base currency.", true);
const chains = {
    type: "object",
    description: "Supported blockchain networks for this currency.",
    additionalProperties: {
        type: "string",
        description: "Blockchain network name",
        maxLength: 50,
    },
};
const status = (0, schema_1.baseBooleanSchema)("Active status of the currency.");
exports.baseExchangeCurrencySchema = {
    currency,
    name,
    precision,
    price,
    chains,
    status,
};
exports.exchangeCurrencyUpdateSchema = {
    type: "object",
    properties: {
        name: {
            ...name,
            minLength: 1,
        },
        chains: chains,
    },
    required: ["name", "chains"],
};
