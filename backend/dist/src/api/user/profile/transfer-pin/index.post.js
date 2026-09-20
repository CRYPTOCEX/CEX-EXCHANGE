"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const user_activity_1 = require("@b/utils/user-activity");
const transfer_pin_1 = require("@b/utils/transfer-pin");
const transfer_pin_proof_1 = require("@b/utils/transfer-pin-proof");
const utils_1 = require("@b/api/user/profile/password/utils");
exports.metadata = {
    summary: "Sets or changes the Transfer PIN",
    description: "Stores a new four-digit Transfer PIN. Requires the account password, the current PIN, or a two-factor code, unless the account holds none of those and has no PIN yet.",
    operationId: "setTransferPin",
    tags: ["Profile", "Security"],
    requiresAuth: true,
    middleware: ["transferPinChange"],
    logModule: "TRANSFER_PIN",
    logTitle: "Set transfer PIN",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        pin: {
                            type: "string",
                            description: "The new four-digit PIN",
                        },
                        currentPin: {
                            type: "string",
                            description: "The PIN currently in force, if one is set",
                            nullable: true,
                        },
                        password: {
                            type: "string",
                            description: "The account password",
                            nullable: true,
                        },
                        otp: {
                            type: "string",
                            description: "A code from the enrolled second factor, or a recovery code",
                            nullable: true,
                        },
                    },
                    required: ["pin"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "PIN saved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        400: { description: "The PIN is malformed, too easy to guess, or no proof was supplied" },
        401: query_1.unauthorizedResponse,
        429: { description: "Too many attempts" },
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
    const pin = typeof (body === null || body === void 0 ? void 0 : body.pin) === "string" ? body.pin.trim() : "";
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating new PIN");
    if (!(0, transfer_pin_1.isValidPinFormat)(pin)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New PIN is malformed");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Your Transfer PIN must be exactly ${transfer_pin_1.TRANSFER_PIN_LENGTH} digits.`,
        });
    }
    if ((0, transfer_pin_1.isTrivialPin)(pin)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("New PIN is trivially guessable");
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "That PIN is too easy to guess. Avoid repeated digits, simple sequences, and years.",
        });
    }
    const existing = await (0, transfer_pin_1.getTransferPinRecord)(user.id);
    const isChange = Boolean(existing === null || existing === void 0 ? void 0 : existing.enabled);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying account ownership");
    await (0, transfer_pin_proof_1.assertTransferPinProof)(user.id, {
        currentPin: typeof (body === null || body === void 0 ? void 0 : body.currentPin) === "string" ? body.currentPin.trim() : undefined,
        password: typeof (body === null || body === void 0 ? void 0 : body.password) === "string" ? body.password : undefined,
        otp: typeof (body === null || body === void 0 ? void 0 : body.otp) === "string" ? body.otp.trim() : undefined,
    }, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving Transfer PIN");
    await (0, transfer_pin_1.setTransferPin)(user.id, pin);
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.transfer_pin_changed",
        title: isChange ? "Transfer PIN changed" : "Transfer PIN set",
        description: isChange
            ? "The Transfer PIN protecting wallet transfers was changed"
            : "A Transfer PIN was set to protect wallet transfers",
        severity: "info",
        req: data,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(isChange ? "Transfer PIN changed" : "Transfer PIN set");
    return {
        message: isChange
            ? "Your Transfer PIN has been changed."
            : "Your Transfer PIN has been set.",
    };
};
