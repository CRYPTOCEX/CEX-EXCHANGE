"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Request = void 0;
const uWebSockets_js_1 = require("uWebSockets.js");
const utils_1 = require("../utils");
const validation_1 = require("../utils/validation");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const cookie_parser_1 = require("./utils/cookie-parser");
const header_parser_1 = require("./utils/header-parser");
const address_parser_1 = require("./utils/address-parser");
const body_parser_1 = require("./utils/body-parser");
const param_validator_1 = require("./utils/param-validator");
const abort_latch_1 = require("./utils/abort-latch");
const injection_patterns_1 = require("./utils/injection-patterns");
function checkParam(key, value, isPathParam) {
    if ((0, injection_patterns_1.containsInjection)(value, isPathParam)) {
        throw (0, error_1.createError)({ statusCode: 400, message: `Invalid parameter: ${key}` });
    }
    try {
        const decoded = decodeURIComponent(value);
        if (decoded !== value && (0, injection_patterns_1.containsInjection)(decoded, isPathParam)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid parameter: ${key}` });
        }
    }
    catch (e) {
        if (e.statusCode)
            throw e;
    }
}
const LEGACY_MAX_QUERY_KEYS = 1000;
const LEGACY_TRAILING_TRIM = /[\u0000-\u0020\u00A0\uFEFF]+$/;
function parseQueryString(raw) {
    const source = typeof raw === "string" ? raw : "";
    const trimmed = source.replace(LEGACY_TRAILING_TRIM, "");
    const hash = trimmed.indexOf("#");
    const qs = hash === -1 ? trimmed : trimmed.slice(0, hash);
    const segments = qs.split("&");
    const bounded = segments.length > LEGACY_MAX_QUERY_KEYS
        ? segments.slice(0, LEGACY_MAX_QUERY_KEYS).join("&")
        : qs;
    const out = Object.create(null);
    const params = new URLSearchParams(bounded);
    for (const key of params.keys()) {
        if (key in out)
            continue;
        const values = params.getAll(key);
        out[key] = values.length > 1 ? values : values[0];
    }
    return out;
}
function sanitizeQueryParams(params) {
    const sanitized = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string") {
            checkParam(key, value, false);
        }
        sanitized[key] = value;
    }
    return sanitized;
}
class Request {
    constructor(res, req) {
        this.res = res;
        this.req = req;
        this.keys = [];
        this.rawBodyString = "";
        this.params = {};
        this.cookies = {};
        this.headers = {};
        this.user = null;
        this.connection = {
            encrypted: false,
            remoteAddress: "127.0.0.1",
        };
        this.updatedCookies = {};
        this.responseHeaders = {};
        this.signedAuthFloor = null;
        this.url = req.getUrl();
        this.method = req.getMethod();
        this.query = this.parseQuery();
        this.headers = this.parseHeaders();
        this.cookies = this.parseCookies();
        this.remoteAddress = this.computeRemoteAddress();
        if (this.metadata) {
            try {
                this.validateParametersInternal();
            }
            catch (error) {
                console_1.logger.error("REQUEST", "Parameter validation failed", error);
                throw error;
            }
        }
    }
    parseHeaders() {
        return (0, header_parser_1.parseRequestHeaders)(this.req);
    }
    parseCookies() {
        return (0, cookie_parser_1.parseCookieHeader)(this.headers["cookie"] || "");
    }
    parseQuery() {
        return sanitizeQueryParams(parseQueryString(this.req.getQuery()));
    }
    computeRemoteAddress() {
        return (0, address_parser_1.extractRemoteAddress)(this.res);
    }
    async parseBody() {
        await this.readBody();
        this.validateBody();
    }
    async readBody() {
        var _a;
        if (!(0, body_parser_1.methodSupportsBody)(this.method)) {
            return;
        }
        const contentType = this.headers["content-type"] || "";
        try {
            const bodyContent = await (0, body_parser_1.readRequestBody)(this.res, (_a = this.metadata) === null || _a === void 0 ? void 0 : _a.maxBodyBytes);
            this.rawBodyString = bodyContent;
            this.body = (0, body_parser_1.processBodyContent)(contentType, bodyContent);
        }
        catch (error) {
            console_1.logger.warn("REQUEST", "Error reading body content", error);
            if (error === null || error === void 0 ? void 0 : error.statusCode)
                throw error;
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Error reading request body",
            });
        }
    }
    validateBody() {
        var _a, _b, _c;
        if (!(0, body_parser_1.methodSupportsBody)(this.method)) {
            return;
        }
        const contentType = this.headers["content-type"] || "";
        if (((_a = this.metadata) === null || _a === void 0 ? void 0 : _a.requestBody) &&
            !((_b = this.metadata) === null || _b === void 0 ? void 0 : _b.skipBodyValidation) &&
            !contentType.includes("multipart/form-data")) {
            try {
                const mediaType = Object.keys(this.metadata.requestBody.content)[0];
                const schema = (_c = this.metadata.requestBody.content[mediaType]) === null || _c === void 0 ? void 0 : _c.schema;
                if (schema) {
                    this.body = (0, validation_1.validateSchema)(this.body, schema);
                }
            }
            catch (error) {
                console_1.logger.debug("VALIDATION", `Schema validation failed: ${error.message}`);
                if (error.isValidationError) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: error.message,
                    });
                }
                else {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Schema validation error: ${error.message}`,
                    });
                }
            }
        }
    }
    validateParametersInternal() {
        if (!this.metadata || !this.metadata.parameters)
            return;
        const result = (0, param_validator_1.validateParameters)(this.metadata.parameters, {
            query: this.query,
            headers: this.headers,
            params: this.params,
            cookies: this.cookies,
        });
        this.query = result.query;
        this.params = result.params;
        this.cookies = result.cookies;
    }
    _setRegexparam(keys, regExp) {
        this.keys = keys;
        this.regExp = regExp;
    }
    getHeader(lowerCaseKey) {
        return this.req.getHeader(lowerCaseKey);
    }
    getParameter(index) {
        return this.req.getParameter(index);
    }
    getUrl() {
        return this.req.getUrl();
    }
    getMethod() {
        return this.req.getMethod();
    }
    getCaseSensitiveMethod() {
        return this.req.getCaseSensitiveMethod();
    }
    getQuery() {
        return this.req.getQuery();
    }
    setYield(_yield) {
        this.req.setYield(_yield);
        return _yield;
    }
    extractPathParameters() {
        if (!this.regExp)
            return;
        const matches = this.regExp.exec(this.url);
        if (!matches)
            return;
        this.keys.forEach((key, index) => {
            const value = matches[index + 1];
            if (value !== undefined) {
                const decoded = decodeURIComponent(value);
                checkParam(key, decoded, true);
                this.params[key] = decoded;
            }
        });
    }
    async rawBody() {
        return new Promise((resolve, reject) => {
            this.res.onData((data) => resolve((0, utils_1.handleArrayBuffer)(data)));
            (0, abort_latch_1.onAbort)(this.res, () => reject(null));
        });
    }
    async file() {
        const header = this.req.getHeader("content-type");
        return new Promise((resolve, reject) => {
            let buffer = Buffer.from("");
            this.res.onData((ab, isLast) => {
                buffer = Buffer.concat([buffer, Buffer.from(ab)]);
                if (isLast) {
                    resolve((0, uWebSockets_js_1.getParts)(buffer, header));
                }
            });
            (0, abort_latch_1.onAbort)(this.res, () => reject(null));
        });
    }
    setResponseHeader(name, value) {
        this.responseHeaders[name] = String(value).replace(/[\r\n]/g, "");
    }
    updateCookie(name, value, options = {}) {
        this.updatedCookies[name] = { value, options };
    }
    updateTokens(tokens) {
        Object.entries(tokens).forEach(([name, value]) => {
            this.updatedCookies[name] = { value };
        });
    }
    setMetadata(metadata) {
        this.metadata = metadata;
    }
    getMetadata() {
        return this.metadata;
    }
    setUser(user) {
        this.user = user;
    }
    getUser() {
        return this.user;
    }
}
exports.Request = Request;
