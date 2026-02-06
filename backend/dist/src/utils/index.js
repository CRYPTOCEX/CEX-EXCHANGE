"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusOptions = exports.transactionTypeOptions = exports.cronLastRunTimes = exports.validAddonFolders = exports.getCommonExpiration = exports.getStatusMessage = exports.setCORSHeaders = exports.voidFunction = exports.handleArrayBuffer = exports.handleError = exports.errHandlerFn = exports.notFoundFn = exports.apiResponse = exports.notFoundResponse = exports.logCORSConfiguration = exports.allowedOrigins = exports.appSupport = exports.appName = void 0;
exports.setupDefaultRoutes = setupDefaultRoutes;
exports.setupProcessEventHandlers = setupProcessEventHandlers;
exports.convertAndSortCounts = convertAndSortCounts;
exports.delay = delay;
exports.slugify = slugify;
exports.serveStaticFile = serveStaticFile;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const zlib_1 = __importDefault(require("zlib"));
const mime_1 = require("./mime");
const validation_1 = require("./validation");
const console_1 = require("./console");
exports.appName = process.env.NEXT_PUBLIC_SITE_NAME || "Platform";
exports.appSupport = process.env.NEXT_PUBLIC_APP_EMAIL || "support@mashdiv.com";
const getDevOrigins = () => {
    const frontendPort = process.env.NEXT_PUBLIC_FRONTEND_PORT || 3000;
    const backendPort = process.env.NEXT_PUBLIC_BACKEND_PORT || 4000;
    return [
        `http://localhost:${frontendPort}`,
        `https://localhost:${frontendPort}`,
        `http://localhost:${backendPort}`,
        `https://localhost:${backendPort}`,
        "http://localhost:80",
        "https://localhost:443",
        "http://localhost:3000",
        "https://localhost:3000",
        "localhost:80",
        "localhost:443",
        "localhost:3000",
    ];
};
const getProdOrigins = () => {
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
    if (!siteUrl)
        return [];
    const origins = [
        siteUrl,
        siteUrl.replace('http://', 'https://'),
        siteUrl.replace('https://', 'http://'),
    ];
    const withoutWww = siteUrl.replace('://www.', '://');
    const withWww = siteUrl.replace('://', '://www.');
    if (withoutWww !== siteUrl) {
        origins.push(withoutWww, withoutWww.replace('http://', 'https://'), withoutWww.replace('https://', 'http://'));
    }
    if (withWww !== siteUrl && !withWww.includes('://www.www.')) {
        origins.push(withWww, withWww.replace('http://', 'https://'), withWww.replace('https://', 'http://'));
    }
    return [...new Set(origins)];
};
const isDev = process.env.NODE_ENV === "development";
exports.allowedOrigins = [
    ...(isDev ? getDevOrigins() : []),
    ...getProdOrigins(),
];
const logCORSConfiguration = () => {
    const isDev = process.env.NODE_ENV === "development";
    console_1.logger.debug("CORS", `${isDev ? 'Dev' : 'Prod'} mode, ${exports.allowedOrigins.length} origins configured`);
};
exports.logCORSConfiguration = logCORSConfiguration;
exports.notFoundResponse = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 Not Found</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
    }
  </style>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The resource you are looking for is not available.</p>
</body>
</html>`;
exports.apiResponse = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${exports.appName} - Backend Service</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      margin: 20px;
      background-color: #f4f4f4;
      color: #333;
    }
    .container {
      max-width: 800px;
      margin: auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    h1 {
      color: #005A9C;
    }
    a {
      color: #007BFF;
      text-decoration: none;
    }
    a:hover {
      text-decoration: underline;
    }
    .status {
      color: #28A745;
    }
    .footer {
      margin-top: 20px;
      text-align: center;
      font-size: 0.9em;
      color: #666;
    }
    @media (max-width: 600px) {
      body {
        margin: 10px;
      }
      .container {
        margin: 10px;
        padding: 15px;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>${exports.appName} Backend Service</h1>
    <p>Status: <strong class="status">Live</strong></p>
    <p>This is the backend service for <strong>${exports.appName}</strong>. All systems operational.</p>
    <p>API Documentation: <a href="${process.env.NEXT_PUBLIC_SITE_URL || ""}/api-docs">View Documentation</a></p>
    <p>Raw OpenAPI Spec: <a href="/api/docs/swagger.json">swagger.json</a></p>
    <!-- Additional UI elements could be added here -->
    <div class="footer">
      <p>Need help? <a href="mailto:${exports.appSupport}">Contact Support</a></p>
    </div>
  </div>
</body>
</html>
`;
const notFoundFn = (res) => {
    res.status(404).end("Not Found");
};
exports.notFoundFn = notFoundFn;
const errHandlerFn = (Err, res) => {
    res.status(500).end("Error");
};
exports.errHandlerFn = errHandlerFn;
const handleError = (res, statusCode, error) => {
    res.status(statusCode).end(error);
};
exports.handleError = handleError;
const handleArrayBuffer = (message) => {
    if (message instanceof ArrayBuffer)
        return new TextDecoder().decode(message);
    return message;
};
exports.handleArrayBuffer = handleArrayBuffer;
const voidFunction = () => { };
exports.voidFunction = voidFunction;
function setupDefaultRoutes(app) {
    ["/", "/api"].forEach((route) => {
        app.get(route, (res, req) => res.writeHeader("Content-Type", "text/html").end(exports.apiResponse));
    });
}
function setupProcessEventHandlers() {
    process.on("uncaughtException", (error) => {
        var _a, _b, _c, _d, _e, _f, _g;
        const errorMessage = error.stack || `Uncaught Exception: ${error.message}`;
        console_1.logger.error("SYSTEM", errorMessage, error);
        const isRecoverableError = ((_a = error.message) === null || _a === void 0 ? void 0 : _a.includes('Unexpected server response')) ||
            ((_b = error.message) === null || _b === void 0 ? void 0 : _b.includes('WebSocket')) ||
            ((_c = error.message) === null || _c === void 0 ? void 0 : _c.includes('ECONNREFUSED')) ||
            ((_d = error.message) === null || _d === void 0 ? void 0 : _d.includes('ETIMEDOUT')) ||
            ((_e = error.message) === null || _e === void 0 ? void 0 : _e.includes('ENOTFOUND')) ||
            ((_f = error.message) === null || _f === void 0 ? void 0 : _f.includes('socket hang up')) ||
            ((_g = error.message) === null || _g === void 0 ? void 0 : _g.includes('connection timeout'));
        if (isRecoverableError) {
            console_1.logger.warn("SYSTEM", "Recoverable error caught, server will continue running");
            return;
        }
        process.exit(1);
    });
    process.on("unhandledRejection", (reason, promise) => {
        const reasonMessage = reason instanceof Error
            ? reason.stack || reason.message
            : JSON.stringify(reason);
        const error = reason instanceof Error ? reason : new Error(reasonMessage);
        console_1.logger.error("SYSTEM", `Unhandled Rejection at: ${promise}, reason: ${reasonMessage}`, error);
    });
    process.on("SIGINT", async () => {
        console_1.logger.info("SYSTEM", "Server is shutting down...");
        process.exit();
    });
    process.on("SIGTERM", async () => {
        console_1.logger.info("SYSTEM", "Server received stop signal, shutting down gracefully");
        process.exit();
    });
}
const setCORSHeaders = (res, origin) => {
    const isDev = process.env.NODE_ENV === "development";
    if (isDev) {
        const allowOrigin = origin || "http://localhost:3000";
        res.writeHeader("Access-Control-Allow-Origin", allowOrigin);
    }
    else {
        if (origin) {
            res.writeHeader("Access-Control-Allow-Origin", origin);
        }
    }
    res.writeHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
    res.writeHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Requested-With, accessToken, refreshToken, sessionId, csrfToken, x-api-key, Cache-Control, Pragma, Accept, Accept-Language, Accept-Encoding, idempotency-key");
    res.writeHeader("Access-Control-Allow-Credentials", "true");
    res.writeHeader("Access-Control-Max-Age", "86400");
};
exports.setCORSHeaders = setCORSHeaders;
const getStatusMessage = (statusCode) => {
    const messages = {
        200: "OK",
        201: "Created",
        202: "Accepted",
        204: "No Content",
        206: "Partial Content",
        400: "Bad Request",
        401: "Unauthorized",
        402: "Payment Required",
        403: "Forbidden",
        404: "Not Found",
        405: "Method Not Allowed",
        406: "Not Acceptable",
        408: "Request Timeout",
        409: "Conflict",
        410: "Gone",
        411: "Length Required",
        413: "Payload Too Large",
        414: "URI Too Long",
        415: "Unsupported Media Type",
        416: "Range Not Satisfiable",
        417: "Expectation Failed",
        418: "I'm a teapot",
        422: "Unprocessable Entity",
        429: "Too Many Requests",
        500: "Internal Server Error",
        501: "Not Implemented",
        502: "Bad Gateway",
        503: "Service Unavailable",
        504: "Gateway Timeout",
        505: "HTTP Version Not Supported",
    };
    return messages[statusCode] || "Unknown Status";
};
exports.getStatusMessage = getStatusMessage;
const getCommonExpiration = (cookieName) => {
    const expirationTimes = {
        accessToken: 15 * 60 * 1000,
        refreshToken: 14 * 24 * 60 * 60 * 1000,
        sessionId: 14 * 24 * 60 * 60 * 1000,
        csrfToken: 24 * 60 * 60 * 1000,
    };
    const time = expirationTimes[cookieName];
    return time ? new Date(Date.now() + time).toUTCString() : undefined;
};
exports.getCommonExpiration = getCommonExpiration;
function compressResponse(res, req, responseData) {
    const acceptEncoding = req.getHeader("accept-encoding") || "";
    let contentEncoding = "identity";
    let response = Buffer.isBuffer(responseData)
        ? responseData
        : Buffer.from(JSON.stringify(responseData));
    if (acceptEncoding.includes("gzip")) {
        response = Buffer.from(zlib_1.default.gzipSync(response));
        contentEncoding = "gzip";
    }
    else if (acceptEncoding.includes("br") && zlib_1.default.brotliCompressSync) {
        response = Buffer.from(zlib_1.default.brotliCompressSync(response));
        contentEncoding = "br";
    }
    else if (acceptEncoding.includes("deflate")) {
        response = Buffer.from(zlib_1.default.deflateSync(response));
        contentEncoding = "deflate";
    }
    if (contentEncoding !== "identity") {
        res.writeHeader("Content-Encoding", contentEncoding);
    }
    return response;
}
function convertAndSortCounts(countsPerDay) {
    return Object.keys(countsPerDay)
        .sort()
        .map((date) => ({
        date,
        count: countsPerDay[date],
    }));
}
exports.validAddonFolders = [];
exports.cronLastRunTimes = {
    aiInvestments: 0,
    forexInvestments: 0,
    icoPhases: 0,
    mailwizardCampaigns: 0,
    staking: 0,
    currencies: 0,
    binaryOrders: 0,
    spotCurrencies: 0,
    investments: 0,
    spotWalletsDeposit: 0,
    spotWalletsWithdraw: 0,
};
async function delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
exports.transactionTypeOptions = [
    { value: "DEPOSIT", label: "Deposit", color: "success" },
    { value: "WITHDRAW", label: "Withdraw", color: "danger" },
    {
        value: "OUTGOING_TRANSFER",
        label: "Outgoing Transfer",
        color: "warning",
    },
    { value: "INCOMING_TRANSFER", label: "Incoming Transfer", color: "info" },
    { value: "PAYMENT", label: "Payment", color: "primary" },
    { value: "REFUND", label: "Refund", color: "muted" },
    { value: "BINARY_ORDER", label: "Binary Order", color: "success" },
    { value: "EXCHANGE_ORDER", label: "Exchange Order", color: "warning" },
    { value: "INVESTMENT", label: "Investment", color: "info" },
    { value: "INVESTMENT_ROI", label: "Investment ROI", color: "primary" },
    { value: "AI_INVESTMENT", label: "AI Investment", color: "muted" },
    {
        value: "AI_INVESTMENT_ROI",
        label: "AI Investment ROI",
        color: "success",
    },
    { value: "INVOICE", label: "Invoice", color: "danger" },
    { value: "FOREX_DEPOSIT", label: "Forex Deposit", color: "warning" },
    { value: "FOREX_WITHDRAW", label: "Forex Withdraw", color: "info" },
    {
        value: "FOREX_INVESTMENT",
        label: "Forex Investment",
        color: "primary",
    },
    {
        value: "FOREX_INVESTMENT_ROI",
        label: "Forex Investment ROI",
        color: "muted",
    },
    {
        value: "ICO_CONTRIBUTION",
        label: "ICO Contribution",
        color: "success",
    },
    { value: "REFERRAL_REWARD", label: "Referral Reward", color: "warning" },
    { value: "STAKING", label: "Staking", color: "info" },
    { value: "STAKING_REWARD", label: "Staking Reward", color: "primary" },
    {
        value: "P2P_OFFER_TRANSFER",
        label: "P2P Offer Transfer",
        color: "muted",
    },
    { value: "P2P_TRADE", label: "P2P Trade", color: "danger" },
];
exports.statusOptions = [
    { value: "PENDING", label: "Pending", color: "warning" },
    { value: "COMPLETED", label: "Completed", color: "success" },
    { value: "FAILED", label: "Failed", color: "danger" },
    { value: "CANCELLED", label: "Cancelled", color: "muted" },
    { value: "REJECTED", label: "Rejected", color: "danger" },
    { value: "REFUNDED", label: "Refunded", color: "info" },
    { value: "FROZEN", label: "Frozen", color: "danger" },
    { value: "PROCESSING", label: "Processing", color: "warning" },
    { value: "EXPIRED", label: "Expired", color: "muted" },
];
function slugify(str) {
    return str
        .replace(/^\s+|\s+$/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9 -]/g, "")
        .replace(/\s+/g, "-")
        .replace(/-+/g, "-");
}
function serveStaticFile(res, req, filePath, markResponseSent) {
    let aborted = false;
    res.onAborted(() => {
        aborted = true;
        console_1.logger.debug("STATIC", "Request was aborted");
    });
    try {
        const isDebugMode = process.env.DEBUG_STATIC_FILES === "true";
        if (isDebugMode) {
            console_1.logger.debug("STATIC", `Static file request: ${filePath}`);
            console_1.logger.debug("STATIC", `Current working directory: ${process.cwd()}`);
            console_1.logger.debug("STATIC", `NODE_ENV: ${process.env.NODE_ENV}`);
        }
        let sanitizedFilePath;
        try {
            sanitizedFilePath = (0, validation_1.sanitizeUserPath)(filePath);
            if (isDebugMode) {
                console_1.logger.debug("STATIC", `Sanitized path: ${sanitizedFilePath}`);
            }
        }
        catch (sanitizeError) {
            console_1.logger.error("STATIC", `Path sanitization failed for ${filePath}: ${sanitizeError.message}`);
            if (!aborted) {
                res.writeStatus("403 Forbidden").end();
                markResponseSent();
            }
            return true;
        }
        if (sanitizedFilePath.indexOf("..") !== -1 ||
            sanitizedFilePath.includes('\0') ||
            sanitizedFilePath.includes('%00')) {
            if (!aborted) {
                res.writeStatus("403 Forbidden").end();
                markResponseSent();
            }
            return true;
        }
        let fullPath;
        if (filePath.startsWith("/uploads/")) {
            const cwd = process.cwd();
            if (cwd.endsWith('backend') || cwd.endsWith('backend/')) {
                const relativePath = sanitizedFilePath.startsWith("/") ? sanitizedFilePath.substring(1) : sanitizedFilePath;
                fullPath = path_1.default.join(cwd, "..", "frontend", "public", relativePath);
            }
            else {
                const standardPath = path_1.default.join(cwd, "frontend", "public");
                const parentPath = path_1.default.join(cwd, "..", "frontend", "public");
                const directPublicPath = path_1.default.join(cwd, "public");
                let basePath;
                if (fs_1.default.existsSync(standardPath)) {
                    basePath = standardPath;
                }
                else if (fs_1.default.existsSync(parentPath)) {
                    basePath = parentPath;
                }
                else if (fs_1.default.existsSync(directPublicPath)) {
                    basePath = directPublicPath;
                }
                else {
                    basePath = standardPath;
                }
                const relativePath = sanitizedFilePath.startsWith("/") ? sanitizedFilePath.substring(1) : sanitizedFilePath;
                fullPath = path_1.default.join(basePath, relativePath);
            }
        }
        if (isDebugMode) {
            console_1.logger.debug("STATIC", `Resolved full path: ${fullPath}`);
            console_1.logger.debug("STATIC", `File exists: ${fs_1.default.existsSync(fullPath)}`);
            if (fs_1.default.existsSync(fullPath)) {
                console_1.logger.debug("STATIC", `Is file: ${fs_1.default.lstatSync(fullPath).isFile()}`);
            }
        }
        if (!fullPath) {
            if (!aborted) {
                res.writeStatus("404 Not Found").end();
                markResponseSent();
            }
            return true;
        }
        if (fs_1.default.existsSync(fullPath) && fs_1.default.lstatSync(fullPath).isFile()) {
            if (filePath.startsWith("/uploads/")) {
                const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.mp4', '.webm', '.mov', '.pdf', '.txt'];
                const fileExtension = path_1.default.extname(fullPath).toLowerCase();
                if (!allowedExtensions.includes(fileExtension)) {
                    if (!aborted) {
                        res.writeStatus("403 Forbidden").end();
                        markResponseSent();
                    }
                    return true;
                }
            }
            let fileContent = fs_1.default.readFileSync(fullPath);
            const contentType = (0, mime_1.getMime)(fullPath);
            const fileExtension = path_1.default.extname(fullPath).toLowerCase();
            fileContent = compressResponse(res, req, fileContent);
            const maxAge = 60 * 60 * 24 * 365;
            const cacheControl = `public, max-age=${maxAge}, immutable`;
            if (!aborted) {
                res.writeHeader("Content-Type", contentType);
                res.writeHeader("Cache-Control", cacheControl);
                res.writeHeader("Connection", "keep-alive");
                res.writeHeader("X-Content-Type-Options", "nosniff");
                res.writeHeader("X-Frame-Options", "DENY");
                const isDev = process.env.NODE_ENV === "development";
                if (isDev) {
                    res.writeHeader("Access-Control-Allow-Origin", "*");
                }
                else {
                    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
                    if (siteUrl) {
                        res.writeHeader("Access-Control-Allow-Origin", siteUrl);
                    }
                }
                if (fileExtension === '.svg') {
                    res.writeHeader("Content-Security-Policy", "default-src 'none'; style-src 'unsafe-inline'");
                }
                res.end(fileContent);
                markResponseSent();
            }
            return true;
        }
        if (isDebugMode) {
            console_1.logger.debug("STATIC", `File not found: ${fullPath}`);
        }
        if (!aborted) {
            res.writeStatus("404 Not Found").end();
            markResponseSent();
        }
        return true;
    }
    catch (error) {
        console_1.logger.error("STATIC", `Error serving static file`, error);
        if (!aborted) {
            res.writeStatus("500 Internal Server Error").end();
            markResponseSent();
        }
        return true;
    }
}
