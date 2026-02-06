"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const query_1 = require("@b/utils/query");
const validation_1 = require("@b/utils/validation");
const console_1 = require("@b/utils/console");
function generateFileUrl(filePath) {
    return `/uploads/${filePath}`;
}
const isProduction = process.env.NODE_ENV === 'production';
const BASE_UPLOAD_DIR = isProduction
    ? path_1.default.join(process.cwd(), "frontend", "public", "uploads")
    : path_1.default.join(process.cwd(), "..", "frontend", "public", "uploads");
exports.metadata = {
    summary: "Uploads a file to a specified directory",
    description: "Uploads a file to a specified directory",
    operationId: "uploadFile",
    tags: ["Upload"],
    logModule: "UPLOAD",
    logTitle: "Upload file",
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
                            description: "Directory to upload file to",
                        },
                        file: {
                            type: "string",
                            description: "Base64 encoded file data",
                        },
                        height: {
                            type: "number",
                            description: "Height of the image",
                        },
                        width: {
                            type: "number",
                            description: "Width of the image",
                        },
                        oldPath: {
                            type: "string",
                            description: "Path of the old image to remove",
                        },
                    },
                    required: ["dir", "file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "File uploaded successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            url: {
                                type: "string",
                                description: "URL of the uploaded file",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Upload"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    const { dir, file: base64File, width, height, oldPath } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating upload request");
    if (!dir || !base64File) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "No directory specified or no file provided",
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Preparing upload directory");
    const sanitizedDir = (0, validation_1.sanitizeUserPath)(dir.replace(/-/g, "/"));
    const mediaDir = path_1.default.join(BASE_UPLOAD_DIR, sanitizedDir);
    const resolvedMediaDir = path_1.default.resolve(mediaDir);
    const resolvedBaseDir = path_1.default.resolve(BASE_UPLOAD_DIR);
    if (!resolvedMediaDir.startsWith(resolvedBaseDir + path_1.default.sep) && resolvedMediaDir !== resolvedBaseDir) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid upload directory",
        });
    }
    await ensureDirExists(mediaDir);
    const mimeType = ((_a = base64File.match(/^data:(.*);base64,/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
        'video/mp4', 'video/webm', 'video/quicktime'
    ];
    if (!allowedMimeTypes.includes(mimeType)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "File type not allowed",
        });
    }
    const buffer = Buffer.from(base64Data, "base64");
    let filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    let processedImage = buffer;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing file upload");
    if (mimeType.startsWith("image/") && !mimeType.includes("image/gif")) {
        processedImage = await (0, sharp_1.default)(buffer)
            .resize({ width, height, fit: "inside" })
            .webp({ quality: 80 })
            .toBuffer();
        filename += ".webp";
    }
    else if (mimeType.startsWith("video/")) {
        filename += "." + (mimeType.split("/")[1] || "mp4");
    }
    else if (mimeType.includes("image/gif")) {
        filename += ".gif";
    }
    else {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Unsupported file format.",
        });
    }
    const filePath = path_1.default.join(mediaDir, filename);
    await promises_1.default.writeFile(filePath, processedImage);
    if (oldPath) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing old file");
        try {
            await removeOldImageSecurely(oldPath, sanitizedDir);
        }
        catch (error) {
            console_1.logger.error("UPLOAD", "Error removing old image", error);
        }
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`File uploaded successfully: ${sanitizedDir.replace(/\\/g, "/")}/${filename}`);
    return {
        url: generateFileUrl(`${sanitizedDir.replace(/\\/g, "/")}/${filename}`),
    };
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
async function removeOldImageSecurely(oldPath, expectedDir) {
    const safeOldPath = oldPath
        .replace(/^(\.\.[/\\])+/, "")
        .replace(/^[/\\]+/, "");
    const expectedBaseDir = path_1.default.join(BASE_UPLOAD_DIR, expectedDir);
    const oldImageFullPath = path_1.default.resolve(BASE_UPLOAD_DIR, safeOldPath);
    if (!oldImageFullPath.startsWith(expectedBaseDir + path_1.default.sep)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden: Attempt to delete file outside upload directory",
        });
    }
    try {
        await promises_1.default.access(oldImageFullPath);
        await promises_1.default.unlink(oldImageFullPath);
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            console_1.logger.error("UPLOAD", "Error removing old image", error);
        }
    }
}
