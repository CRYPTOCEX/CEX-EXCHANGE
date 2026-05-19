"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.depositUpdateSchema = void 0;
const schema_1 = require("@b/utils/schema");
const depositStatus = {
    ...(0, schema_1.baseStringSchema)("Status of the deposit transaction"),
    enum: ["PENDING", "COMPLETED", "FAILED", "CANCELLED", "REJECTED", "EXPIRED"],
};
const amount = {
    ...(0, schema_1.baseNumberSchema)("Deposit amount"),
    minimum: 0.01,
};
const fee = {
    ...(0, schema_1.baseNumberSchema)("Processing fee for the deposit"),
    minimum: 0,
};
const description = (0, schema_1.baseStringSchema)("Description of the deposit transaction");
const referenceId = {
    ...(0, schema_1.baseStringSchema)("Payment reference ID from the payment processor"),
    nullable: true,
};
const referenceIdRequired = {
    ...(0, schema_1.baseStringSchema)("Payment reference ID from the payment processor"),
    minLength: 1,
    nullable: false,
};
const trxId = {
    ...(0, schema_1.baseStringSchema)("Transaction ID from the payment processor"),
    nullable: true,
};
const metadata = {
    type: "object",
    description: "Additional metadata for the deposit transaction",
    properties: {
        method: {
            ...(0, schema_1.baseStringSchema)("Payment method used"),
            nullable: true,
        },
        message: {
            ...(0, schema_1.baseStringSchema)("Admin message or notes"),
            nullable: true,
        },
    },
    nullable: true,
    additionalProperties: true,
};
exports.depositUpdateSchema = {
    type: "object",
    properties: {
        status: depositStatus,
        amount,
        fee,
        description,
        referenceId,
        trxId,
        metadata,
    },
    required: ["status", "amount", "fee", "description"],
    allOf: [
        {
            if: {
                properties: { status: { const: "COMPLETED" } },
            },
            then: {
                properties: {
                    referenceId: referenceIdRequired,
                },
                required: ["status", "amount", "fee", "description", "referenceId"],
            },
        },
    ],
};
