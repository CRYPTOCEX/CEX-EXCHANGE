"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withdrawalMethodStoreSchema = exports.withdrawalMethodUpdateSchema = exports.baseWithdrawMethodSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the withdrawal method"),
    nullable: true,
};
const title = (0, schema_1.baseStringSchema)("Title of the withdrawal method");
const processingTime = (0, schema_1.baseStringSchema)("Expected processing time for the method");
const instructions = (0, schema_1.baseStringSchema)("Instructions for using the withdrawal method");
const image = {
    ...(0, schema_1.baseStringSchema)("URL to an image representing the withdrawal method"),
    nullable: true,
};
const fixedFee = (0, schema_1.baseNumberSchema)("Fixed transaction fee for the method");
const percentageFee = (0, schema_1.baseNumberSchema)("Percentage fee of the transaction amount");
const minAmount = (0, schema_1.baseNumberSchema)("Minimum amount that can be collected using this method");
const maxAmount = {
    ...(0, schema_1.baseNumberSchema)("Maximum amount that can be collected using this method"),
    nullable: true,
};
const customFields = {
    description: "Custom JSON fields relevant to the withdrawal method",
    type: "array",
    items: {
        type: "object",
        required: ["title", "type"],
        properties: {
            title: {
                type: "string",
                description: "The title of the field",
                nullable: false,
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
const status = {
    ...(0, schema_1.baseBooleanSchema)("Current status of the withdrawal method (active or inactive)"),
    nullable: true,
};
exports.baseWithdrawMethodSchema = {
    id,
    title,
    processingTime,
    instructions,
    image,
    fixedFee,
    percentageFee,
    minAmount,
    maxAmount,
    customFields,
    status,
};
exports.withdrawalMethodUpdateSchema = {
    type: "object",
    properties: {
        title,
        processingTime,
        instructions,
        image,
        fixedFee,
        percentageFee,
        minAmount,
        maxAmount,
        customFields,
        status,
    },
    required: [
        "title",
        "processingTime",
        "instructions",
        "fixedFee",
        "percentageFee",
        "minAmount",
        "maxAmount",
        "status",
    ],
};
exports.withdrawalMethodStoreSchema = {
    description: `Withdraw method created successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.baseWithdrawMethodSchema,
            },
        },
    },
};
