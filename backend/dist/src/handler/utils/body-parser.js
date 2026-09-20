"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_MAX_BODY_BYTES = void 0;
exports.readRequestBody = readRequestBody;
exports.processBodyContent = processBodyContent;
exports.methodSupportsBody = methodSupportsBody;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const abort_latch_1 = require("./abort-latch");
exports.DEFAULT_MAX_BODY_BYTES = 5 * 1024 * 1024;
function describeLimit(bytes) {
    const mb = bytes / (1024 * 1024);
    return `${mb >= 10 ? Math.round(mb) : Math.round(mb * 10) / 10} MB`;
}
async function readRequestBody(res, maxBytes) {
    const limit = typeof maxBytes === "number" && Number.isFinite(maxBytes) && maxBytes > 0
        ? Math.floor(maxBytes)
        : exports.DEFAULT_MAX_BODY_BYTES;
    const bodyChunks = [];
    return new Promise((resolve, reject) => {
        let hadData = false;
        let totalBytes = 0;
        let exceeded = false;
        res.onData((ab, isLast) => {
            hadData = true;
            if (exceeded) {
                return;
            }
            totalBytes += ab.byteLength;
            if (totalBytes > limit) {
                exceeded = true;
                reject((0, error_1.createError)({
                    statusCode: 413,
                    message: `Request body too large (this endpoint accepts at most ${describeLimit(limit)})`,
                }));
                return;
            }
            bodyChunks.push(Buffer.from(new Uint8Array(ab)));
            if (isLast) {
                resolve(Buffer.concat(bodyChunks).toString("utf8"));
            }
        });
        (0, abort_latch_1.onAbort)(res, () => {
            if (!hadData) {
                resolve("");
            }
            else {
                reject(new Error("Request aborted"));
            }
        });
    });
}
function processBodyContent(contentType, bodyContent) {
    const trimmedBody = bodyContent.trim();
    if (contentType.includes("application/json") && trimmedBody !== "") {
        try {
            return JSON.parse(trimmedBody);
        }
        catch (error) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid JSON: ${error.message}` });
        }
    }
    else if (contentType.includes("application/x-www-form-urlencoded")) {
        return Object.fromEntries(new URLSearchParams(trimmedBody));
    }
    if (trimmedBody && (trimmedBody.startsWith("{") || trimmedBody.startsWith("["))) {
        try {
            console_1.logger.warn("BODY_PARSER", `Missing or incorrect Content-Type header (got "${contentType}"), but body looks like JSON. Attempting JSON parse.`);
            return JSON.parse(trimmedBody);
        }
        catch (_a) {
        }
    }
    return trimmedBody || {};
}
function methodSupportsBody(method) {
    return ["post", "put", "patch", "delete"].includes(method.toLowerCase());
}
