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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicCaptchaConfig = exports.getCaptchaConfig = void 0;
exports.getCaptchaProvider = getCaptchaProvider;
exports.readCaptchaSubmission = readCaptchaSubmission;
exports.verifyCaptchaOrThrow = verifyCaptchaOrThrow;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const config_1 = require("./config");
const pow_1 = require("./providers/pow");
const vendors_1 = require("./providers/vendors");
__exportStar(require("./types"), exports);
var config_2 = require("./config");
Object.defineProperty(exports, "getCaptchaConfig", { enumerable: true, get: function () { return config_2.getCaptchaConfig; } });
Object.defineProperty(exports, "getPublicCaptchaConfig", { enumerable: true, get: function () { return config_2.getPublicCaptchaConfig; } });
const FAIL_CLOSED_ACTIONS = new Set([
    "register",
]);
const PROVIDERS = {
    pow: pow_1.powProvider,
    turnstile: vendors_1.turnstileProvider,
    recaptcha: vendors_1.recaptchaProvider,
    hcaptcha: vendors_1.hcaptchaProvider,
};
function getCaptchaProvider(id) {
    return PROVIDERS[id] || null;
}
function readCaptchaSubmission(body) {
    var _a;
    if (!body || typeof body !== "object")
        return {};
    const envelope = body.captcha;
    if (envelope && typeof envelope === "object") {
        return {
            provider: typeof envelope.provider === "string" ? envelope.provider : undefined,
            token: typeof envelope.token === "string" ? envelope.token : undefined,
            solution: (_a = envelope.solution) !== null && _a !== void 0 ? _a : undefined,
        };
    }
    if (body.powSolution && typeof body.powSolution === "object") {
        return { provider: "pow", solution: body.powSolution };
    }
    return {};
}
async function verifyCaptchaOrThrow(body, action, clientIp) {
    const config = await (0, config_1.getCaptchaConfig)();
    if (config.provider === "none")
        return;
    const provider = getCaptchaProvider(config.provider);
    if (!provider) {
        return refuseOrWaive(action, `no provider registered for "${config.provider}"`);
    }
    if (provider.requiresSecret && !config.secretKey) {
        return refuseOrWaive(action, `${provider.label} is selected but no secret key is configured`);
    }
    const submission = readCaptchaSubmission(body);
    if (submission.provider && submission.provider !== config.provider) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Security check is out of date. Please refresh the page and try again.",
        });
    }
    let verdict;
    try {
        verdict = await provider.verify(submission, { action, clientIp }, config);
    }
    catch (error) {
        console_1.logger.error("CAPTCHA", `${provider.id} verifier threw`, error);
        return refuseOrWaive(action, `verifier threw: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
    }
    if (verdict.ok)
        return;
    if (verdict.indeterminate) {
        return refuseOrWaive(action, verdict.reason || "indeterminate");
    }
    console_1.logger.debug("CAPTCHA", `${provider.id} refused a ${action}: ${verdict.reason || "no reason given"}`);
    throw (0, error_1.createError)({
        statusCode: 400,
        message: "Security verification failed. Please try again.",
    });
}
function refuseOrWaive(action, reason) {
    if (FAIL_CLOSED_ACTIONS.has(action)) {
        console_1.logger.error("CAPTCHA", `Refusing ${action}: captcha could not be evaluated (${reason}). ` +
            `Registration fails closed by design — fix the captcha configuration ` +
            `in Settings → Security → Protection.`);
        throw (0, error_1.createError)({
            statusCode: 503,
            message: "Registration is temporarily unavailable. Please try again shortly.",
        });
    }
    console_1.logger.error("CAPTCHA", `ALLOWING ${action} WITHOUT A CAPTCHA CHECK: ${reason}. This action fails ` +
        `open so operators cannot be locked out of their own install — but the ` +
        `control is NOT running. Fix it in Settings → Security → Protection.`);
}
