"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("../../wallet/utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Unlocks a specific deposit address",
    description: "Allows administrative unlocking of a custodial wallet deposit address to make it available for reuse. This is typically used for NO_PERMIT token addresses that need to be released after deposit completion.",
    operationId: "unlockDepositAddress",
    tags: ["Wallet", "Deposit"],
    logModule: "ECOSYSTEM",
    logTitle: "Unlock deposit address",
    parameters: [
        {
            name: "address",
            in: "query",
            description: "The deposit address to unlock (must be a valid address format)",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Deposit address unlocked successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message indicating the address has been unlocked.",
                            },
                            address: {
                                type: "string",
                                description: "The address that was unlocked",
                            },
                            timestamp: {
                                type: "string",
                                description: "ISO timestamp of when the unlock occurred",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Bad request - invalid parameters",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            statusCode: { type: "number" }
                        }
                    }
                }
            }
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Address"),
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
};
exports.default = async (data) => {
    const { query, user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { address } = query;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating address parameter");
    if (!address) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Address parameter missing");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Address parameter is required"
        });
    }
    if (typeof address !== "string") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Address parameter is not a string");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Address must be a string"
        });
    }
    const addressStr = address.trim();
    if (addressStr.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Address is empty");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Address cannot be empty"
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating address format");
    const isValidAddress = /^0x[a-fA-F0-9]{40}$/.test(addressStr) ||
        /^[13][a-km-zA-HJ-NP-Z1-9]{25,34}$/.test(addressStr) ||
        /^bc1[a-z0-9]{39,59}$/.test(addressStr) ||
        /^[A-Z0-9]{26,35}$/.test(addressStr);
    if (!isValidAddress) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid address format");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid address format"
        });
    }
    try {
        await (0, utils_1.unlockAddress)(addressStr, ctx);
        const timestamp = new Date().toISOString();
        return {
            message: "Address unlocked successfully",
            address: addressStr,
            timestamp
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to unlock address: ${error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to unlock address: ${error.message}`
        });
    }
};
