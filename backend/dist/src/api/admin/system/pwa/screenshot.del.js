"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.metadata = {
    summary: "Delete PWA screenshot or splash screen",
    operationId: "deletePwaScreenshot",
    tags: ["Admin", "System", "PWA"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        path: {
                            type: "string",
                            description: "Path to the file to delete (relative to public)",
                        },
                    },
                    required: ["path"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Screenshot deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid path" },
        404: { description: "File not found" },
        500: { description: "Internal server error" },
    },
    permission: "edit.settings",
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Delete PWA screenshot",
};
function getPublicDir() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public"),
            path_1.default.join(process.cwd(), "public"),
            path_1.default.join(process.cwd(), "..", "frontend", "public"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public");
}
exports.default = async (data) => {
    const { body, ctx } = data;
    const { path: filePath } = body;
    if (!filePath) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "File path is required",
        });
    }
    if (!filePath.startsWith("/img/screenshots/") && !filePath.startsWith("/img/splash/")) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file path. Can only delete from screenshots or splash directories.",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting file: ${filePath}`);
        const publicDir = getPublicDir();
        const fullPath = path_1.default.join(publicDir, filePath);
        if (!fs_1.default.existsSync(fullPath)) {
            throw (0, error_1.createError)({
                statusCode: 404,
                message: "File not found",
            });
        }
        await promises_1.default.unlink(fullPath);
        const webpPath = fullPath.replace(/\.(png|jpg|jpeg)$/, ".webp");
        if (fs_1.default.existsSync(webpPath)) {
            await promises_1.default.unlink(webpPath);
        }
        const pngPath = fullPath.replace(/\.webp$/, ".png");
        if (fullPath.endsWith(".webp") && fs_1.default.existsSync(pngPath)) {
            await promises_1.default.unlink(pngPath);
        }
        console_1.logger.info("PWA", `Screenshot deleted: ${filePath}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Screenshot deleted successfully");
        return {
            message: "Screenshot deleted successfully",
        };
    }
    catch (error) {
        console_1.logger.error("PWA", "Failed to delete screenshot", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to delete screenshot: ${error === null || error === void 0 ? void 0 : error.message}`);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to delete screenshot: ${error === null || error === void 0 ? void 0 : error.message}`,
        });
    }
};
