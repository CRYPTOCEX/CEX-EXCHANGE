"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const sharp_1 = __importDefault(require("sharp"));
const query_1 = require("@b/utils/query");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const isProduction = process.env.NODE_ENV === 'production';
let BASE_UPLOAD_DIR;
if (isProduction) {
    const possiblePaths = [
        path_1.default.join(process.cwd(), "frontend", "public", "img", "logo"),
        path_1.default.join(process.cwd(), "public", "img", "logo"),
        path_1.default.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
        path_1.default.join(process.cwd(), "..", "public", "img", "logo"),
    ];
    BASE_UPLOAD_DIR = possiblePaths[0];
    for (const testPath of possiblePaths) {
        const parentDir = path_1.default.dirname(testPath);
        if (fs_1.default.existsSync(parentDir)) {
            BASE_UPLOAD_DIR = testPath;
            break;
        }
    }
    console_1.logger.debug("LOGO", "Production mode detected");
    console_1.logger.debug("LOGO", `Current working directory: ${process.cwd()}`);
    console_1.logger.debug("LOGO", `Selected logo directory: ${BASE_UPLOAD_DIR}`);
    console_1.logger.debug("LOGO", `Logo directory exists: ${fs_1.default.existsSync(BASE_UPLOAD_DIR)}`);
    console_1.logger.debug("LOGO", `Parent directory exists: ${fs_1.default.existsSync(path_1.default.dirname(BASE_UPLOAD_DIR))}`);
}
else {
    BASE_UPLOAD_DIR = path_1.default.join(process.cwd(), "..", "frontend", "public", "img", "logo");
}
const LOGO_CONFIGS = {
    "logo": { width: 512, height: 512, formats: ["png", "webp"] },
    "logo-text": { width: 300, height: 100, formats: ["png", "webp"] },
    "favicon-16x16": { width: 16, height: 16, formats: ["png", "webp"] },
    "favicon-32x32": { width: 32, height: 32, formats: ["png", "webp"] },
    "favicon-96x96": { width: 96, height: 96, formats: ["png", "webp"] },
    "apple-icon-57x57": { width: 57, height: 57, formats: ["png", "webp"] },
    "apple-icon-60x60": { width: 60, height: 60, formats: ["png", "webp"] },
    "apple-icon-72x72": { width: 72, height: 72, formats: ["png", "webp"] },
    "apple-icon-76x76": { width: 76, height: 76, formats: ["png", "webp"] },
    "apple-icon-114x114": { width: 114, height: 114, formats: ["png", "webp"] },
    "apple-icon-120x120": { width: 120, height: 120, formats: ["png", "webp"] },
    "apple-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
    "apple-icon-152x152": { width: 152, height: 152, formats: ["png", "webp"] },
    "apple-icon-180x180": { width: 180, height: 180, formats: ["png", "webp"] },
    "apple-icon-precomposed": { width: 192, height: 192, formats: ["png", "webp"] },
    "apple-icon": { width: 192, height: 192, formats: ["png", "webp"] },
    "apple-touch-icon": { width: 180, height: 180, formats: ["png", "webp"] },
    "android-icon-36x36": { width: 36, height: 36, formats: ["png", "webp"] },
    "android-icon-48x48": { width: 48, height: 48, formats: ["png", "webp"] },
    "android-icon-72x72": { width: 72, height: 72, formats: ["png", "webp"] },
    "android-icon-96x96": { width: 96, height: 96, formats: ["png", "webp"] },
    "android-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
    "android-icon-192x192": { width: 192, height: 192, formats: ["png", "webp"] },
    "android-icon-256x256": { width: 256, height: 256, formats: ["png", "webp"] },
    "android-icon-384x384": { width: 384, height: 384, formats: ["png", "webp"] },
    "android-icon-512x512": { width: 512, height: 512, formats: ["png", "webp"] },
    "android-chrome-192x192": { width: 192, height: 192, formats: ["png", "webp"] },
    "android-chrome-256x256": { width: 256, height: 256, formats: ["png", "webp"] },
    "android-chrome-384x384": { width: 384, height: 384, formats: ["png", "webp"] },
    "android-chrome-512x512": { width: 512, height: 512, formats: ["png", "webp"] },
    "ms-icon-70x70": { width: 70, height: 70, formats: ["png", "webp"] },
    "ms-icon-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
    "ms-icon-150x150": { width: 150, height: 150, formats: ["png", "webp"] },
    "ms-icon-310x310": { width: 310, height: 310, formats: ["png", "webp"] },
    "mstile-70x70": { width: 70, height: 70, formats: ["png", "webp"] },
    "mstile-144x144": { width: 144, height: 144, formats: ["png", "webp"] },
    "mstile-150x150": { width: 150, height: 150, formats: ["png", "webp"] },
    "mstile-310x150": { width: 310, height: 150, formats: ["webp"] },
    "mstile-310x310": { width: 310, height: 310, formats: ["png", "webp"] },
};
exports.metadata = {
    summary: "Upload and update logo files",
    description: "Uploads a new logo and updates all logo variants in the /img/logo directory with the same filenames",
    operationId: "uploadLogo",
    tags: ["Admin", "Logo"],
    logModule: "ADMIN_SYS",
    logTitle: "Upload logo",
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        file: {
                            type: "string",
                            description: "Base64 encoded logo file data",
                        },
                        logoType: {
                            type: "string",
                            enum: ["logo", "logo-text"],
                            description: "Type of logo to update (main logo or logo with text)",
                            default: "logo"
                        },
                    },
                    required: ["file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Logo uploaded and updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            updatedFiles: {
                                type: "array",
                                items: { type: "string" },
                                description: "List of updated logo files",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Logo"),
        500: query_1.serverErrorResponse,
    },
    permission: "access.system",
};
exports.default = async (data) => {
    var _a;
    const { body, user, ctx } = data;
    if (!user)
        throw (0, error_1.createError)({ statusCode: 401, message: "User not found" });
    const { file: base64File, logoType = "logo" } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating logo upload request");
    if (!base64File) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No file provided" });
    }
    if (typeof base64File !== 'string' || !base64File.startsWith('data:image/')) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid image file format" });
    }
    const base64Data = base64File.split(",")[1];
    if (!base64Data) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid file data" });
    }
    const fileSizeBytes = (base64Data.length * 3) / 4;
    const maxSizeBytes = 5 * 1024 * 1024;
    if (fileSizeBytes > maxSizeBytes) {
        throw (0, error_1.createError)({ statusCode: 400, message: "File size exceeds maximum limit of 5MB" });
    }
    const mimeType = ((_a = base64File.match(/^data:(.*);base64,/)) === null || _a === void 0 ? void 0 : _a[1]) || "";
    const allowedMimeTypes = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'
    ];
    if (!allowedMimeTypes.includes(mimeType)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Only image files are allowed for logos" });
    }
    const buffer = Buffer.from(base64Data, "base64");
    const updatedFiles = [];
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing logo upload");
        await ensureDirExists(BASE_UPLOAD_DIR);
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Generating ${logoType} variants`);
        if (logoType === "logo-text") {
            const config = LOGO_CONFIGS["logo-text"];
            for (const format of config.formats) {
                const filename = `logo-text.${format}`;
                const filePath = path_1.default.join(BASE_UPLOAD_DIR, filename);
                let processedImage;
                if (format === "webp") {
                    processedImage = await (0, sharp_1.default)(buffer)
                        .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .webp({ quality: 90 })
                        .toBuffer();
                }
                else {
                    processedImage = await (0, sharp_1.default)(buffer)
                        .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                        .png({ quality: 90 })
                        .toBuffer();
                }
                await promises_1.default.writeFile(filePath, processedImage);
                updatedFiles.push(filename);
            }
        }
        else {
            for (const [logoName, config] of Object.entries(LOGO_CONFIGS)) {
                if (logoName === "logo-text")
                    continue;
                for (const format of config.formats) {
                    const filename = `${logoName}.${format}`;
                    const filePath = path_1.default.join(BASE_UPLOAD_DIR, filename);
                    let processedImage;
                    if (format === "webp") {
                        processedImage = await (0, sharp_1.default)(buffer)
                            .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                            .webp({ quality: 90 })
                            .toBuffer();
                    }
                    else {
                        processedImage = await (0, sharp_1.default)(buffer)
                            .resize(config.width, config.height, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
                            .png({ quality: 90 })
                            .toBuffer();
                    }
                    await promises_1.default.writeFile(filePath, processedImage);
                    updatedFiles.push(filename);
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Logo updated successfully: ${updatedFiles.length} files (${logoType})`);
        return {
            message: `Logo updated successfully. ${updatedFiles.length} files updated.`,
            updatedFiles,
        };
    }
    catch (error) {
        console_1.logger.error("LOGO", "Error updating logo files", error);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to update logo files");
        throw (0, error_1.createError)({ statusCode: 500, message: "Failed to update logo files" });
    }
};
async function ensureDirExists(dir) {
    try {
        await promises_1.default.access(dir);
        console_1.logger.debug("LOGO", `Directory exists: ${dir}`);
    }
    catch (error) {
        if (error.code === "ENOENT") {
            try {
                console_1.logger.debug("LOGO", `Creating directory: ${dir}`);
                await promises_1.default.mkdir(dir, { recursive: true });
                console_1.logger.debug("LOGO", `Directory created successfully: ${dir}`);
            }
            catch (mkdirError) {
                console_1.logger.error("LOGO", `Failed to create directory: ${dir}`, mkdirError);
                throw (0, error_1.createError)({ statusCode: 500, message: `Failed to create logo directory: ${mkdirError.message}` });
            }
        }
        else {
            console_1.logger.error("LOGO", `Directory access error: ${dir}`, error);
            throw error;
        }
    }
}
