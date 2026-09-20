"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Msg91Provider = void 0;
const BaseSMSProvider_1 = require("./BaseSMSProvider");
const resolve_1 = require("./resolve");
const DEFAULT_BASE_URL = "https://control.msg91.com";
const REQUEST_TIMEOUT_MS = 15000;
const INVALID_AUTHKEY_CODE = "201";
const SPURIOUS_ERROR_ATTEMPTS = 5;
const SPURIOUS_ERROR_BACKOFF_MS = 250;
function isSpuriousTemplateError(message) {
    return (typeof message === "string" &&
        /template\s*id\s*missing|invalid\s*template/i.test(message));
}
class Msg91Provider extends BaseSMSProvider_1.BaseSMSProvider {
    constructor(config) {
        super("MSG91", config);
    }
    loadConfigFromEnv() {
        var _a, _b, _c, _d, _e;
        return {
            authKey: (_a = process.env.MSG91_AUTH_KEY) === null || _a === void 0 ? void 0 : _a.trim(),
            senderId: (_b = process.env.MSG91_SENDER_ID) === null || _b === void 0 ? void 0 : _b.trim(),
            otpTemplateId: (_c = process.env.MSG91_OTP_TEMPLATE_ID) === null || _c === void 0 ? void 0 : _c.trim(),
            baseUrl: (((_d = process.env.MSG91_BASE_URL) === null || _d === void 0 ? void 0 : _d.trim()) || DEFAULT_BASE_URL).replace(/\/+$/, ""),
            dltTeId: (_e = process.env.MSG91_DLT_TE_ID) === null || _e === void 0 ? void 0 : _e.trim(),
        };
    }
    validateConfig() {
        if (!this.config.authKey) {
            this.logError("Missing MSG91_AUTH_KEY", {});
            return false;
        }
        if (!this.config.otpTemplateId) {
            this.logError("Missing MSG91_OTP_TEMPLATE_ID", {});
            return false;
        }
        return true;
    }
    toMsg91Mobile(e164) {
        return e164.replace(/^\+/, "");
    }
    async send(req) {
        var _a;
        if (!(0, resolve_1.isOtpKind)(req.kind)) {
            return {
                success: false,
                error: `MSG91 is configured for one-time codes only and cannot send "${req.kind}". ` +
                    `Non-code messages are delivered by Twilio.`,
            };
        }
        if (!this.validateConfig()) {
            return {
                success: false,
                error: "MSG91 is not configured: set MSG91_AUTH_KEY and MSG91_OTP_TEMPLATE_ID.",
            };
        }
        if (!this.validatePhoneNumber(req.to)) {
            return { success: false, error: `Invalid phone number format: ${req.to}` };
        }
        const code = (_a = req.vars) === null || _a === void 0 ? void 0 : _a.code;
        if (!code) {
            return {
                success: false,
                error: `MSG91 requires a "code" variable for kind "${req.kind}"`,
            };
        }
        const recipient = {
            mobiles: this.toMsg91Mobile(req.to),
            OTP: code,
            otp: code,
            code: code,
            VAR1: code,
        };
        const body = {
            template_id: this.config.otpTemplateId,
            realTimeResponse: "1",
            short_url: "0",
            recipients: [recipient],
        };
        if (this.config.senderId)
            body.sender = this.config.senderId;
        if (this.config.dltTeId)
            body.DLT_TE_ID = this.config.dltTeId;
        const outcome = await this.sendWithRetry(body, req);
        return outcome;
    }
    async sendWithRetry(body, req) {
        var _a;
        let lastError = "Failed to send OTP via MSG91";
        for (let attempt = 1; attempt <= SPURIOUS_ERROR_ATTEMPTS; attempt++) {
            try {
                const { status, payload } = await this.request("/api/v5/flow/", "POST", body);
                const type = String((_a = payload === null || payload === void 0 ? void 0 : payload.type) !== null && _a !== void 0 ? _a : "").toLowerCase();
                if (status < 400 && type === "success") {
                    const requestId = typeof (payload === null || payload === void 0 ? void 0 : payload.message) === "string" ? payload.message : undefined;
                    this.log("OTP accepted by MSG91", {
                        to: req.to,
                        kind: req.kind,
                        requestId,
                        ...(attempt > 1 ? { attempts: attempt } : {}),
                    });
                    return {
                        success: true,
                        messageId: requestId ? `msg91-${requestId}` : undefined,
                        externalId: requestId,
                        metadata: { accepted: true, delivered: null, kind: req.kind, attempts: attempt },
                    };
                }
                const errCode = (payload === null || payload === void 0 ? void 0 : payload.code) ? String(payload.code) : undefined;
                lastError = this.describeError(errCode, payload === null || payload === void 0 ? void 0 : payload.message, status);
                if (!isSpuriousTemplateError(payload === null || payload === void 0 ? void 0 : payload.message))
                    return { success: false, error: lastError };
                if (attempt < SPURIOUS_ERROR_ATTEMPTS) {
                    this.log("MSG91 returned a spurious template error, retrying", {
                        attempt,
                        of: SPURIOUS_ERROR_ATTEMPTS,
                    });
                    await new Promise((r) => setTimeout(r, SPURIOUS_ERROR_BACKOFF_MS * attempt));
                }
            }
            catch (error) {
                this.logError("Failed to send OTP via MSG91", error);
                return {
                    success: false,
                    error: (error === null || error === void 0 ? void 0 : error.message) || "Failed to send OTP via MSG91",
                };
            }
        }
        this.logError(`MSG91 rejected the template on all ${SPURIOUS_ERROR_ATTEMPTS} attempts`, new Error(lastError));
        return { success: false, error: lastError };
    }
    async healthCheck() {
        var _a;
        if (!this.config.authKey) {
            return { ok: false, message: "MSG91_AUTH_KEY is not set." };
        }
        try {
            const { status, payload } = await this.request("/api/v5/report/logs/p/sms", "POST", {});
            const code = (_a = payload === null || payload === void 0 ? void 0 : payload.apiError) !== null && _a !== void 0 ? _a : payload === null || payload === void 0 ? void 0 : payload.code;
            if (status === 401 || String(code) === INVALID_AUTHKEY_CODE) {
                return {
                    ok: false,
                    message: "MSG91 rejected MSG91_AUTH_KEY (code 201, invalid authkey). If this " +
                        "value came from an OTP Widget snippet it is a `tokenAuth`, which is " +
                        "a public browser token and cannot authenticate server-side calls. " +
                        "Use the authkey from MSG91 dashboard -> Settings -> API Keys.",
                };
            }
            if (status >= 400) {
                return { ok: false, message: `MSG91 report API returned HTTP ${status}.` };
            }
            const balance = await this.readBalance();
            return {
                ok: true,
                message: balance === 0
                    ? "MSG91 credentials accepted. Reported balance is 0 — MSG91's " +
                        "balance figure is per-route and often reads 0 on a funded " +
                        "account, so check the panel rather than trusting this number. " +
                        "With genuinely no credit, sends are accepted and silently dropped."
                    : "MSG91 credentials accepted.",
            };
        }
        catch (error) {
            return {
                ok: false,
                message: `Could not reach MSG91: ${(error === null || error === void 0 ? void 0 : error.message) || "unknown error"}`,
            };
        }
    }
    async readBalance() {
        try {
            const url = `${this.config.baseUrl}/api/balance.php` +
                `?authkey=${encodeURIComponent(this.config.authKey)}&type=4`;
            const res = await fetch(url, {
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            });
            if (!res.ok)
                return null;
            const text = (await res.text()).trim();
            if (!/^\d+(\.\d+)?$/.test(text))
                return null;
            return Number(text);
        }
        catch (_a) {
            return null;
        }
    }
    describeError(code, message, status) {
        if (code === INVALID_AUTHKEY_CODE) {
            return ("MSG91 rejected the authkey (code 201). If it came from an OTP Widget " +
                "snippet it is a `tokenAuth`, not a server authkey.");
        }
        const detail = typeof message === "string" && message
            ? message
            : `HTTP ${status} with no message`;
        return `MSG91 error: ${detail}`;
    }
    async request(path, method, body) {
        const res = await fetch(`${this.config.baseUrl}${path}`, {
            method,
            headers: {
                "Content-Type": "application/json",
                accept: "application/json",
                authkey: this.config.authKey,
            },
            body: body === undefined ? undefined : JSON.stringify(body),
            signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
        });
        const text = await res.text();
        let payload = null;
        try {
            payload = text ? JSON.parse(text) : null;
        }
        catch (_a) {
            payload = { message: text };
        }
        return { status: res.status, payload };
    }
}
exports.Msg91Provider = Msg91Provider;
