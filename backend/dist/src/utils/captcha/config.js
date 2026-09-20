"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCaptchaConfig = getCaptchaConfig;
exports.getPublicCaptchaConfig = getPublicCaptchaConfig;
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const types_1 = require("./types");
const DEFAULT_PROVIDER = "pow";
const DEFAULT_SCORE_THRESHOLD = 0.5;
let warnedUnknownProvider = "";
function resolveProvider(settings) {
    const explicit = settings.get("captchaProvider");
    if (typeof explicit === "string" && explicit.trim()) {
        const normalized = explicit.trim().toLowerCase();
        if (types_1.CAPTCHA_PROVIDER_IDS.includes(normalized)) {
            return normalized;
        }
        if (warnedUnknownProvider !== normalized) {
            warnedUnknownProvider = normalized;
            console_1.logger.error("CAPTCHA", `captchaProvider is "${explicit}", which is not one of ` +
                `${types_1.CAPTCHA_PROVIDER_IDS.join(", ")}. Falling back to "${DEFAULT_PROVIDER}".`);
        }
        return DEFAULT_PROVIDER;
    }
    if (settings.has("powCaptchaStatus")) {
        return cache_1.CacheManager.toBool(settings.get("powCaptchaStatus"), true)
            ? "pow"
            : "none";
    }
    return DEFAULT_PROVIDER;
}
function resolveThreshold(raw) {
    const parsed = typeof raw === "number" ? raw : parseFloat(String(raw !== null && raw !== void 0 ? raw : ""));
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) {
        return DEFAULT_SCORE_THRESHOLD;
    }
    return parsed;
}
async function getCaptchaConfig() {
    var _a, _b;
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    return {
        provider: resolveProvider(settings),
        siteKey: String((_a = settings.get("captchaSiteKey")) !== null && _a !== void 0 ? _a : "").trim(),
        secretKey: String((_b = settings.get("captchaSecretKey")) !== null && _b !== void 0 ? _b : "").trim(),
        scoreThreshold: resolveThreshold(settings.get("captchaScoreThreshold")),
    };
}
async function getPublicCaptchaConfig() {
    const { provider, siteKey } = await getCaptchaConfig();
    return { provider, siteKey };
}
