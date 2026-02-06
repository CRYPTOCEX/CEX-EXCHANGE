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
const sharp_1 = __importDefault(require("sharp"));
exports.metadata = {
    summary: "Upload PWA screenshot or splash screen",
    operationId: "uploadPwaScreenshot",
    tags: ["Admin", "System", "PWA"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        file: {
                            type: "string",
                            description: "Base64 encoded image data",
                        },
                        type: {
                            type: "string",
                            enum: ["screenshot", "splash"],
                            description: "Type of image to upload",
                        },
                        name: {
                            type: "string",
                            description: "Filename for the image (without extension)",
                        },
                        width: {
                            type: "number",
                            description: "Target width (optional, for resizing)",
                        },
                        height: {
                            type: "number",
                            description: "Target height (optional, for resizing)",
                        },
                        formFactor: {
                            type: "string",
                            enum: ["wide", "narrow"],
                            description: "Form factor for screenshots",
                        },
                    },
                    required: ["file", "type", "name"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Screenshot uploaded successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            path: { type: "string" },
                            sizes: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid file data" },
        500: { description: "Internal server error" },
    },
    permission: "edit.settings",
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Upload PWA screenshot",
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
    const { file, type, name, width, height, formFactor } = body;
    if (!file || !type || !name) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "File, type, and name are required",
        });
    }
    if (!file.startsWith("data:")) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file format. Expected base64 data URI.",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${type} upload: ${name}`);
        const publicDir = getPublicDir();
        const targetDir = type === "screenshot"
            ? path_1.default.join(publicDir, "img", "screenshots")
            : path_1.default.join(publicDir, "img", "splash");
        if (!fs_1.default.existsSync(targetDir)) {
            await promises_1.default.mkdir(targetDir, { recursive: true });
        }
        const base64Data = file.split(",")[1];
        if (!base64Data) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid file data",
            });
        }
        const buffer = Buffer.from(base64Data, "base64");
        let processedImage = (0, sharp_1.default)(buffer);
        const metadata = await processedImage.metadata();
        let finalWidth = metadata.width || 0;
        let finalHeight = metadata.height || 0;
        if (width && height) {
            processedImage = processedImage.resize(width, height, {
                fit: "cover",
                position: "center",
            });
            finalWidth = width;
            finalHeight = height;
        }
        const sanitizedName = name.replace(/[^a-zA-Z0-9-_]/g, "_");
        const pngPath = path_1.default.join(targetDir, `${sanitizedName}.png`);
        const webpPath = path_1.default.join(targetDir, `${sanitizedName}.webp`);
        await processedImage.clone().png({ compressionLevel: 6 }).toFile(pngPath);
        await processedImage.clone().webp({ quality: 90 }).toFile(webpPath);
        const relativePath = `/img/${type === "screenshot" ? "screenshots" : "splash"}/${sanitizedName}.png`;
        const sizes = `${finalWidth}x${finalHeight}`;
        console_1.logger.info("PWA", `${type} uploaded: ${relativePath} (${sizes})`);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`${type} uploaded successfully`);
        return {
            message: `${type} uploaded successfully`,
            path: relativePath,
            sizes,
            formFactor: formFactor || (finalWidth > finalHeight ? "wide" : "narrow"),
        };
    }
    catch (error) {
        console_1.logger.error("PWA", `Failed to upload ${type}`, error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to upload ${type}: ${error === null || error === void 0 ? void 0 : error.message}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to upload ${type}: ${error === null || error === void 0 ? void 0 : error.message}`,
        });
    }
};
