"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.kycUpdateSchema = exports.kycApplicationSchema = exports.baseKYCApplicationSchema = void 0;
exports.buildKycApplicationSearchWhere = buildKycApplicationSearchWhere;
exports.buildKycApplicationScopeWhere = buildKycApplicationScopeWhere;
const schema_1 = require("@b/utils/schema");
const sequelize_1 = require("sequelize");
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
        adminNotes: {
            type: "string",
            description: "Reviewer's notes. Sent to the applicant on a rejection.",
            nullable: true,
        },
    },
    required: ["status"],
    allOf: [
        {
            if: {
                properties: { status: { const: "REJECTED" } },
                required: ["status"],
            },
            then: {
                properties: { adminNotes: { type: "string", minLength: 3 } },
                required: ["adminNotes"],
            },
        },
        {
            if: {
                properties: { status: { const: "ADDITIONAL_INFO_REQUIRED" } },
                required: ["status"],
            },
            then: {
                properties: { adminNotes: { type: "string", minLength: 3 } },
                required: ["adminNotes"],
            },
        },
    ],
};
function buildKycApplicationSearchWhere(search) {
    const term = typeof search === "string" ? search.trim() : "";
    if (!term)
        return undefined;
    const escaped = term.replace(/[\\%_]/g, (c) => `\\${c}`);
    const like = { [sequelize_1.Op.like]: `%${escaped}%` };
    return {
        [sequelize_1.Op.or]: [
            { id: like },
            { "$user.firstName$": like },
            { "$user.lastName$": like },
            { "$user.email$": like },
            { "$level.name$": like },
        ],
    };
}
function buildKycApplicationScopeWhere(query) {
    const where = {};
    const levelId = typeof (query === null || query === void 0 ? void 0 : query.levelId) === "string" ? query.levelId.trim() : "";
    if (levelId && levelId !== "all") {
        where.levelId = levelId;
    }
    const verification = typeof (query === null || query === void 0 ? void 0 : query.verification) === "string" ? query.verification.trim() : "";
    if (verification === "service") {
        where["$level.serviceId$"] = { [sequelize_1.Op.ne]: null };
    }
    else if (verification === "manual") {
        where["$level.serviceId$"] = { [sequelize_1.Op.is]: null };
    }
    return Object.keys(where).length > 0 ? where : undefined;
}
