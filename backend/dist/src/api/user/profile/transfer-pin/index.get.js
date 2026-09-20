"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const db_1 = require("@b/db");
const transfer_pin_1 = require("@b/utils/transfer-pin");
const transfer_security_1 = require("@b/utils/transfer-security");
exports.metadata = {
    summary: "Returns the current user's Transfer PIN status",
    description: "Reports whether a Transfer PIN is set, whether it is locked, and which credentials can be used to change it.",
    operationId: "getTransferPinStatus",
    tags: ["Profile", "Security"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Status retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            hasPin: { type: "boolean" },
                            pinLength: { type: "number" },
                            lockedUntil: { type: "string", nullable: true },
                            lastChangedAt: { type: "string", nullable: true },
                            requiredForTransfers: { type: "boolean" },
                            canProveWithPassword: { type: "boolean" },
                            canProveWithTwoFactor: { type: "boolean" },
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
    var _b;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const [record, account, twoFactor, policy] = await Promise.all([
        (0, transfer_pin_1.getTransferPinRecord)(user.id),
        db_1.models.user.findByPk(user.id),
        db_1.models.twoFactor.findOne({ where: { userId: user.id } }),
        (0, transfer_security_1.getTransferSecurityPolicy)(),
    ]);
    const lockedUntil = (record === null || record === void 0 ? void 0 : record.lockedUntil) && record.lockedUntil > new Date()
        ? record.lockedUntil.toISOString()
        : null;
    return {
        hasPin: Boolean(record === null || record === void 0 ? void 0 : record.enabled),
        pinLength: transfer_pin_1.TRANSFER_PIN_LENGTH,
        lockedUntil,
        lastChangedAt: (_b = (_a = record === null || record === void 0 ? void 0 : record.lastChangedAt) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : null,
        requiredForTransfers: policy.pinAccepted,
        canProveWithPassword: Boolean(account === null || account === void 0 ? void 0 : account.password),
        canProveWithTwoFactor: Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled),
    };
};
