"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kycUpdateSchema = exports.kycApplicationSchema = exports.baseKYCApplicationSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = {
    ...(0, schema_1.baseStringSchema)("ID of the KYC application"),
    nullable: true,
};
const userId = (0, schema_1.baseStringSchema)("ID of the user");
const templateId = (0, schema_1.baseStringSchema)("ID of the KYC template");
const data = {
    ...(0, schema_1.baseObjectSchema)("Data associated with the KYC application"),
    additionalProperties: true,
};
const status = (0, schema_1.baseStringSchema)("Current status of the KYC application");
const level = (0, schema_1.baseIntegerSchema)("Level of the KYC verification");
const notes = {
    ...(0, schema_1.baseStringSchema)("Administrative notes on the KYC application"),
    nullable: true,
};
exports.baseKYCApplicationSchema = {
    id,
    userId,
    templateId,
    status,
    level,
    notes,
};
exports.kycApplicationSchema = {
    ...exports.baseKYCApplicationSchema,
    user: {
        type: "object",
        properties: {
            id: { type: "string", description: "ID of the user" },
            email: { type: "string", description: "Email of the user" },
            firstName: { type: "string", description: "First name of the user" },
            lastName: { type: "string", description: "Last name of the user" },
            phone: { type: "string", description: "Phone number of the user" },
            country: {
                type: "string",
                description: "Country of residence of the user",
            },
            city: { type: "string", description: "City of residence of the user" },
            address: { type: "string", description: "Address of the user" },
            postalCode: {
                type: "string",
                description: "Postal code of the user's address",
            },
            dob: {
                type: "string",
                format: "date-time",
                description: "Date of birth of the user",
            },
            createdAt: {
                type: "string",
                format: "date-time",
                description: "Date and time when the user was created",
            },
            updatedAt: {
                type: "string",
                format: "date-time",
                description: "Date and time when the user was last updated",
            },
        },
        nullable: true,
    },
    template: {
        type: "object",
        properties: {
            id: { type: "string", description: "ID of the KYC template" },
            title: { type: "string", description: "Title of the KYC template" },
        },
        nullable: true,
    },
};
exports.kycUpdateSchema = {
    type: "object",
    properties: {
        status,
        level,
        notes,
    },
    required: ["status"],
};
