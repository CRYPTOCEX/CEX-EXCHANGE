"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.gatewayUpdateSchema = exports.baseGatewaySchema = void 0;
const schema_1 = require("@b/utils/schema");
const name = (0, schema_1.baseStringSchema)("Name of the deposit gateway", 100);
const title = (0, schema_1.baseStringSchema)("Title of the deposit gateway", 100);
const description = (0, schema_1.baseStringSchema)("Description of the deposit gateway", 500);
const image = (0, schema_1.baseStringSchema)("URL to an image representing the deposit gateway", 255, 0, true);
const fixedFee = {
    ...(0, schema_1.baseNumberSchema)("Fixed fee for transactions through this gateway"),
    nullable: true,
    minimum: 0,
};
const percentageFee = {
    ...(0, schema_1.baseNumberSchema)("Percentage fee for transactions through this gateway"),
    nullable: true,
    minimum: 0,
    maximum: 100,
};
const minAmount = {
    ...(0, schema_1.baseNumberSchema)("Minimum amount allowed through this gateway"),
    nullable: true,
    minimum: 0,
};
const maxAmount = {
    ...(0, schema_1.baseNumberSchema)("Maximum amount allowed through this gateway"),
    nullable: true,
    minimum: 0,
};
const status = (0, schema_1.baseBooleanSchema)("Current status of the deposit gateway (active or inactive)");
exports.baseGatewaySchema = {
    id: {
        ...(0, schema_1.baseStringSchema)("ID of the deposit gateway"),
        nullable: true,
    },
    name,
    title,
    description,
    image,
    alias: {
        ...(0, schema_1.baseStringSchema)("Unique alias for the deposit gateway"),
        nullable: true,
    },
    currencies: {
        type: "object",
        description: "Supported currencies in JSON format",
        nullable: true,
    },
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    type: {
        ...(0, schema_1.baseStringSchema)("Type of the deposit gateway"),
        nullable: true,
    },
    status,
    version: {
        ...(0, schema_1.baseStringSchema)("Version of the deposit gateway"),
        nullable: true,
    },
    productId: {
        ...(0, schema_1.baseStringSchema)("Product ID associated with the deposit gateway"),
        nullable: true,
    },
};
exports.gatewayUpdateSchema = {
    type: "object",
    properties: {
        title,
        description,
        image,
        alias: {
            ...(0, schema_1.baseStringSchema)("Unique alias for the deposit gateway"),
            nullable: true,
        },
        currencies: {
            type: "array",
            items: { type: "string" },
            description: "Supported currencies array",
            nullable: true,
        },
        fixedFee: {
            oneOf: [
                {
                    type: "null"
                },
                {
                    type: "number",
                    minimum: 0,
                    description: "Global fixed fee for all currencies"
                },
                {
                    type: "object",
                    patternProperties: {
                        "^[A-Z]{3,4}$": {
                            type: "number",
                            minimum: 0
                        }
                    },
                    additionalProperties: false,
                    description: "Currency-specific fixed fees"
                }
            ]
        },
        percentageFee: {
            oneOf: [
                {
                    type: "null"
                },
                {
                    type: "number",
                    minimum: 0,
                    maximum: 100,
                    description: "Global percentage fee for all currencies"
                },
                {
                    type: "object",
                    patternProperties: {
                        "^[A-Z]{3,4}$": {
                            type: "number",
                            minimum: 0,
                            maximum: 100
                        }
                    },
                    additionalProperties: false,
                    description: "Currency-specific percentage fees"
                }
            ]
        },
        minAmount: {
            oneOf: [
                {
                    type: "null"
                },
                {
                    type: "number",
                    minimum: 0,
                    description: "Global minimum amount for all currencies"
                },
                {
                    type: "object",
                    patternProperties: {
                        "^[A-Z]{3,4}$": {
                            type: "number",
                            minimum: 0
                        }
                    },
                    additionalProperties: false,
                    description: "Currency-specific minimum amounts"
                }
            ]
        },
        maxAmount: {
            oneOf: [
                {
                    type: "null"
                },
                {
                    type: "number",
                    minimum: 0,
                    description: "Global maximum amount for all currencies"
                },
                {
                    type: "object",
                    patternProperties: {
                        "^[A-Z]{3,4}$": {
                            type: "number",
                            minimum: 0
                        }
                    },
                    additionalProperties: false,
                    description: "Currency-specific maximum amounts"
                }
            ]
        },
        status,
    },
    required: ["title", "description"],
};
