"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
const Msg91Provider_1 = require("@b/services/notification/providers/sms/Msg91Provider");
const TwilioProvider_1 = require("@b/services/notification/providers/sms/TwilioProvider");
exports.metadata = {
    summary: "Tests unsaved SMS provider credentials",
    operationId: "testSmsProviderCredentials",
    tags: ["Admin", "Notification", "SMS"],
    description: "Builds a throwaway provider from the supplied credentials, checks them against the vendor, then discards it. Nothing is persisted and no SMS is sent, so a key can be validated BEFORE it is written to .env and the process restarted.",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        provider: { type: "string", enum: ["twilio", "msg91"] },
                        credentials: {
                            type: "object",
                            additionalProperties: { type: "string" },
                            description: "Candidate values keyed by environment variable name. Any omitted field falls back to the configured environment.",
                        },
                    },
                    required: ["provider"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Credential test result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            valid: { type: "boolean" },
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.notification.settings",
    logModule: "ADMIN_SMS",
    logTitle: "Test SMS provider credentials",
    audit: false,
};
exports.default = async (data) => {
    var _a, _b;
    const { body, ctx } = data;
    const provider = String((body === null || body === void 0 ? void 0 : body.provider) || "").trim();
    if (provider !== "twilio" && provider !== "msg91") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "provider must be 'twilio' or 'msg91'",
        });
    }
    const raw = body === null || body === void 0 ? void 0 : body.credentials;
    const credentials = {};
    if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [key, value] of Object.entries(raw)) {
            if (typeof value === "string" && value.trim()) {
                credentials[key] = value.trim();
            }
        }
    }
    const supplied = Object.keys(credentials);
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, supplied.length
        ? `Testing candidate ${provider} credentials (${supplied.join(", ")})`
        : `Testing configured ${provider} credentials`);
    const instance = provider === "msg91"
        ? new Msg91Provider_1.Msg91Provider({
            ...(credentials.MSG91_AUTH_KEY
                ? { authKey: credentials.MSG91_AUTH_KEY }
                : {}),
            ...(credentials.MSG91_SENDER_ID
                ? { senderId: credentials.MSG91_SENDER_ID }
                : {}),
            ...(credentials.MSG91_OTP_TEMPLATE_ID
                ? { otpTemplateId: credentials.MSG91_OTP_TEMPLATE_ID }
                : {}),
        })
        : new TwilioProvider_1.TwilioProvider({
            ...(credentials.APP_TWILIO_ACCOUNT_SID
                ? { accountSid: credentials.APP_TWILIO_ACCOUNT_SID }
                : {}),
            ...(credentials.APP_TWILIO_AUTH_TOKEN
                ? { authToken: credentials.APP_TWILIO_AUTH_TOKEN }
                : {}),
        });
    const result = await instance.healthCheck();
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx[result.ok ? "success" : "step"]) === null || _b === void 0 ? void 0 : _b.call(ctx, result.ok
        ? `Candidate ${provider} credentials accepted`
        : `Candidate ${provider} credentials rejected`);
    return { valid: result.ok, message: result.message };
};
