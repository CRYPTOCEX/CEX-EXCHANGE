"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const transfer_security_1 = require("@b/utils/transfer-security");
const transfer_2fa_1 = require("@b/utils/transfer-2fa");
exports.metadata = {
    summary: "Returns the effective transfer verification policy",
    description: "Reports whether transfers require a Transfer PIN or a one-time code, which transfers it applies to, and whether the current user can satisfy it.",
    operationId: "getTransferSecurityPolicy",
    tags: ["Finance", "Transfer"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Policy retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            active: { type: "boolean" },
                            pinAccepted: { type: "boolean" },
                            twoFactorAccepted: { type: "boolean" },
                            scope: {
                                type: "string",
                                description: '"client" (transfers to another user) or "all"',
                            },
                            acceptedTypes: { type: "array", items: { type: "string" } },
                            userType: { type: "string", nullable: true },
                            hasPin: { type: "boolean" },
                            hasTwoFactor: { type: "boolean" },
                            pinLockedUntil: { type: "string", nullable: true },
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
    var _b, _c;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const policy = await (0, transfer_security_1.getTransferSecurityPolicy)();
    const status = await (0, transfer_security_1.getTransferCredentialStatus)(user.id, policy);
    const twoFactor = policy.twoFactorAccepted
        ? await (0, transfer_2fa_1.getUserTransferTwoFactor)(user.id)
        : null;
    return {
        active: policy.active,
        pinAccepted: policy.pinAccepted,
        twoFactorAccepted: policy.twoFactorAccepted,
        scope: policy.scope,
        acceptedTypes: policy.twoFactor.acceptedTypes,
        userType: (_b = twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.type) !== null && _b !== void 0 ? _b : null,
        hasPin: status.hasPin,
        hasTwoFactor: status.hasTwoFactor,
        pinLockedUntil: (_c = (_a = status.pinLockedUntil) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _c !== void 0 ? _c : null,
        satisfied: policy.active ? status.satisfiable : true,
    };
};
