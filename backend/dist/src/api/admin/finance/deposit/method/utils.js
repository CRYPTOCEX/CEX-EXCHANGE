"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.methodSchema = exports.depositMethodUpdateSchema = exports.DepositMethodSchema = exports.baseDepositMethodSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the deposit method"),
    nullable: true,
};
const title = (0, schema_1.baseStringSchema)("Title of the deposit method");
const instructions = (0, schema_1.baseStringSchema)("Instructions for using the deposit method", 5000, 10);
const image = {
    ...(0, schema_1.baseStringSchema)("URL to an image representing the deposit method"),
    nullable: true,
};
const fixedFee = {
    ...(0, schema_1.baseNumberSchema)("Fixed transaction fee for the method"),
    nullable: true,
};
const percentageFee = {
    ...(0, schema_1.baseNumberSchema)("Percentage fee of the transaction amount"),
    nullable: true,
};
const minAmount = (0, schema_1.baseNumberSchema)("Minimum amount that can be deposited using this method");
const maxAmount = (0, schema_1.baseNumberSchema)("Maximum amount that can be deposited using this method");
const customFields = {
    description: "Custom JSON fields relevant to the deposit method",
    type: "array",
    items: {
        type: "object",
        required: ["title", "type"],
        properties: {
            title: {
                type: "string",
                description: "The title of the field",
            },
            type: {
                type: "string",
                description: "The type of the field (e.g., input)",
                enum: ["input", "textarea", "file", "image"],
            },
            required: {
                type: "boolean",
                description: "Whether the field is required or not",
                default: false,
            },
        },
    },
    nullable: true,
};
const status = (0, schema_1.baseBooleanSchema)("Current status of the deposit method (active or inactive)");
exports.baseDepositMethodSchema = {
    id,
    title,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
    status,
};
exports.DepositMethodSchema = {
    description: `Deposit method created successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseDepositMethodSchema,
            },
        },
    },
};
exports.depositMethodUpdateSchema = {
    type: "object",
    properties: {
        title,
        instructions,
        image,
        fixedFee,
        percentageFee,
        minAmount,
        maxAmount,
        customFields,
    },
    required: [
        "title",
        "instructions",
        "fixedFee",
        "percentageFee",
        "minAmount",
        "maxAmount",
    ],
};
exports.methodSchema = {
    type: "object",
    properties: { ...exports.baseDepositMethodSchema },
};
