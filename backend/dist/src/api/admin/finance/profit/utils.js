"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminProfitStructure = exports.adminProfitStoreSchema = exports.adminProfitUpdateSchema = exports.adminProfitSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the Admin Profit");
const transactionId = (0, schema_1.baseStringSchema)("Transaction ID of the Admin Profit");
const type = {
    type: "string",
    description: "Type of the Admin Profit",
    enum: [
        "DEPOSIT",
        "WITHDRAW",
        "TRANSFER",
        "BINARY_ORDER",
        "EXCHANGE_ORDER",
        "INVESTMENT",
        "AI_INVESTMENT",
        "FOREX_DEPOSIT",
        "FOREX_WITHDRAW",
        "FOREX_INVESTMENT",
        "ICO_CONTRIBUTION",
        "STAKING",
        "P2P_TRADE",
    ],
};
const amount = (0, schema_1.baseNumberSchema)("Amount of the Admin Profit");
const currency = (0, schema_1.baseStringSchema)("Currency code of the Admin Profit");
const chain = (0, schema_1.baseStringSchema)("Blockchain or chain ID (optional)");
const description = (0, schema_1.baseStringSchema)("Description of the Admin Profit", 500);
exports.adminProfitSchema = {
    id,
    transactionId,
    type,
    amount,
    currency,
    chain,
    description,
};
exports.adminProfitUpdateSchema = {
    type: "object",
    properties: exports.adminProfitSchema,
    required: ["transactionId", "type", "amount", "currency"],
};
exports.adminProfitStoreSchema = {
    description: "Admin Profit created or updated successfully",
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.adminProfitSchema,
            },
        },
    },
};
const adminProfitStructure = () => ({
    type: {
        type: "select",
        label: "Type",
        name: "type",
        options: [
            "DEPOSIT",
            "WITHDRAW",
            "TRANSFER",
            "BINARY_ORDER",
            "EXCHANGE_ORDER",
            "INVESTMENT",
            "AI_INVESTMENT",
            "FOREX_DEPOSIT",
            "FOREX_WITHDRAW",
            "FOREX_INVESTMENT",
            "ICO_CONTRIBUTION",
            "STAKING",
            "P2P_TRADE",
        ],
    },
    amount: {
        type: "input",
        label: "Amount",
        name: "amount",
        placeholder: "Enter the amount",
    },
    currency: {
        type: "input",
        label: "Currency",
        name: "currency",
        placeholder: "Enter the currency",
    },
    transactionId: {
        type: "input",
        label: "Transaction ID",
        name: "transactionId",
        placeholder: "Enter the transaction ID",
    },
    description: {
        type: "textarea",
        label: "Description",
        name: "description",
        placeholder: "Enter a description",
    },
    chain: {
        type: "input",
        label: "Chain",
        name: "chain",
        placeholder: "Enter the chain identifier",
    },
});
exports.adminProfitStructure = adminProfitStructure;
