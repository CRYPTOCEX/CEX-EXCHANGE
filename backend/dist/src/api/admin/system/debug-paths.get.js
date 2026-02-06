"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const path_2 = require("@b/utils/path");
exports.metadata = {
    summary: "Debug path resolution for production troubleshooting",
    operationId: "debugPaths",
    tags: ["Admin", "Debug"],
    responses: {
        200: {
            description: "Path information retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            environment: { type: "string" },
                            currentWorkingDirectory: { type: "string" },
                            pathInfo: { type: "object" },
                        },
                    },
                },
            },
        },
    },
    permission: "access.system",
    requiresAuth: true,
    logModule: "ADMIN_SYSTEM",
    logTitle: "Debug Paths",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Gathering path information");
    const isProduction = process.env.NODE_ENV === 'production';
    const cwd = process.cwd();
    const testPaths = {
        logo: {
            pattern1: path_1.default.join(cwd, "frontend", "public", "img", "logo"),
            pattern2: path_1.default.join(cwd, "public", "img", "logo"),
            pattern3: path_1.default.join(cwd, "..", "frontend", "public", "img", "logo"),
            pattern4: path_1.default.join(cwd, "..", "public", "img", "logo"),
            resolved: (0, path_2.resolveUploadPath)("img/logo"),
        },
        uploads: {
            pattern1: path_1.default.join(cwd, "frontend", "public", "uploads"),
            pattern2: path_1.default.join(cwd, "public", "uploads"),
            pattern3: path_1.default.join(cwd, "..", "frontend", "public", "uploads"),
            pattern4: path_1.default.join(cwd, "..", "public", "uploads"),
            resolved: (0, path_2.resolveUploadPath)("uploads"),
        },
    };
    const pathStatus = {};
    for (const [category, paths] of Object.entries(testPaths)) {
        pathStatus[category] = {};
        for (const [pattern, fullPath] of Object.entries(paths)) {
            const exists = fs_1.default.existsSync(fullPath);
            const parentExists = fs_1.default.existsSync(path_1.default.dirname(fullPath));
            pathStatus[category][pattern] = {
                path: fullPath,
                exists,
                parentExists,
                canCreate: parentExists && !exists,
            };
        }
    }
    const systemInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch,
        environment: isProduction ? 'production' : 'development',
        currentWorkingDirectory: cwd,
        __dirname: __dirname,
        processArgv: process.argv,
    };
    const commonDirs = [
        path_1.default.join(cwd, "frontend"),
        path_1.default.join(cwd, "public"),
        path_1.default.join(cwd, "..", "frontend"),
        path_1.default.join(cwd, "..", "public"),
        path_1.default.join(cwd, "backend"),
        path_1.default.join(cwd, "src"),
    ];
    const directoryStatus = {};
    for (const dir of commonDirs) {
        directoryStatus[dir] = fs_1.default.existsSync(dir);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Path debugging information retrieved");
    return {
        systemInfo,
        pathStatus,
        directoryStatus,
        message: "Path debugging information retrieved successfully",
    };
};
