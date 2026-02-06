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
    summary: "Update PWA manifest configuration",
    operationId: "updatePwaManifest",
    tags: ["Admin", "System", "PWA"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        manifest: {
                            type: "object",
                            description: "Complete manifest object to save",
                        },
                    },
                    required: ["manifest"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "PWA manifest updated successfully",
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
        400: { description: "Invalid manifest data" },
        500: { description: "Internal server error" },
    },
    permission: "edit.settings",
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Update PWA manifest",
};
function getManifestPath() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public", "manifest.json"),
            path_1.default.join(process.cwd(), "public", "manifest.json"),
            path_1.default.join(process.cwd(), "..", "frontend", "public", "manifest.json"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public", "manifest.json");
}
function getWebManifestPath() {
    const isProduction = process.env.NODE_ENV === "production";
    if (isProduction) {
        const possiblePaths = [
            path_1.default.join(process.cwd(), "frontend", "public", "site.webmanifest"),
            path_1.default.join(process.cwd(), "public", "site.webmanifest"),
            path_1.default.join(process.cwd(), "..", "frontend", "public", "site.webmanifest"),
        ];
        for (const testPath of possiblePaths) {
            if (fs_1.default.existsSync(testPath)) {
                return testPath;
            }
        }
        return possiblePaths[0];
    }
    return path_1.default.join(process.cwd(), "..", "frontend", "public", "site.webmanifest");
}
exports.default = async (data) => {
    const { body, ctx } = data;
    const { manifest } = body;
    if (!manifest || typeof manifest !== "object") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid manifest data",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating manifest structure");
        if (!manifest.name || !manifest.short_name) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Manifest must have name and short_name",
            });
        }
        const validDisplayModes = ["fullscreen", "standalone", "minimal-ui", "browser"];
        if (manifest.display && !validDisplayModes.includes(manifest.display)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid display mode. Must be one of: ${validDisplayModes.join(", ")}`,
            });
        }
        const validOrientations = [
            "any",
            "natural",
            "landscape",
            "landscape-primary",
            "landscape-secondary",
            "portrait",
            "portrait-primary",
            "portrait-secondary",
        ];
        if (manifest.orientation && !validOrientations.includes(manifest.orientation)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid orientation. Must be one of: ${validOrientations.join(", ")}`,
            });
        }
        const colorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (manifest.background_color && !colorRegex.test(manifest.background_color)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid background_color format. Use hex format (e.g., #ffffff)",
            });
        }
        if (manifest.theme_color && !colorRegex.test(manifest.theme_color)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid theme_color format. Use hex format (e.g., #000000)",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Writing manifest files");
        const manifestPath = getManifestPath();
        const webManifestPath = getWebManifestPath();
        const manifestDir = path_1.default.dirname(manifestPath);
        if (!fs_1.default.existsSync(manifestDir)) {
            await promises_1.default.mkdir(manifestDir, { recursive: true });
        }
        const manifestContent = JSON.stringify(manifest, null, 2);
        await promises_1.default.writeFile(manifestPath, manifestContent, "utf-8");
        await promises_1.default.writeFile(webManifestPath, manifestContent, "utf-8");
        console_1.logger.info("PWA", `Manifest updated at ${manifestPath}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("PWA manifest updated successfully");
        return {
            message: "PWA manifest updated successfully",
        };
    }
    catch (error) {
        console_1.logger.error("PWA", "Failed to update PWA manifest", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update PWA manifest: ${error === null || error === void 0 ? void 0 : error.message}`);
        if (error.statusCode) {
            throw error;
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to update PWA manifest: ${error === null || error === void 0 ? void 0 : error.message}`,
        });
    }
};
