"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyWithVendor = verifyWithVendor;
const console_1 = require("@b/utils/console");
const SITEVERIFY_TIMEOUT_MS = 5000;
function allowedHostnames() {
    const raw = process.env.APP_PUBLIC_URL ||
        process.env.NEXT_PUBLIC_SITE_URL ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "";
    if (!raw)
        return [];
    try {
        const host = new URL(raw).hostname.toLowerCase();
        return host.startsWith("www.") ? [host, host.slice(4)] : [host, `www.${host}`];
    }
    catch (_a) {
        return [];
    }
}
async function verifyWithVendor(spec, submission, ctx, config) {
    const token = submission === null || submission === void 0 ? void 0 : submission.token;
    if (!token || typeof token !== "string") {
        return { ok: false, reason: "missing-token" };
    }
    if (token.length > 4096) {
        return { ok: false, reason: "token-too-long" };
    }
    if (!config.secretKey) {
        return { ok: false, indeterminate: true, reason: "missing-secret" };
    }
    const form = new URLSearchParams();
    form.set("secret", config.secretKey);
    form.set("response", token);
    if (ctx.clientIp && ctx.clientIp !== "unknown") {
        form.set("remoteip", ctx.clientIp);
    }
    let payload;
    try {
        const response = await fetch(spec.endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: form.toString(),
            signal: AbortSignal.timeout(SITEVERIFY_TIMEOUT_MS),
        });
        if (!response.ok) {
            return {
                ok: false,
                indeterminate: true,
                reason: `vendor-http-${response.status}`,
            };
        }
        payload = (await response.json());
    }
    catch (error) {
        return {
            ok: false,
            indeterminate: true,
            reason: `vendor-unreachable: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        };
    }
    if (!(payload === null || payload === void 0 ? void 0 : payload.success)) {
        const codes = Array.isArray(payload === null || payload === void 0 ? void 0 : payload["error-codes"])
            ? payload["error-codes"].join(",")
            : "none";
        if (/invalid-input-secret|invalid-keys|bad-request/.test(codes)) {
            console_1.logger.error("CAPTCHA", `${spec.endpoint} rejected our SECRET KEY (${codes}). The captcha is ` +
                `misconfigured — check Settings → Security → Protection.`);
            return { ok: false, indeterminate: true, reason: `bad-secret: ${codes}` };
        }
        return { ok: false, reason: `rejected: ${codes}` };
    }
    const allowed = allowedHostnames();
    const reported = (payload.hostname || "").toLowerCase();
    if (allowed.length && reported && !allowed.includes(reported)) {
        return {
            ok: false,
            reason: `hostname-mismatch: token minted for ${reported}`,
        };
    }
    if (spec.echoesAction && payload.action && payload.action !== ctx.action) {
        return {
            ok: false,
            reason: `action-mismatch: token is for ${payload.action}, not ${ctx.action}`,
        };
    }
    if (spec.scored && typeof payload.score === "number") {
        if (payload.score < config.scoreThreshold) {
            return {
                ok: false,
                score: payload.score,
                reason: `score ${payload.score} below threshold ${config.scoreThreshold}`,
            };
        }
        return { ok: true, score: payload.score };
    }
    return { ok: true };
}
