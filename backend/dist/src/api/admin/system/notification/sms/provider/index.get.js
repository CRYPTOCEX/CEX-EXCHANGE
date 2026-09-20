"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const errors_1 = require("@b/utils/schema/errors");
const resolve_1 = require("@b/services/notification/providers/sms/resolve");
exports.metadata = {
    summary: "Lists SMS OTP providers",
    operationId: "listSmsProviders",
    tags: ["Admin", "Notification", "SMS"],
    description: "Retrieves which provider delivers one-time codes, whether each provider's credentials are present, which env vars are missing, and the comparison used to choose between them. Notification SMS always uses Twilio and is reported separately.",
    responses: {
        200: {
            description: "Configuration retrieved successfully",
            content: { "application/json": { schema: { type: "object" } } },
        },
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.notification.settings",
    logModule: "ADMIN_SMS",
    logTitle: "List SMS providers",
};
const REQUIRED_CREDENTIALS = {
    twilio: [
        "APP_TWILIO_ACCOUNT_SID",
        "APP_TWILIO_AUTH_TOKEN",
        "APP_TWILIO_PHONE_NUMBER",
    ],
    msg91: ["MSG91_AUTH_KEY", "MSG91_OTP_TEMPLATE_ID"],
};
const OPTIONAL_CREDENTIALS = {
    twilio: [
        {
            key: "APP_TWILIO_MESSAGING_SERVICE_SID",
            why: "Send from a pooled Messaging Service instead of a single number.",
        },
    ],
    msg91: [
        {
            key: "MSG91_SENDER_ID",
            why: "Your own 6-character sender id, for branding. Only required once volume in a country passes roughly 2,000/month.",
        },
        {
            key: "MSG91_DLT_TE_ID",
            why: "DLT template entity id, if your account requires it for Indian destinations.",
        },
    ],
};
const TESTABLE_CREDENTIALS = {
    twilio: ["APP_TWILIO_ACCOUNT_SID", "APP_TWILIO_AUTH_TOKEN"],
    msg91: ["MSG91_AUTH_KEY"],
};
const PROVIDER_PROFILES = {
    twilio: {
        title: "Twilio",
        description: "Global programmable messaging. Also delivers every non-code message the platform sends.",
        failsLoudly: true,
        coverage: "Global",
        cost: "Pay per message, per destination, plus a monthly number fee.",
        setupEffort: "Already configured — it is the platform default.",
        bestFor: "Worldwide delivery with no template registration.",
        dltIndia: "Required for Indian numbers: a registered Entity ID, header and content template, exactly as MSG91 needs.",
        setup: {
            signupUrl: "https://www.twilio.com/try-twilio",
            consoleUrl: "https://console.twilio.com",
            steps: [
                "Create a Twilio account and complete phone verification.",
                "From the Console dashboard copy the Account SID (it begins with 'AC') and the Auth Token.",
                "Buy a phone number with SMS capability under Phone Numbers → Manage → Buy a number.",
                "If sending outside the US/Canada, enable each destination region under Messaging → Settings → Geo Permissions.",
                "Set APP_TWILIO_ACCOUNT_SID, APP_TWILIO_AUTH_TOKEN and APP_TWILIO_PHONE_NUMBER, then restart the backend.",
            ],
        },
    },
    msg91: {
        title: "MSG91",
        description: "Template-based messaging, strongest and cheapest in India. Used here for one-time codes only.",
        failsLoudly: false,
        coverage: "Global, India-first",
        cost: "Prepaid credits, priced per destination. Cheaper than Twilio for Indian volume.",
        setupEffort: "Two values: an authkey and one OTP template id.",
        bestFor: "India-heavy OTP traffic.",
        dltIndia: "Required for Indian numbers: a registered Entity ID, header and the OTP template. Approval takes 2-4 business days.",
        setup: {
            signupUrl: "https://msg91.com/signup",
            consoleUrl: "https://control.msg91.com/signin",
            steps: [
                "Create an MSG91 account and ADD CREDITS. With a zero balance MSG91 still answers every send with success and a request id, then queues nothing — codes simply never arrive.",
                "Settings → API Keys: copy the authkey into MSG91_AUTH_KEY. This is NOT the tokenAuth from an OTP Widget snippet — that is a public browser token and MSG91 rejects it for server calls.",
                "OTP → Add template: create one template using ##OTP## as the placeholder, and set its OTP length to 6. This platform issues 6-digit codes; MSG91's template defaults to 4, and a mismatch is rejected or truncated by the operator rather than reported back. Copy the template id into MSG91_OTP_TEMPLATE_ID.",
                "Set SMS_OTP_PROVIDER=\"msg91\", restart the backend, then press Test credentials here.",
                "Optional: add your own sender id under Sender ID for branding. Without it MSG91 uses its shared sender id, which is fine below roughly 2,000 messages/month per country.",
                "For Indian destinations only: register your Entity ID, header and that template on a DLT portal first.",
            ],
        },
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Reading SMS provider configuration");
    const config = (0, resolve_1.describeSmsConfiguration)();
    const providers = Object.keys(PROVIDER_PROFILES).map((id) => {
        const required = REQUIRED_CREDENTIALS[id];
        return {
            id,
            ...PROVIDER_PROFILES[id],
            active: config.otpProvider === id,
            configured: config.providers[id],
            requiredCredentials: required,
            missingCredentials: required.filter((key) => { var _a; return !((_a = process.env[key]) === null || _a === void 0 ? void 0 : _a.trim()); }),
            optionalCredentials: OPTIONAL_CREDENTIALS[id].map((o) => { var _a; return ({
                ...o,
                set: Boolean((_a = process.env[o.key]) === null || _a === void 0 ? void 0 : _a.trim()),
            }); }),
            testableCredentials: TESTABLE_CREDENTIALS[id],
        };
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, "SMS provider configuration retrieved");
    return {
        otpProvider: config.otpProvider,
        selection: ((_c = process.env.SMS_OTP_PROVIDER) === null || _c === void 0 ? void 0 : _c.trim()) ? "explicit" : "default",
        otpConfigured: config.otpConfigured,
        otpConfigError: config.otpConfigError,
        baseProvider: config.baseProvider,
        baseConfigured: config.baseConfigured,
        baseConfigError: config.baseConfigError,
        providers,
    };
};
