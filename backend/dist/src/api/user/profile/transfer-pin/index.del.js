"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const user_activity_1 = require("@b/utils/user-activity");
const transfer_pin_1 = require("@b/utils/transfer-pin");
const transfer_pin_proof_1 = require("@b/utils/transfer-pin-proof");
const utils_1 = require("@b/api/user/profile/password/utils");
const transfer_security_1 = require("@b/utils/transfer-security");
exports.metadata = {
    summary: "Clears the Transfer PIN",
    description: "Removes the Transfer PIN protecting wallet transfers. Requires the account password, the current PIN, or a two-factor code.",
    operationId: "clearTransferPin",
    tags: ["Profile", "Security"],
    requiresAuth: true,
    middleware: ["transferPinChange"],
    logModule: "TRANSFER_PIN",
    logTitle: "Clear transfer PIN",
    requestBody: {
        required: false,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        currentPin: { type: "string", nullable: true },
                        password: { type: "string", nullable: true },
                        otp: { type: "string", nullable: true },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "PIN cleared",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            transfersNowBlocked: { type: "boolean" },
                        },
                    },
                },
            },
        },
        400: { description: "No PIN is set, or no proof was supplied" },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    (0, utils_1.assertSessionCaller)(data);
    const record = await (0, transfer_pin_1.getTransferPinRecord)(user.id);
    if (!(record === null || record === void 0 ? void 0 : record.enabled)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No Transfer PIN is set");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No Transfer PIN is set on this account.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying account ownership");
    await (0, transfer_pin_proof_1.assertTransferPinProof)(user.id, {
        currentPin: typeof (body === null || body === void 0 ? void 0 : body.currentPin) === "string" ? body.currentPin.trim() : undefined,
        password: typeof (body === null || body === void 0 ? void 0 : body.password) === "string" ? body.password : undefined,
        otp: typeof (body === null || body === void 0 ? void 0 : body.otp) === "string" ? body.otp.trim() : undefined,
    }, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing Transfer PIN");
    await (0, transfer_pin_1.clearTransferPin)(user.id);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.transfer_pin_cleared",
        title: "Transfer PIN cleared",
        description: "The Transfer PIN protecting wallet transfers was removed",
        severity: "warning",
        req: data,
    });
    const policy = await (0, transfer_security_1.getTransferSecurityPolicy)();
    const status = await (0, transfer_security_1.getTransferCredentialStatus)(user.id, policy);
    const transfersNowBlocked = policy.active && !status.satisfiable;
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Transfer PIN cleared");
    return {
        message: transfersNowBlocked
            ? "Your Transfer PIN has been removed. Transfers are unavailable until you set a new one."
            : "Your Transfer PIN has been removed.",
        transfersNowBlocked,
    };
};
