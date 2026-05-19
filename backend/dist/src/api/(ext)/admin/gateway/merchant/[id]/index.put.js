"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update gateway merchant",
    description: "Updates gateway merchant details including business information, fee structure, payment limits, payout settings, and allowed currencies/wallet types.",
    operationId: "updateGatewayMerchant",
    tags: ["Admin", "Gateway", "Merchant"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            description: "Merchant UUID",
            schema: { type: "string", format: "uuid" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Business name" },
                        email: { type: "string", format: "email", description: "Contact email" },
                        website: { type: "string", format: "uri", description: "Business website URL" },
                        description: { type: "string", description: "Business description" },
                        logo: { type: "string", description: "Logo URL" },
                        phone: { type: "string", description: "Contact phone number" },
                        address: { type: "string", description: "Business address" },
                        country: { type: "string", description: "Country code" },
                        testMode: { type: "boolean", description: "Enable/disable test mode" },
                        feeType: { type: "string", enum: ["PERCENTAGE", "FIXED", "BOTH"], description: "Fee type" },
                        feePercentage: { type: "number", description: "Fee percentage (e.g., 2.9 for 2.9%)" },
                        feeFixed: { type: "number", description: "Fixed fee amount" },
                        payoutSchedule: { type: "string", enum: ["INSTANT", "DAILY", "WEEKLY", "MONTHLY"], description: "Payout schedule" },
                        payoutThreshold: { type: "number", description: "Minimum payout threshold" },
                        dailyLimit: { type: "number", description: "Daily transaction limit" },
                        monthlyLimit: { type: "number", description: "Monthly transaction limit" },
                        transactionLimit: { type: "number", description: "Per-transaction limit" },
                        allowedCurrencies: { type: "array", items: { type: "string" }, description: "Allowed currency codes" },
                        allowedWalletTypes: { type: "array", items: { type: "string", enum: ["FIAT", "SPOT", "ECO"] }, description: "Allowed wallet types" },
                        defaultCurrency: { type: "string", description: "Default currency code" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Merchant updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Merchant"),
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "edit.gateway.merchant",
    logModule: "ADMIN_GATEWAY",
    logTitle: "Update merchant details",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Updating merchant ${id}`);
    const result = await (0, query_1.updateRecord)("gatewayMerchant", id, body);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Merchant ${id} updated successfully`);
    return result;
};
