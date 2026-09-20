"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupSwaggerRoute = setupSwaggerRoute;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const console_1 = require("@b/utils/console");
function getSwaggerDocPath() {
    const isProduction = process.env.NODE_ENV === 'production';
    const swaggerPaths = [
        isProduction
            ? path_1.default.resolve(process.cwd(), "frontend", "public", "swagger.json")
            : path_1.default.resolve(process.cwd(), "..", "frontend", "public", "swagger.json"),
    ];
    for (const tryPath of swaggerPaths) {
        if (fs_1.default.existsSync(tryPath)) {
            return tryPath;
        }
    }
    return swaggerPaths[0];
}
function getApiSourcePath() {
    const isProduction = process.env.NODE_ENV === "production";
    const apiPaths = [
        ...(isProduction ? [
            path_1.default.resolve(process.cwd(), "backend", "dist", "src", "api"),
            path_1.default.resolve(process.cwd(), "dist", "src", "api"),
        ] : []),
        path_1.default.resolve(__dirname, "../api"),
        path_1.default.resolve(process.cwd(), "backend", "dist", "src", "api"),
        path_1.default.resolve(process.cwd(), "backend", "src", "api"),
        path_1.default.resolve(process.cwd(), "src", "api"),
    ];
    for (const apiPath of apiPaths) {
        try {
            fs_1.default.accessSync(apiPath);
            return apiPath;
        }
        catch (_a) { }
    }
    return apiPaths[0];
}
const SWAGGER_DOC_PATH = getSwaggerDocPath();
const REGENERATION_INTERVAL = 300000;
const swaggerDoc = {
    openapi: "3.0.0",
    info: {
        title: process.env.SITE_NAME || "API Documentation",
        version: "1.0.0",
        description: process.env.SITE_DESCRIPTION ||
            "This is the API documentation for the site, powered by Mash Server.",
    },
    paths: {},
    components: {
        schemas: {},
        responses: {},
        parameters: {},
        requestBodies: {},
        securitySchemes: {
            ApiKeyAuth: { type: "apiKey", in: "header", name: "X-API-KEY" },
        },
    },
    tags: [],
};
let lastSwaggerGenerationTime = 0;
async function fileExists(filePath) {
    try {
        await fs_1.default.promises.access(filePath);
        return true;
    }
    catch (_a) {
        return false;
    }
}
async function generateSwaggerDocIfNeeded() {
    const needsRegeneration = !(await fileExists(SWAGGER_DOC_PATH)) ||
        Date.now() - lastSwaggerGenerationTime > REGENERATION_INTERVAL;
    if (needsRegeneration) {
        const apiSourcePath = getApiSourcePath();
        await generateSwaggerDoc(apiSourcePath, "/api");
        lastSwaggerGenerationTime = Date.now();
    }
}
const SKIP_DIRECTORIES = ["cron", "admin", "util", "integration", "plugins", "assets", "includes"];
const VALID_FILE_EXTENSIONS = [".ts", ".js"];
async function generateSwaggerDoc(startPath, basePath = "/api") {
    const entries = await fs_1.default.promises.readdir(startPath, { withFileTypes: true });
    for (const entry of entries) {
        const entryPath = path_1.default.join(startPath, entry.name);
        if (entry.isDirectory() && SKIP_DIRECTORIES.includes(entry.name)) {
            continue;
        }
        if (entry.name.startsWith("index.ws")) {
            continue;
        }
        const fileExtension = path_1.default.extname(entry.name).toLowerCase();
        if (!entry.isDirectory() && !VALID_FILE_EXTENSIONS.includes(fileExtension)) {
            continue;
        }
        if (entry.isDirectory()) {
            let newBasePath = basePath;
            if (!/^\(.*\)$/.test(entry.name)) {
                newBasePath = `${basePath}/${entry.name.replace(/\[(\w+)\]/, ":$1")}`;
            }
            await generateSwaggerDoc(entryPath, newBasePath);
        }
        else {
            const [routeName, method] = entry.name.replace(/\.[jt]s$/, "").split(".");
            if (!method)
                continue;
            const validMethods = ["get", "post", "put", "del", "delete", "patch", "options", "head", "trace"];
            if (!validMethods.includes(method.toLowerCase()))
                continue;
            const metadata = await loadRouteMetadata(entryPath);
            let routePath = `${basePath}/${routeName}`.replace(/\/index$/, "");
            routePath = convertToSwaggerPath(routePath);
            if (!swaggerDoc.paths[routePath]) {
                swaggerDoc.paths[routePath] = {};
            }
            swaggerDoc.paths[routePath][method.toLowerCase()] = {
                ...metadata,
                responses: constructResponses(metadata.responses),
                security: metadata.requiresAuth ? [{ ApiKeyAuth: [] }] : [],
            };
        }
    }
    const swaggerDir = path_1.default.dirname(SWAGGER_DOC_PATH);
    try {
        await fs_1.default.promises.mkdir(swaggerDir, { recursive: true });
    }
    catch (error) {
    }
    await (0, promises_1.writeFile)(SWAGGER_DOC_PATH, JSON.stringify(swaggerDoc, null, 2), "utf8");
}
async function loadRouteMetadata(entryPath) {
    try {
        const importedModule = await Promise.resolve(`${entryPath}`).then(s => __importStar(require(s)));
        if (!importedModule.metadata || !importedModule.metadata.responses) {
            console_1.logger.warn("DOCS", `No proper 'metadata' exported from ${entryPath}`);
            return { responses: {} };
        }
        return importedModule.metadata;
    }
    catch (error) {
        if (error.message && error.message.includes('APP_VERIFY_TOKEN_SECRET')) {
            console_1.logger.warn("DOCS", `Skipping ${entryPath} - Missing environment variable: APP_VERIFY_TOKEN_SECRET`);
        }
        else {
            console_1.logger.error("DOCS", `Error loading route metadata from ${entryPath}: ${error.message}`);
        }
        return { responses: {} };
    }
}
function constructResponses(responses) {
    return Object.keys(responses).reduce((acc, statusCode) => {
        acc[statusCode] = {
            description: responses[statusCode].description,
            content: responses[statusCode].content,
        };
        return acc;
    }, {});
}
function convertToSwaggerPath(routePath) {
    routePath = routePath.replace(/:([a-zA-Z0-9_]+)/g, "{$1}");
    routePath = routePath.replace(/\[(\w+)]/g, "{$1}");
    return routePath;
}
function setupSwaggerRoute(app) {
    app.get("/api/docs/swagger.json", async (res) => {
        try {
            await generateSwaggerDocIfNeeded();
            const data = await fs_1.default.promises.readFile(SWAGGER_DOC_PATH, 'utf8');
            res.cork(() => {
                res.writeHeader("Content-Type", "application/json").end(data);
            });
        }
        catch (error) {
            res.cork(() => {
                res.writeStatus("500 Internal Server Error").end("Internal Server Error");
            });
        }
    });
}
