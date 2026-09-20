"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hcaptchaProvider = exports.recaptchaProvider = exports.turnstileProvider = void 0;
const siteverify_1 = require("./siteverify");
exports.turnstileProvider = {
    id: "turnstile",
    label: "Cloudflare Turnstile",
    requiresSiteKey: true,
    requiresSecret: true,
    verify: (submission, ctx, config) => (0, siteverify_1.verifyWithVendor)({
        endpoint: "https://challenges.cloudflare.com/turnstile/v0/siteverify",
        scored: false,
        echoesAction: true,
    }, submission, ctx, config),
};
exports.recaptchaProvider = {
    id: "recaptcha",
    label: "Google reCAPTCHA v3",
    requiresSiteKey: true,
    requiresSecret: true,
    verify: (submission, ctx, config) => (0, siteverify_1.verifyWithVendor)({
        endpoint: "https://www.google.com/recaptcha/api/siteverify",
        scored: true,
        echoesAction: true,
    }, submission, ctx, config),
};
exports.hcaptchaProvider = {
    id: "hcaptcha",
    label: "hCaptcha",
    requiresSiteKey: true,
    requiresSecret: true,
    verify: (submission, ctx, config) => (0, siteverify_1.verifyWithVendor)({
        endpoint: "https://api.hcaptcha.com/siteverify",
        scored: false,
        echoesAction: false,
    }, submission, ctx, config),
};
