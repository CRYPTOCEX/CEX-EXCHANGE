"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const withdraw_2fa_1 = require("@b/utils/withdraw-2fa");
exports.metadata = {
    summary: "Returns the effective withdrawal two-factor policy",
    description: "Reports whether withdrawals require two-factor authentication, which methods are accepted, and whether the current user satisfies the requirement.",
    operationId: "getWithdrawTwoFactorPolicy",
    tags: ["Wallets"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Policy retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            requireEnrollment: { type: "boolean" },
                            requireChallenge: { type: "boolean" },
                            acceptedTypes: { type: "array", items: { type: "string" } },
                            userType: { type: "string", nullable: true },
                            userEnabled: { type: "boolean" },
                            satisfied: { type: "boolean" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const policy = await (0, withdraw_2fa_1.getWithdrawTwoFactorPolicy)();
    const twoFactor = await (0, withdraw_2fa_1.getUserWithdrawTwoFactor)(user.id);
    return {
        requireEnrollment: policy.requireEnrollment,
        requireChallenge: policy.requireChallenge,
        acceptedTypes: policy.acceptedTypes,
        userType: (_a = twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.type) !== null && _a !== void 0 ? _a : null,
        userEnabled: Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled),
        satisfied: !policy.requireEnrollment && !policy.requireChallenge
            ? true
            : (0, withdraw_2fa_1.satisfiesPolicy)(policy, twoFactor),
    };
};
