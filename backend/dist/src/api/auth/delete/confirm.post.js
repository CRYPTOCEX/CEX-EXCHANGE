"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const system_accounts_1 = require("@b/utils/system-accounts");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const utils_1 = require("../utils");
const emails_1 = require("@b/utils/emails");
const anonymize_1 = require("../../user/account/anonymize");
exports.metadata = {
    summary: "Check account deletion code and delete user",
    operationId: "checkAccountDeletionCode",
    tags: ["Account"],
    description: "Checks the deletion code, deletes the user's account if valid, and sends a confirmation email.",
    requiresAuth: false,
    logModule: "ACCOUNT",
    logTitle: "Confirm account deletion",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        email: {
                            type: "string",
                            format: "email",
                            description: "Email of the user confirming account deletion",
                        },
                        token: {
                            type: "string",
                            description: "Account deletion confirmation token",
                        },
                    },
                    required: ["email", "token"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "User account deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request or token",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Error message",
                            },
                        },
                    },
                },
            },
        },
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { body, ctx } = data;
    const { email, token } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating account deletion confirmation");
        if (!email || !token) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Email and token are required");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Email and token are required",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying deletion token");
        const decodedToken = await (0, token_1.verifyResetToken)(token, "account-deletion");
        if (!decodedToken) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired token");
            throw (0, error_1.createError)({ message: "Invalid or expired token", statusCode: 400 });
        }
        const tokenUserId = (_b = (_a = decodedToken.sub) === null || _a === void 0 ? void 0 : _a.user) === null || _b === void 0 ? void 0 : _b.id;
        if (!tokenUserId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid or expired token");
            throw (0, error_1.createError)({ message: "Invalid or expired token", statusCode: 400 });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Looking up user: ${tokenUserId}`);
        const user = await db_1.models.user.findOne({ where: { id: tokenUserId } });
        if (!user) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not found");
            throw (0, error_1.createError)({ message: "User not found", statusCode: 404 });
        }
        if ((0, system_accounts_1.isSystemAccount)(user)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Deletion token names a platform system account");
            throw (0, error_1.createError)({ message: "Invalid or expired token", statusCode: 400 });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking token usage");
        try {
            if (decodedToken.jti !== (await (0, utils_1.addOneTimeToken)(decodedToken.jti, new Date()))) {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token already used");
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Token has already been used",
                });
            }
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Token validation failed");
            throw (0, error_1.createError)({
                statusCode: 500,
                message: "Token has already been used",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking what the account still holds");
        const { getDeletionPreconditions } = await Promise.resolve().then(() => __importStar(require("@b/api/user/account/utils")));
        const preconditions = await getDeletionPreconditions(user.id);
        const openOrders = preconditions.blockers.find((b) => b.kind === "OPEN_ORDERS");
        if (openOrders) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Account has open orders");
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `You still have ${openOrders.count} open order${openOrders.count === 1 ? "" : "s"}. Cancel them, then use this link again.`,
            });
        }
        const notifyEmail = user.email;
        const notifyFirstName = user.firstName;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting user account");
        await (0, anonymize_1.anonymizeAndSoftDeleteUser)(user.id);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Ending the account's sessions");
        await (0, token_1.deleteAllUserSessions)(user.id);
        try {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending deletion confirmation email");
            await emails_1.emailQueue.add({
                emailData: {
                    TO: notifyEmail,
                    FIRSTNAME: notifyFirstName,
                },
                emailType: "AccountDeletionConfirmed",
            });
            ctx === null || ctx === void 0 ? void 0 : ctx.success(`User account ${email} deleted successfully`);
            return {
                message: "User account deleted successfully",
            };
        }
        catch (error) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to send deletion confirmation email");
            throw (0, error_1.createError)({ message: error.message, statusCode: 500 });
        }
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Account deletion confirmation failed");
        throw error;
    }
};
