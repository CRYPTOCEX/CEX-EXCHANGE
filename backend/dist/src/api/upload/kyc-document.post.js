"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
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
    summary: "Uploads a KYC document file",
    description: "Uploads a KYC document file including PDFs, images, and other document types",
    operationId: "uploadKycDocument",
    tags: ["Upload", "KYC"],
    requiresAuth: true,
    logModule: "KYC",
    logTitle: "Upload KYC document",
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
                        filename: {
                            type: "string",
                            description: "Original filename",
                        },
                        oldPath: {
                            type: "string",
                            description: "Path of the old file to remove",
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
                            filename: {
                                type: "string",
                                description: "Generated filename",
                            },
                            size: {
                                type: "number",
                                description: "File size in bytes",
                            },
                            mimeType: {
                                type: "string",
                                description: "MIME type of the file",
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
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating upload request");
        console_1.logger.debug("KYC", `Document upload request received: dir=${body.dir}, filename=${body.filename}`);
        const { dir, file: base64File, filename, oldPath } = body;
        if (!dir || !base64File) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing directory or file data");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "No directory specified or no file provided",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating directory path security");
        if (typeof dir !== 'string' || dir.length > 100) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid directory path format");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid directory path",
            });
        }
        if (dir.includes('\0') || dir.includes('%00') || dir.includes('..')) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Directory path contains suspicious patterns");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid directory path",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating file format and encoding");
        if (typeof base64File !== 'string' || !base64File.startsWith('data:')) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Invalid base64 file format");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid file format",
            });
        }
        const base64Data = base64File.split(",")[1];
        if (!base64Data) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Missing base64 file data");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid file data",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking file size limits");
        const fileSizeBytes = (base64Data.length * 3) / 4;
        const maxSizeBytes = 50 * 1024 * 1024;
        if (fileSizeBytes > maxSizeBytes) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`File size ${Math.round(fileSizeBytes / 1024 / 1024)}MB exceeds 50MB limit`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "File size exceeds maximum limit of 50MB",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing upload directory path");
        const sanitizedDir = (0, validation_1.sanitizeUserPath)(dir.replace(/-/g, "/"));
        const mediaDir = path_1.default.join(BASE_UPLOAD_DIR, sanitizedDir);
        const resolvedMediaDir = path_1.default.resolve(mediaDir);
        const resolvedBaseDir = path_1.default.resolve(BASE_UPLOAD_DIR);
        if (!resolvedMediaDir.startsWith(resolvedBaseDir + path_1.default.sep) && resolvedMediaDir !== resolvedBaseDir) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Upload directory outside allowed path");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid upload directory",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating upload directory if needed");
        await ensureDirExists(mediaDir);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating MIME type");
        const mimeType = ((_a = base64File.match(/^data:(.*);base64,/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
        const allowedMimeTypes = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'text/plain',
            'text/csv',
        ];
        if (!allowedMimeTypes.includes(mimeType)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail(`MIME type ${mimeType} not allowed`);
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `File type ${mimeType} not allowed for KYC documents`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Decoding file data");
        const buffer = Buffer.from(base64Data, "base64");
        console_1.logger.debug("KYC", `File validation - MIME type: ${mimeType}, Buffer length: ${buffer.length}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating file signature against MIME type");
        const isValidFileType = validateFileSignature(buffer, mimeType);
        console_1.logger.debug("KYC", `File signature validation result: ${isValidFileType}`);
        if (!isValidFileType) {
            const isImageType = mimeType.startsWith('image/');
            if (isImageType) {
                console_1.logger.debug("KYC", "Image type detected, allowing despite magic number mismatch");
            }
            else {
                ctx === null || ctx === void 0 ? void 0 : ctx.fail("File signature does not match MIME type");
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "File content does not match declared MIME type. Potential security threat detected.",
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Generating secure filename");
        const timestamp = Date.now();
        const randomString = Math.round(Math.random() * 1e9);
        let extension = getExtensionFromMimeType(mimeType);
        if (!extension && filename) {
            const originalExt = path_1.default.extname(filename).toLowerCase();
            if (originalExt && isValidExtension(originalExt)) {
                extension = originalExt;
            }
        }
        const generatedFilename = `${timestamp}-${randomString}${extension}`;
        const filePath = path_1.default.join(mediaDir, generatedFilename);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Writing file to disk");
        await promises_1.default.writeFile(filePath, buffer);
        if (oldPath) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Removing old file");
            try {
                await removeOldFileSecurely(oldPath, sanitizedDir);
            }
            catch (error) {
                console_1.logger.error("KYC", "Error removing old file", error);
            }
        }
        const response = {
            url: generateFileUrl(`${sanitizedDir.replace(/\\/g, "/")}/${generatedFilename}`),
            filename: generatedFilename,
            size: fileSizeBytes,
            mimeType: mimeType,
        };
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Document uploaded successfully: ${generatedFilename}`);
        console_1.logger.debug("KYC", `Document upload successful: ${response.filename}`);
        return response;
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Document upload failed: ${error.message}`);
        console_1.logger.error("KYC", "Document upload error", error);
        throw error;
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
function validateFileSignature(buffer, mimeType) {
    if (buffer.length < 4)
        return false;
    const header = buffer.slice(0, 12);
    switch (mimeType) {
        case 'image/jpeg':
        case 'image/jpg':
            return header[0] === 0xFF && header[1] === 0xD8 && header[2] === 0xFF;
        case 'image/png':
            return header[0] === 0x89 && header[1] === 0x50 && header[2] === 0x4E && header[3] === 0x47;
        case 'image/gif':
            return (header[0] === 0x47 && header[1] === 0x49 && header[2] === 0x46) &&
                (header[3] === 0x38 && (header[4] === 0x37 || header[4] === 0x39));
        case 'image/webp':
            return header[0] === 0x52 && header[1] === 0x49 && header[2] === 0x46 && header[3] === 0x46 &&
                header[8] === 0x57 && header[9] === 0x45 && header[10] === 0x42 && header[11] === 0x50;
        case 'application/pdf':
            return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
        case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
        case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
        case 'application/vnd.ms-excel':
            return header[0] === 0x50 && header[1] === 0x4B;
        case 'application/msword':
            return header[0] === 0xD0 && header[1] === 0xCF && header[2] === 0x11 && header[3] === 0xE0;
        case 'text/plain':
        case 'text/csv':
            try {
                const text = buffer.toString('utf8');
                if (text.includes('\0')) {
                    return false;
                }
                const reencoded = Buffer.from(text, 'utf8');
                return reencoded.equals(buffer);
            }
            catch (_a) {
                return false;
            }
        default:
            return false;
    }
}
function getExtensionFromMimeType(mimeType) {
    const mimeToExt = {
        'image/jpeg': '.jpg',
        'image/jpg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'application/pdf': '.pdf',
        'application/msword': '.doc',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
        'application/vnd.ms-excel': '.xls',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
        'text/plain': '.txt',
        'text/csv': '.csv',
    };
    return mimeToExt[mimeType] || '.bin';
}
function isValidExtension(ext) {
    const validExtensions = [
        '.jpg', '.jpeg', '.png', '.webp', '.gif',
        '.pdf', '.doc', '.docx', '.xls', '.xlsx',
        '.txt', '.csv'
    ];
    return validExtensions.includes(ext.toLowerCase());
}
async function removeOldFileSecurely(oldPath, expectedDir) {
    const safeOldPath = oldPath
        .replace(/^(\.\.[/\\])+/, "")
        .replace(/^[/\\]+/, "");
    const expectedBaseDir = path_1.default.join(BASE_UPLOAD_DIR, expectedDir);
    const oldFileFullPath = path_1.default.resolve(BASE_UPLOAD_DIR, safeOldPath);
    if (!oldFileFullPath.startsWith(expectedBaseDir + path_1.default.sep) && oldFileFullPath !== expectedBaseDir) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Forbidden: Attempt to delete file outside upload directory",
        });
    }
    try {
        await promises_1.default.access(oldFileFullPath);
        await promises_1.default.unlink(oldFileFullPath);
    }
    catch (error) {
        if (error.code !== "ENOENT") {
            console_1.logger.error("KYC", "Error removing old file", error);
        }
    }
}
