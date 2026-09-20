"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.routeCache = void 0;
exports.setupApiRoutes = setupApiRoutes;
exports.processMiddleware = processMiddleware;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const Middleware_1 = require("../handler/Middleware");
const validation_1 = require("@b/utils/validation");
const constants_1 = require("@b/utils/constants");
const console_1 = require("@b/utils/console");
const Websocket_1 = require("./Websocket");
const cors_handler_1 = require("./utils/cors-handler");
const rate_limiter_1 = require("./utils/rate-limiter");
const load_handler_module_1 = require("./utils/load-handler-module");
const demoMask_1 = require("@b/utils/demoMask");
const error_1 = require("@b/utils/error");
const safe_imports_1 = require("@b/utils/safe-imports");
const adminAudit_1 = require("@b/services/audit/adminAudit");
const admissionModule = (0, safe_imports_1.requireOptionalModule)("@b/api/(ext)/ecosystem/utils/scale/admission");
const admissionDoorFor = (_a = admissionModule === null || admissionModule === void 0 ? void 0 : admissionModule.admissionDoorFor) !== null && _a !== void 0 ? _a : (() => null);
const admissionGate = (_b = admissionModule === null || admissionModule === void 0 ? void 0 : admissionModule.admissionGate) !== null && _b !== void 0 ? _b : (() => () => { });
const renderAdmissionRefusal = (_c = admissionModule === null || admissionModule === void 0 ? void 0 : admissionModule.renderAdmissionRefusal) !== null && _c !== void 0 ? _c : (async () => { });
const fileExtension = constants_1.isProduction ? ".js" : ".ts";
exports.routeCache = new Map();
async function setupApiRoutes(app, startPath, basePath = "/api") {
    try {
        const entries = await promises_1.default.readdir(startPath, { withFileTypes: true });
        const files = [];
        const directories = [];
        const bracketDirs = [];
        for (const entry of entries) {
            if ((entry.isDirectory() && entry.name === "util") ||
                entry.name === `queries${fileExtension}` ||
                entry.name === `utils${fileExtension}`) {
                continue;
            }
            const entryPath = (0, validation_1.sanitizePath)(path_1.default.join(startPath, entry.name));
            if (entry.isDirectory()) {
                let newBasePath = basePath;
                if (!/^\(.*\)$/.test(entry.name)) {
                    newBasePath = `${basePath}/${entry.name.replace(/\[(\w+)\]/, ":$1")}`;
                }
                if (entry.name.includes("[")) {
                    bracketDirs.push({ entry, entryPath, newBasePath });
                }
                else {
                    directories.push({ entry, entryPath, newBasePath });
                }
            }
            else {
                if (entry.name.endsWith(fileExtension)) {
                    files.push({ entry, entryPath });
                }
            }
        }
        await Promise.all(files.map(async ({ entry, entryPath }) => {
            const [fileName, method] = entry.name.split(".");
            const routePrefix = basePath;
            let routePath = routePrefix + (fileName !== "index" ? `/${fileName}` : "");
            routePath = routePath
                .replace(/\[(\w+)\]/g, ":$1")
                .replace(/\.get|\.post|\.put|\.delete|\.del|\.ws/, "");
            if (typeof app[method] === "function") {
                try {
                    if (method === "ws") {
                        await (0, Websocket_1.setupWebSocketEndpoint)(app, routePath, entryPath);
                    }
                    else {
                        await handleHttpMethod(app, method, routePath, entryPath);
                    }
                }
                catch (error) {
                    if ((0, safe_imports_1.isMissingOptionalAddon)(error, entryPath)) {
                        console_1.logger.warn("ROUTES", `Skipping ${routePath} — it needs an extension that is not installed on this server`);
                    }
                    else {
                        console_1.logger.error("ROUTES", `Skipping ${routePath} — its handler module failed to load`, error);
                    }
                }
            }
        }));
        await Promise.all(directories.map(({ entryPath, newBasePath }) => setupApiRoutes(app, entryPath, newBasePath)));
        await Promise.all(bracketDirs.map(({ entryPath, newBasePath }) => setupApiRoutes(app, entryPath, newBasePath)));
    }
    catch (error) {
        console_1.logger.error("ROUTES", `Error setting up API routes in ${startPath}`, error);
        throw error;
    }
}
async function handleHttpMethod(app, method, routePath, entryPath) {
    const admissionDoor = admissionDoorFor(routePath);
    app[method](routePath, async (res, req) => {
        var _a;
        let metadata, handler;
        const cached = exports.routeCache.get(entryPath);
        if (cached) {
            handler = cached.handler;
            metadata = cached.metadata;
            req.setMetadata(metadata);
        }
        else {
            try {
                const handlerModule = (0, load_handler_module_1.loadHandlerModule)(entryPath);
                handler = handlerModule.default;
                if (!handler) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Handler not found for ${entryPath}` });
                }
                metadata = handlerModule.metadata;
                if (!metadata) {
                    throw (0, error_1.createError)({ statusCode: 404, message: `Metadata not found for ${entryPath}` });
                }
                req.setMetadata(metadata);
                reportUnknownMiddleware(metadata, entryPath);
                exports.routeCache.set(entryPath, { handler, metadata });
            }
            catch (error) {
                if ((0, safe_imports_1.isMissingOptionalAddon)(error, entryPath)) {
                    console_1.logger.warn("ROUTE", `${routePath} requires an extension that is not installed`);
                    res.handleError(503, "This endpoint requires an extension that is not installed on this server.");
                    return;
                }
                console_1.logger.error("ROUTE", `Error loading handler for ${entryPath}`, error);
                res.handleError(500, error.message);
                return;
            }
        }
        if (typeof handler !== "function") {
            throw (0, error_1.createError)({ statusCode: 500, message: `Handler is not a function for ${entryPath}` });
        }
        const failBody = (error) => {
            console_1.logger.debug("ROUTE", `Error parsing request body for ${entryPath}: ${error.message}`);
            void (0, rate_limiter_1.chargeSignedAuthFailure)(req);
            if ((0, cors_handler_1.isHbBotApiPath)((req.url || "").split("?")[0])) {
                res.sendResponse(req, error.statusCode || 400, {
                    code: -1102,
                    msg: error.message || "Invalid request body",
                });
                return;
            }
            res.handleError(error.statusCode || 400, error.message || `Invalid request body`, req.responseHeaders);
        };
        const validateGuardedBody = (ctx) => {
            ctx.debug("Validating request body");
            try {
                req.validateBody();
                return true;
            }
            catch (error) {
                ctx.fail(error.message || "Invalid request body");
                failBody(error);
                return false;
            }
        };
        const runChain = async (ctx) => {
            req.ctx = ctx;
            try {
                await req.readBody();
            }
            catch (error) {
                ctx.fail(error.message || "Invalid request body");
                failBody(error);
                return;
            }
            if (metadata.requiresApi) {
                
                    await (0, Middleware_1.rateLimit)(res, req, async () => {
                        await (0, Middleware_1.handleApiVerification)(res, req, async () => {
                            if (!validateGuardedBody(ctx))
                                return;
                            await handleRequest(res, req, handler, entryPath, metadata);
                        });
                    });
                
                return;
            }
            if (!metadata.requiresAuth) {
                
                    await (0, Middleware_1.rateLimit)(res, req, async () => {
                        if (metadata.optionalAuth) {
                            await (0, Middleware_1.resolveOptionalUser)(req);
                        }
                        if (!validateGuardedBody(ctx))
                            return;
                        await handleRequest(res, req, handler, entryPath, metadata);
                    });
                
                return;
            }
            
                await (0, Middleware_1.rateLimit)(res, req, async () => {
                    await (0, Middleware_1.authenticate)(res, req, async () => {
                        await (0, Middleware_1.rolesGate)(app, res, req, routePath, method, async () => {
                            if (!validateGuardedBody(ctx))
                                return;
                            await handleRequest(res, req, handler, entryPath, metadata);
                        });
                    });
                });
            
        };
        let releaseAdmission = null;
        if (admissionDoor) {
            const verdict = admissionGate(admissionDoor);
            if (typeof verdict !== "function") {
                await renderAdmissionRefusal(admissionDoor, res, req, verdict);
                return;
            }
            releaseAdmission = verdict;
        }
        try {
            await (0, console_1.withLogger)((metadata === null || metadata === void 0 ? void 0 : metadata.logModule) || fallbackLogModule(routePath), (metadata === null || metadata === void 0 ? void 0 : metadata.logTitle) || `${method.toUpperCase()} ${routePath}`, {}, async (ctx) => {
                var _a;
                try {
                    await runChain(ctx);
                }
                finally {
                    if ((_a = req.user) === null || _a === void 0 ? void 0 : _a.id)
                        ctx.userId = req.user.id;
                    const status = res.sentStatus;
                    if (status && status >= 400 && ctx._status === "running") {
                        ctx.fail(`${status} ${res.sentMessage || "Request refused"}`);
                    }
                    else if (status === null && ctx._status === "running") {
                        ctx.fail(res.isAborted()
                            ? "Client disconnected before a response was sent"
                            : "Handler returned without sending a response");
                    }
                }
            }, { method: method.toUpperCase(), url: ((_a = req.url) === null || _a === void 0 ? void 0 : _a.split("?")[0]) || routePath });
        }
        finally {
            if (releaseAdmission)
                releaseAdmission();
        }
    });
}
function fallbackLogModule(routePath) {
    const segments = routePath.split("/").filter(Boolean);
    if (segments[0] === "api")
        segments.shift();
    const parts = segments
        .filter((p) => !p.startsWith(":") && !p.startsWith("*"))
        .slice(0, 2)
        .map((p) => p.replace(/[^a-zA-Z0-9]+/g, "_").toUpperCase());
    return parts.join("_") || "API";
}
async function processMiddleware(middleware, req) {
    for (const entry of middleware) {
        if (typeof entry === "function") {
            await entry(req);
            continue;
        }
        if (typeof entry === "string") {
            const rateLimiter = Middleware_1.rateLimiters[entry];
            if (rateLimiter) {
                await rateLimiter(req);
            }
            else {
                console_1.logger.warn("MIDDLEWARE", `Unknown middleware: ${entry}`);
            }
            continue;
        }
        console_1.logger.error("MIDDLEWARE", `Middleware entry is neither a limiter name nor a function (${typeof entry}), so NO limit is applied`);
    }
}
const reportedUnknownMiddleware = new Set();
function reportUnknownMiddleware(metadata, entryPath) {
    const names = metadata === null || metadata === void 0 ? void 0 : metadata.middleware;
    if (!Array.isArray(names))
        return;
    for (const name of names) {
        if (typeof name === "function")
            continue;
        if (typeof name !== "string") {
            const dedupeKey = `${entryPath}:<${typeof name}>`;
            if (reportedUnknownMiddleware.has(dedupeKey))
                continue;
            reportedUnknownMiddleware.add(dedupeKey);
            console_1.logger.error("MIDDLEWARE", `${entryPath}: middleware entry is ${typeof name}, not a limiter name or ` +
                `function, so NO limit is applied`);
            continue;
        }
        if (Middleware_1.rateLimiters[name])
            continue;
        const dedupeKey = `${entryPath}:${name}`;
        if (reportedUnknownMiddleware.has(dedupeKey))
            continue;
        reportedUnknownMiddleware.add(dedupeKey);
        const known = Object.keys(Middleware_1.rateLimiters);
        const stripped = name.replace(/RateLimit$/, "");
        const suggestion = known.find((k) => k === stripped) ||
            known.find((k) => k.toLowerCase() === stripped.toLowerCase());
        console_1.logger.error("MIDDLEWARE", `${entryPath}: middleware "${name}" matches no rate limiter, so NO limit is applied` +
            (suggestion ? ` (did you mean "${suggestion}"?)` : ""));
    }
}
async function handleRequest(res, req, handler, entryPath, metadata) {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h;
    const hasLogging = (metadata === null || metadata === void 0 ? void 0 : metadata.logModule) && (metadata === null || metadata === void 0 ? void 0 : metadata.logTitle);
    try {
        if ((metadata === null || metadata === void 0 ? void 0 : metadata.middleware) && Array.isArray(metadata.middleware)) {
            await processMiddleware(metadata.middleware, req);
        }
        let result = await handler(req);
        if (hasLogging && (0, adminAudit_1.shouldAudit)(req.method, (_a = req.url) === null || _a === void 0 ? void 0 : _a.split("?")[0], metadata)) {
            (0, adminAudit_1.recordAdminAction)({
                ctx: req.ctx,
                module: metadata.logModule,
                title: metadata.logTitle,
                method: req.method,
                path: ((_b = req.url) === null || _b === void 0 ? void 0 : _b.split("?")[0]) || entryPath,
                userId: (_c = req.user) === null || _c === void 0 ? void 0 : _c.id,
                query: req.query,
                body: req.body,
                ip: req.remoteAddress,
            });
        }
        if ((metadata === null || metadata === void 0 ? void 0 : metadata.demoMask) && Array.isArray(metadata.demoMask)) {
            result = (0, demoMask_1.applyDemoMask)(result, metadata.demoMask);
        }
        res.sendResponse(req, 200, result, metadata === null || metadata === void 0 ? void 0 : metadata.responseType);
    }
    catch (error) {
        const statusCode = error.statusCode || 500;
        const message = error.message || "Internal Server Error";
        if (hasLogging && (0, adminAudit_1.shouldAudit)(req.method, (_d = req.url) === null || _d === void 0 ? void 0 : _d.split("?")[0], metadata)) {
            (0, adminAudit_1.recordAdminAction)({
                ctx: req.ctx,
                module: metadata.logModule,
                title: metadata.logTitle,
                method: req.method,
                path: ((_e = req.url) === null || _e === void 0 ? void 0 : _e.split("?")[0]) || entryPath,
                userId: (_f = req.user) === null || _f === void 0 ? void 0 : _f.id,
                query: req.query,
                body: req.body,
                ip: req.remoteAddress,
                error,
            });
        }
        if (error.headers && typeof error.headers === "object") {
            for (const [k, v] of Object.entries(error.headers)) {
                req.setResponseHeader(k, String(v));
            }
        }
        const ctx = req.ctx;
        if (ctx && ctx._status === "running") {
            ctx.fail(`${statusCode} ${message}`);
        }
        const apiPathForErr = ((_g = req.url) === null || _g === void 0 ? void 0 : _g.split("?")[0]) || "";
        if ((0, cors_handler_1.isHbBotApiPath)(apiPathForErr)) {
            const HB_ERR = {
                400: -1102,
                401: -2014,
                403: -2015,
                404: -1121,
                422: -1013,
                423: -2015,
                429: -1003,
                500: -1000,
                503: -1001,
            };
            const HB_MSG_CODES = [
                [/insufficient (balance|funds)|not enough/i, -2010],
                [/order is not open|no longer open|fully filled|already (filled|canceled|cancelled)/i, -2011],
                [/order not found|unknown order|no such order/i, -2013],
                [/duplicate newclientorderid/i, -2010],
            ];
            let hbCode = (_h = HB_ERR[statusCode]) !== null && _h !== void 0 ? _h : -1000;
            if (statusCode >= 400 && statusCode < 500) {
                for (const [pattern, code] of HB_MSG_CODES) {
                    if (pattern.test(message)) {
                        hbCode = code;
                        break;
                    }
                }
            }
            res.sendResponse(req, statusCode, {
                code: hbCode,
                msg: message,
            });
            return;
        }
        if (error.validationErrors) {
            res.sendResponse(req, statusCode, {
                message,
                statusCode,
                validationErrors: error.validationErrors,
            });
            return;
        }
        res.handleError(statusCode, message, req.responseHeaders);
    }
}
