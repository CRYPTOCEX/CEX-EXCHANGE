"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Response = void 0;
exports.initializeResponseSecurity = initializeResponseSecurity;
exports.verifyResponseSecurity = verifyResponseSecurity;
exports.getResponseSecurityStatus = getResponseSecurityStatus;
const utils_1 = require("../utils");
const console_1 = require("@b/utils/console");
const cookie_parser_1 = require("./utils/cookie-parser");
const abort_latch_1 = require("./utils/abort-latch");
const response_compression_1 = require("./utils/response-compression");
const header_parser_1 = require("./utils/header-parser");
const isProd = process.env.NODE_ENV === "production";
let _securityTokenInitialized = false;
let _securityToken = null;
let _responseCount = 0;
function initializeResponseSecurity(token) {
    if (_securityTokenInitialized)
        return;
    _securityToken = token;
    _securityTokenInitialized = true;
}
function verifyResponseSecurity() {
    return _securityTokenInitialized && _securityToken !== null && _securityToken.length >= 32;
}
function getResponseSecurityStatus() {
    return { initialized: _securityTokenInitialized, responseCount: _responseCount };
}
class Response {
    constructor(res) {
        this.res = res;
        this.aborted = false;
        this.finished = false;
        this.sentStatus = null;
        this.sentMessage = null;
        (0, abort_latch_1.onAbort)(this.res, () => {
            this.aborted = true;
        });
        _responseCount++;
    }
    isAborted() {
        return this.aborted;
    }
    isDone() {
        return this.aborted || this.finished;
    }
    handleError(code, message, extraHeaders) {
        if (this.isDone()) {
            return;
        }
        const errorMsg = typeof message === "string" ? message : String(message);
        this.sentStatus = code;
        this.sentMessage = errorMsg;
        this.finished = true;
        this.res.cork(() => {
            this.res
                .writeStatus(`${code} ${(0, utils_1.getStatusMessage)(code)}`)
                .writeHeader("Content-Type", "application/json")
                .writeHeader("Content-Encoding", "identity")
                .writeHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                .writeHeader("Pragma", "no-cache")
                .writeHeader("Expires", "0");
            if (extraHeaders) {
                for (const [key, value] of Object.entries(extraHeaders)) {
                    this.res.writeHeader(key, String(value));
                }
            }
            this.res.end(JSON.stringify({ message: errorMsg, statusCode: code }));
        });
    }
    handleLicenseError(code, licenseData) {
        if (this.isDone()) {
            return;
        }
        this.sentStatus = code;
        this.sentMessage = licenseData.message;
        this.finished = true;
        this.res.cork(() => {
            this.res
                .writeStatus(`${code} ${(0, utils_1.getStatusMessage)(code)}`)
                .writeHeader("Content-Type", "application/json")
                .writeHeader("Content-Encoding", "identity")
                .writeHeader("Cache-Control", "no-cache, no-store, must-revalidate")
                .writeHeader("Pragma", "no-cache")
                .writeHeader("Expires", "0")
                .end(JSON.stringify({
                message: licenseData.message,
                statusCode: code,
                licenseRequired: true,
                productId: licenseData.productId,
                productType: licenseData.type,
                productName: licenseData.extension || licenseData.blockchain || null,
            }));
        });
    }
    pause() {
        this.res.pause();
    }
    resume() {
        this.res.resume();
    }
    writeStatus(status) {
        return this.res.writeStatus(status);
    }
    writeHeader(key, value) {
        return this.res.writeHeader(key, value);
    }
    write(chunk) {
        return this.res.write(chunk);
    }
    endWithoutBody(reportedContentLength, closeConnection) {
        if (this.isDone()) {
            return;
        }
        this.finished = true;
        this.res.endWithoutBody(reportedContentLength, closeConnection);
    }
    tryEnd(fullBodyOrChunk, totalSize) {
        if (this.isDone()) {
            return false;
        }
        const [result, done] = this.res.tryEnd(fullBodyOrChunk, totalSize);
        if (done) {
            this.finished = true;
        }
        return result;
    }
    close() {
        if (this.isDone()) {
            return;
        }
        this.finished = true;
        this.res.close();
    }
    getWriteOffset() {
        return this.res.getWriteOffset();
    }
    onWritable(handler) {
        this.res.onWritable(handler);
    }
    onAborted(handler) {
        (0, abort_latch_1.onAbort)(this.res, handler);
    }
    onData(handler) {
        this.res.onData(handler);
    }
    getRemoteAddress() {
        return this.res.getRemoteAddress();
    }
    getRemoteAddressAsText() {
        const addrBuffer = this.res.getRemoteAddressAsText();
        return new TextDecoder().decode(addrBuffer);
    }
    getProxiedRemoteAddress() {
        return this.res.getProxiedRemoteAddress();
    }
    getProxiedRemoteAddressAsText() {
        const addrBuffer = this.res.getProxiedRemoteAddressAsText();
        return new TextDecoder().decode(addrBuffer);
    }
    cork(cb) {
        this.res.cork(cb);
    }
    status(statusCode) {
        const message = (0, utils_1.getStatusMessage)(statusCode);
        this.writeStatus(`${statusCode} ${message}`);
        return this;
    }
    upgrade(userData, secWebSocketKey, secWebSocketProtocol, secWebSocketExtensions, context) {
        if (this.isDone()) {
            return;
        }
        this.finished = true;
        this.res.upgrade(userData, secWebSocketKey, secWebSocketProtocol, secWebSocketExtensions, context);
    }
    end(body, closeConnection) {
        if (this.isDone()) {
            return;
        }
        this.finished = true;
        this.res.end(body, closeConnection);
    }
    json(data) {
        if (this.isDone()) {
            return;
        }
        this.finished = true;
        this.res
            .writeHeader("Content-Type", "application/json")
            .end(JSON.stringify(data));
    }
    pipe(stream) {
        this.res.pipe(stream);
    }
    setSecureCookie(name, value, options) {
        const cookieValue = (0, cookie_parser_1.buildCookieHeader)(name, value, {
            path: "/",
            httpOnly: options.httpOnly,
            secure: options.secure,
            sameSite: options.sameSite,
        });
        this.writeHeader("Set-Cookie", cookieValue);
    }
    setSecureCookies({ accessToken, csrfToken, sessionId, }, request) {
        const secure = isProd;
        this.setSecureCookie("accessToken", accessToken, {
            httpOnly: true,
            secure,
            sameSite: "None",
        });
        this.setSecureCookie("csrfToken", csrfToken, {
            httpOnly: false,
            secure,
            sameSite: "Strict",
        });
        this.setSecureCookie("sessionId", sessionId, {
            httpOnly: true,
            secure,
            sameSite: "None",
        });
        this.applyUpdatedCookies(request);
    }
    applyUpdatedCookies(request) {
        const cookiesToUpdate = ["accessToken", "csrfToken", "sessionId"];
        cookiesToUpdate.forEach((cookieName) => {
            if (request.updatedCookies[cookieName]) {
                const { value } = request.updatedCookies[cookieName];
                if ((0, header_parser_1.isAppPlatform)(request.headers)) {
                    this.writeHeader(cookieName, value);
                    return;
                }
                const expiration = (0, utils_1.getCommonExpiration)(cookieName) || null;
                const isCsrf = cookieName === "csrfToken";
                const cookieValue = (0, cookie_parser_1.buildCookieHeader)(cookieName, value, {
                    path: "/",
                    httpOnly: !isCsrf,
                    secure: process.env.NODE_ENV === "production",
                    sameSite: isCsrf
                        ? "Strict"
                        : process.env.NODE_ENV === "production"
                            ? "None"
                            : "Lax",
                    expires: expiration || undefined,
                });
                this.writeHeader("Set-Cookie", cookieValue);
            }
        });
    }
    writeStagedHeaders(req) {
        const staged = req === null || req === void 0 ? void 0 : req.responseHeaders;
        if (!staged)
            return;
        for (const [key, value] of Object.entries(staged)) {
            this.res.writeHeader(key, value);
        }
    }
    writeCommonHeaders() {
        Object.entries(header_parser_1.SECURITY_HEADERS).forEach(([key, value]) => {
            this.res.writeHeader(key, value);
        });
    }
    deleteSecureCookies() {
        ["accessToken", "csrfToken", "sessionId"].forEach((cookieName) => {
            this.writeHeader("Set-Cookie", `${cookieName}=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT;`);
        });
    }
    streamBinary(req, status, payload) {
        const { stream, headers } = payload;
        const size = Number(payload.size) || 0;
        let stopped = false;
        const stop = () => {
            if (stopped)
                return;
            stopped = true;
            try {
                stream.destroy();
            }
            catch (_a) {
            }
        };
        this.onAborted(stop);
        try {
            this.res.cork(() => {
                this.res.writeStatus(`${status} ${(0, utils_1.getStatusMessage)(status)}`);
                Object.entries(headers).forEach(([key, value]) => {
                    if (String(key).toLowerCase() === "content-length")
                        return;
                    this.res.writeHeader(key, String(value));
                });
                this.writeStagedHeaders(req);
                if (size === 0) {
                    this.finished = true;
                    this.res.end();
                }
            });
        }
        catch (error) {
            console_1.logger.error("RESPONSE", "Error starting streamed response", error);
            stop();
            return;
        }
        if (size === 0) {
            stop();
            return;
        }
        stream.on("data", (chunk) => {
            if (this.isDone()) {
                stop();
                return;
            }
            const bytes = chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength);
            const chunkOffset = this.res.getWriteOffset();
            let ok = false;
            try {
                this.res.cork(() => {
                    ok = this.tryEnd(bytes, size);
                });
            }
            catch (error) {
                console_1.logger.error("RESPONSE", "Error writing streamed chunk", error);
                stop();
                return;
            }
            if (this.isDone()) {
                stop();
                return;
            }
            if (ok)
                return;
            stream.pause();
            this.res.onWritable((offset) => {
                if (this.isDone()) {
                    stop();
                    return true;
                }
                let again = false;
                try {
                    this.res.cork(() => {
                        again = this.tryEnd(bytes.slice(offset - chunkOffset), size);
                    });
                }
                catch (error) {
                    console_1.logger.error("RESPONSE", "Error resuming streamed chunk", error);
                    stop();
                    return true;
                }
                if (this.isDone()) {
                    stop();
                    return true;
                }
                if (again)
                    stream.resume();
                return again;
            });
        });
        stream.on("error", (error) => {
            console_1.logger.error("RESPONSE", "Error reading streamed response body", error);
            if (!this.isDone()) {
                this.finished = true;
                try {
                    this.res.close();
                }
                catch (_a) {
                }
            }
        });
        stream.on("end", () => {
            if (!this.isDone()) {
                console_1.logger.warn("RESPONSE", `Streamed body ended before its declared size (${size} bytes)`);
                this.finished = true;
                try {
                    this.res.close();
                }
                catch (_a) {
                }
            }
        });
    }
    async sendResponse(req, statusCode, responseData, responseType) {
        var _a, _b;
        if (this.isDone()) {
            return;
        }
        this.sentStatus = Number(statusCode);
        if (this.sentStatus >= 400) {
            this.sentMessage = (_b = (_a = responseData === null || responseData === void 0 ? void 0 : responseData.message) !== null && _a !== void 0 ? _a : responseData === null || responseData === void 0 ? void 0 : responseData.msg) !== null && _b !== void 0 ? _b : null;
        }
        const binaryStatus = () => {
            const named = Number(responseData === null || responseData === void 0 ? void 0 : responseData.statusCode);
            return named >= 200 && named < 600 ? named : Number(statusCode);
        };
        if (responseType === "binary" && (responseData === null || responseData === void 0 ? void 0 : responseData.stream) && (responseData === null || responseData === void 0 ? void 0 : responseData.headers)) {
            this.sentStatus = binaryStatus();
            this.streamBinary(req, this.sentStatus, responseData);
            return;
        }
        this.finished = true;
        try {
            if (responseType === "binary" && (responseData === null || responseData === void 0 ? void 0 : responseData.data) && (responseData === null || responseData === void 0 ? void 0 : responseData.headers)) {
                const status = binaryStatus();
                this.sentStatus = status;
                this.res.cork(() => {
                    this.res.writeStatus(`${status} ${(0, utils_1.getStatusMessage)(status)}`);
                    Object.entries(responseData.headers).forEach(([key, value]) => {
                        if (String(key).toLowerCase() === "content-length")
                            return;
                        this.res.writeHeader(key, String(value));
                    });
                    this.writeStagedHeaders(req);
                    this.res.end(responseData.data);
                });
                return;
            }
            this.res.cork(() => {
                this.res.writeStatus(`${statusCode} ${(0, utils_1.getStatusMessage)(Number(statusCode))}`);
                this.stageCookiesFromBody(req, Number(statusCode), responseData);
                const acceptEncoding = req.headers["accept-encoding"] || "";
                const { buffer, encoding } = (0, response_compression_1.compressData)((0, response_compression_1.serializeResponseData)(responseData), acceptEncoding);
                this.res.writeHeader("Content-Encoding", encoding);
                if (req.url.startsWith("/api/auth") || (0, header_parser_1.isAppPlatform)(req.headers)) {
                    this.applyUpdatedCookies(req);
                }
                this.writeCommonHeaders();
                this.writeStagedHeaders(req);
                this.res.writeHeader("Content-Type", "application/json");
                this.res.end(buffer);
            });
        }
        catch (error) {
            console_1.logger.error("RESPONSE", "Error sending response", error);
            if (this.aborted) {
                return;
            }
            try {
                this.res.cork(() => {
                    this.res.writeStatus("500").end(error.message);
                });
            }
            catch (_c) {
            }
        }
    }
    stageCookiesFromBody(req, statusCode, responseData) {
        if (!(responseData === null || responseData === void 0 ? void 0 : responseData.cookies) || ![200, 201].includes(statusCode))
            return;
        Object.entries(responseData.cookies).forEach(([name, value]) => {
            req.updateCookie(name, value);
        });
        if (!(0, header_parser_1.isAppPlatform)(req.headers)) {
            delete responseData.cookies;
        }
    }
}
exports.Response = Response;
