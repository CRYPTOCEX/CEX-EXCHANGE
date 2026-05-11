"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update merchant profile",
    description: "Updates the current user's merchant account details.",
    operationId: "updateMerchant",
    tags: ["Gateway", "Merchant"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        email: { type: "string", format: "email" },
                        website: { type: "string", format: "uri" },
                        description: { type: "string" },
                        logo: { type: "string" },
                        phone: { type: "string" },
                        address: { type: "string" },
                        city: { type: "string" },
                        state: { type: "string" },
                        country: { type: "string" },
                        postalCode: { type: "string" },
                        testMode: { type: "boolean" },
                        allowedCurrencies: { type: "array", items: { type: "string" } },
                        allowedWalletTypes: { type: "array", items: { type: "string" } },
                        defaultCurrency: { type: "string" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Merchant updated successfully",
        },
        404: {
            description: "Merchant not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Update Merchant Profile",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Unauthorized - no user ID");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Find merchant account");
    const merchant = await db_1.models.gatewayMerchant.findOne({
        where: { userId: user.id },
    });
    if (!merchant) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Merchant account not found");
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Merchant account not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Process field updates");
    const verifiedFields = [
        "name",
        "email",
        "phone",
        "website",
        "address",
        "city",
        "state",
        "country",
        "postalCode",
    ];
    const alwaysEditableFields = [
        "description",
        "logo",
        "testMode",
        "webhookUrl",
        "successUrl",
        "cancelUrl",
        "allowedCurrencies",
        "allowedWalletTypes",
        "defaultCurrency",
    ];
    const updates = {};
    const isLocked = merchant.verificationStatus !== "UNVERIFIED";
    for (const field of alwaysEditableFields) {
        if (body[field] !== undefined) {
            updates[field] = body[field];
        }
    }
    for (const field of verifiedFields) {
        if (body[field] !== undefined) {
            if (isLocked && body[field] !== merchant[field]) {
                const statusMessage = merchant.verificationStatus === "VERIFIED"
                    ? "Your account is verified."
                    : "Your account is pending review.";
                throw (0, error_1.createError)({
                    statusCode: 403,
                    message: `Cannot update ${field}. ${statusMessage} Please contact support to request changes.`,
                });
            }
            updates[field] = body[field];
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate currencies and wallet types");
    if (updates.allowedCurrencies) {
        if (!Array.isArray(updates.allowedCurrencies)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "allowedCurrencies must be an array",
            });
        }
    }
    if (updates.allowedWalletTypes) {
        if (!Array.isArray(updates.allowedWalletTypes)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "allowedWalletTypes must be an array",
            });
        }
        const validTypes = ["FIAT", "SPOT", "ECO"];
        for (const type of updates.allowedWalletTypes) {
            if (!validTypes.includes(type)) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Invalid wallet type: ${type}`,
                });
            }
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Update merchant record");
    await merchant.update(updates);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Merchant profile updated successfully");
    return {
        message: "Merchant updated successfully",
        merchant: {
            id: merchant.id,
            name: merchant.name,
            slug: merchant.slug,
            email: merchant.email,
            website: merchant.website,
            description: merchant.description,
            logo: merchant.logo,
            phone: merchant.phone,
            address: merchant.address,
            city: merchant.city,
            state: merchant.state,
            country: merchant.country,
            postalCode: merchant.postalCode,
            testMode: merchant.testMode,
            allowedCurrencies: merchant.allowedCurrencies,
            allowedWalletTypes: merchant.allowedWalletTypes,
            defaultCurrency: merchant.defaultCurrency,
            status: merchant.status,
            verificationStatus: merchant.verificationStatus,
            updatedAt: merchant.updatedAt,
        },
    };
};
