"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.bypassUseCount = exports.BYPASS_HEADER = void 0;
exports.rateLimitBypassAllowed = rateLimitBypassAllowed;
const crypto_1 = __importDefault(require("crypto"));
const console_1 = require("@b/utils/console");
exports.BYPASS_HEADER = "x-e2e-rate-limit-bypass";
const MIN_TOKEN_LENGTH = 32;
const sha256 = (value) => crypto_1.default.createHash("sha256").update(value, "utf8").digest();
let uses = 0;
let warnedAboutShortToken = false;
function rateLimitBypassAllowed(headers) {
    var _a;
    if (process.env.NODE_ENV === "production")
        return false;
    const configured = process.env.E2E_RATE_LIMIT_BYPASS_TOKEN;
    if (typeof configured !== "string" || configured.length === 0)
        return false;
    if (configured.length < MIN_TOKEN_LENGTH) {
        if (!warnedAboutShortToken) {
            warnedAboutShortToken = true;
            console_1.logger.warn("RATE_LIMIT", `E2E_RATE_LIMIT_BYPASS_TOKEN is ${configured.length} characters; at least ` +
                `${MIN_TOKEN_LENGTH} are required. The bypass stays DISABLED.`);
        }
        return false;
    }
    const presented = headers === null || headers === void 0 ? void 0 : headers[exports.BYPASS_HEADER];
    if (typeof presented !== "string" || presented.length === 0)
        return false;
    if (!crypto_1.default.timingSafeEqual(sha256(presented), sha256(configured)))
        return false;
    uses += 1;
    if (uses === 1 || uses % 100 === 0) {
        console_1.logger.warn("RATE_LIMIT", `Rate limiting BYPASSED for a request presenting ${exports.BYPASS_HEADER} ` +
            `(use #${uses}, NODE_ENV=${(_a = process.env.NODE_ENV) !== null && _a !== void 0 ? _a : "undefined"}). This is a test-run ` +
            `facility; it is refused outright when NODE_ENV=production.`);
    }
    return true;
}
const bypassUseCount = () => uses;
exports.bypassUseCount = bypassUseCount;
