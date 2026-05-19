"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const heic_convert_1 = __importDefault(require("heic-convert"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const validation_1 = require("@b/utils/validation");
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
function generateFileUrl(filePath) {
    return `/uploads/${filePath}`;
}
exports.metadata = {
    summary: "Converts a HEIC image to JPEG format",
    description: "Converts a HEIC image to JPEG format and returns the file URL",
    operationId: "convertHeicFile",
    tags: ["Conversion"],
    logModule: "UPLOAD",
    logTitle: "Convert HEIC image",
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        dir: {
                            type: "string",
                            description: "Directory to save the converted file",
                        },
                        file: {
                            type: "string",
                            description: "Base64 encoded HEIC file data",
                        },
                        mimeType: { type: "string", description: "MIME type of the file" },
                    },
                    required: ["dir", "file", "mimeType"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "File converted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            url: { type: "string", description: "URL of the converted file" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Conversion"),
        500: query_1.serverErrorResponse,
    },
};
const isProduction = process.env.NODE_ENV === 'production';
const BASE_CONVERT_DIR = isProduction
    ? path_1.default.join(process.cwd(), "frontend", "public", "uploads")
    : path_1.default.join(process.cwd(), "..", "frontend", "public", "uploads");
exports.default = async (data) => {
    const { body, user, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    const { dir, file: base64File, mimeType } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating HEIC conversion request");
    if (!dir || !base64File || !mimeType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Missing required fields: dir, file, or mimeType",
        });
    }
    if (typeof dir !== 'string' || dir.length > 100) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid directory path",
        });
    }
    if (dir.includes('\0') || dir.includes('%00') || dir.includes('..')) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid directory path",
        });
    }
    if (typeof base64File !== 'string' || !base64File.startsWith('data:')) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file format",
        });
    }
    if (typeof mimeType !== 'string' || (!mimeType.includes("heic") && !mimeType.includes("heif"))) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Unsupported file format. Only HEIC or HEIF files are allowed.",
        });
    }
    const base64Data = base64File.split(",")[1];
    if (!base64Data) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file data",
        });
    }
    const fileSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 10 * 1024 * 1024;
    if (fileSizeBytes > maxSizeBytes) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "File size exceeds maximum limit of 10MB",
        });
    }
    const buffer = Buffer.from(base64Data, "base64");
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing upload directory");
    const sanitizedDir = (0, validation_1.sanitizeUserPath)(dir.replace(/-/g, "/"));
    const mediaDir = path_1.default.join(BASE_CONVERT_DIR, sanitizedDir);
    const resolvedMediaDir = path_1.default.resolve(mediaDir);
    const resolvedBaseDir = path_1.default.resolve(BASE_CONVERT_DIR);
    if (!resolvedMediaDir.startsWith(resolvedBaseDir + path_1.default.sep) && resolvedMediaDir !== resolvedBaseDir) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid upload directory",
        });
    }
    await ensureDirExists(mediaDir);
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.jpg`;
    const outputPath = path_1.default.join(mediaDir, filename);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Converting HEIC to JPEG");
    try {
        const jpegBuffer = await (0, heic_convert_1.default)({
            buffer,
            format: "JPEG",
            quality: 0.8,
        });
        await promises_1.default.writeFile(outputPath, jpegBuffer);
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`HEIC converted to JPEG: ${sanitizedDir}/${filename}`);
        return { url: generateFileUrl(`${sanitizedDir}/${filename}`) };
    }
    catch (error) {
        console_1.logger.error("UPLOAD", "Error converting HEIC to JPEG using heic-convert", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("HEIC to JPEG conversion failed");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "HEIC to JPEG conversion failed using `heic-convert`.",
        });
    }
};
async function ensureDirExists(dir) {
    try {
        await promises_1.default.access(dir);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            await promises_1.default.mkdir(dir, { recursive: true });
        }
        else {
            throw error;
        }
    }
}
