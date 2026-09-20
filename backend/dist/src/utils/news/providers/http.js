"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.newsHttpGet = newsHttpGet;
exports.parseJsonBody = parseJsonBody;
const DEFAULT_TIMEOUT_MS = 15000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;
function classify(status, vendor) {
    if (status === 401 || status === 403) {
        return {
            message: `${vendor} rejected the credential (HTTP ${status}) — the key is missing, wrong, or not entitled to this endpoint on your plan`,
            retryable: false,
        };
    }
    if (status === 404) {
        return {
            message: `${vendor} answered 404 — the endpoint or feed URL does not exist`,
            retryable: false,
        };
    }
    if (status === 429) {
        return {
            message: `${vendor} rate-limited this request (HTTP 429) — the next scheduled run will try again`,
            retryable: true,
        };
    }
    return {
        message: `${vendor} answered HTTP ${status}`,
        retryable: true,
    };
}
async function newsHttpGet(vendor, url, options = {}) {
    var _a;
    var _b, _c, _d;
    const timeoutMs = (_b = options.timeoutMs) !== null && _b !== void 0 ? _b : DEFAULT_TIMEOUT_MS;
    const maxBytes = (_c = options.maxBytes) !== null && _c !== void 0 ? _c : DEFAULT_MAX_BYTES;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(url, {
            signal: controller.signal,
            headers: {
                "User-Agent": "MarketNewsBot/1.0",
                Accept: "application/json, application/rss+xml, application/xml, text/xml, */*",
                ...((_d = options.headers) !== null && _d !== void 0 ? _d : {}),
            },
            redirect: "follow",
        });
        if (!response.ok) {
            return { ok: false, error: classify(response.status, vendor) };
        }
        const reader = (_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader();
        if (!reader) {
            return {
                ok: false,
                error: { message: `${vendor} returned an empty response`, retryable: true },
            };
        }
        const chunks = [];
        let total = 0;
        for (;;) {
            const { done, value } = await reader.read();
            if (done)
                break;
            if (!value)
                continue;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel().catch(() => undefined);
                return {
                    ok: false,
                    error: {
                        message: `${vendor} returned more than ${Math.round(maxBytes / 1024 / 1024)} MB — refusing to buffer it`,
                        retryable: true,
                    },
                };
            }
            chunks.push(value);
        }
        return { ok: true, body: Buffer.concat(chunks).toString("utf8") };
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) === "AbortError") {
            return {
                ok: false,
                error: {
                    message: `${vendor} did not answer within ${Math.round(timeoutMs / 1000)}s`,
                    retryable: true,
                },
            };
        }
        return {
            ok: false,
            error: {
                message: `${vendor} could not be reached: ${(error === null || error === void 0 ? void 0 : error.message) || "network error"}`,
                retryable: true,
            },
        };
    }
    finally {
        clearTimeout(timer);
    }
}
function parseJsonBody(vendor, body) {
    try {
        return { ok: true, value: JSON.parse(body) };
    }
    catch (_a) {
        return {
            ok: false,
            error: {
                message: `${vendor} returned a body that is not JSON — the endpoint may have moved or a proxy may be intercepting it`,
                retryable: true,
            },
        };
    }
}
