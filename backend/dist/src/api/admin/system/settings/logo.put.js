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
    summary: "Updates logo files in /public/img/logo/ directory",
    operationId: "updateLogoFiles",
    tags: ["Admin", "Settings", "Logo"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        logoType: {
                            type: "string",
                            description: "Type of logo (logo, darkLogo, fullLogo, etc.)",
                        },
                        file: {
                            type: "string",
                            description: "Base64 encoded file data",
                        },
                    },
                    required: ["logoType", "file"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Logo updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            logoUrl: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid logo type or file" },
        401: { description: "Unauthorized" },
        500: { description: "Internal server error" },
    },
    permission: "edit.settings",
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Update logo",
};
const STRICT_LOGO_MAPPING = {
    logo: {
        primaryFiles: ["logo.png", "logo.webp"],
        additionalFiles: [
            "apple-icon-precomposed.png",
            "apple-icon-precomposed.webp",
            "apple-icon.png",
            "apple-icon.webp",
            "apple-touch-icon.png",
            "apple-touch-icon.webp",
        ],
        size: { width: 96, height: 96 }
    },
    darkLogo: {
        primaryFiles: ["logo-dark.png", "logo-dark.webp"],
        additionalFiles: [],
        size: { width: 96, height: 96 }
    },
    fullLogo: {
        primaryFiles: ["logo-text.png", "logo-text.webp"],
        additionalFiles: [],
        size: { width: 350, height: 75 }
    },
    darkFullLogo: {
        primaryFiles: ["logo-text-dark.png", "logo-text-dark.webp"],
        additionalFiles: [],
        size: { width: 350, height: 75 }
    },
    cardLogo: {
        primaryFiles: ["android-chrome-256x256.png", "android-chrome-256x256.webp"],
        additionalFiles: [],
        size: { width: 256, height: 256 }
    },
    favicon16: {
        primaryFiles: ["favicon-16x16.png", "favicon-16x16.webp"],
        additionalFiles: [],
        size: { width: 16, height: 16 }
    },
    favicon32: {
        primaryFiles: ["favicon-32x32.png", "favicon-32x32.webp"],
        additionalFiles: [],
        size: { width: 32, height: 32 }
    },
    favicon96: {
        primaryFiles: ["favicon-96x96.png", "favicon-96x96.webp"],
        additionalFiles: [],
        size: { width: 96, height: 96 }
    },
    appleIcon57: {
        primaryFiles: ["apple-icon-57x57.png", "apple-icon-57x57.webp"],
        additionalFiles: [],
        size: { width: 57, height: 57 }
    },
    appleIcon60: {
        primaryFiles: ["apple-icon-60x60.png", "apple-icon-60x60.webp"],
        additionalFiles: [],
        size: { width: 60, height: 60 }
    },
    appleIcon72: {
        primaryFiles: ["apple-icon-72x72.png", "apple-icon-72x72.webp"],
        additionalFiles: [],
        size: { width: 72, height: 72 }
    },
    appleIcon76: {
        primaryFiles: ["apple-icon-76x76.png", "apple-icon-76x76.webp"],
        additionalFiles: [],
        size: { width: 76, height: 76 }
    },
    appleIcon114: {
        primaryFiles: ["apple-icon-114x114.png", "apple-icon-114x114.webp"],
        additionalFiles: [],
        size: { width: 114, height: 114 }
    },
    appleIcon120: {
        primaryFiles: ["apple-icon-120x120.png", "apple-icon-120x120.webp"],
        additionalFiles: [],
        size: { width: 120, height: 120 }
    },
    appleIcon144: {
        primaryFiles: ["apple-icon-144x144.png", "apple-icon-144x144.webp"],
        additionalFiles: [
            "android-icon-144x144.png",
            "android-icon-144x144.webp",
            "mstile-144x144.png",
            "mstile-144x144.webp",
        ],
        size: { width: 144, height: 144 }
    },
    appleIcon152: {
        primaryFiles: ["apple-icon-152x152.png", "apple-icon-152x152.webp"],
        additionalFiles: [],
        size: { width: 152, height: 152 }
    },
    appleIcon180: {
        primaryFiles: ["apple-icon-180x180.png", "apple-icon-180x180.webp"],
        additionalFiles: [],
        size: { width: 180, height: 180 }
    },
    androidIcon192: {
        primaryFiles: ["android-chrome-192x192.png", "android-chrome-192x192.webp"],
        additionalFiles: [
            "android-icon-192x192.png",
            "android-icon-192x192.webp",
        ],
        size: { width: 192, height: 192 }
    },
    androidIcon256: {
        primaryFiles: ["android-chrome-256x256.png", "android-chrome-256x256.webp"],
        additionalFiles: [
            "android-icon-256x256.png",
            "android-icon-256x256.webp",
        ],
        size: { width: 256, height: 256 }
    },
    androidIcon384: {
        primaryFiles: ["android-chrome-384x384.png", "android-chrome-384x384.webp"],
        additionalFiles: [
            "android-icon-384x384.png",
            "android-icon-384x384.webp",
        ],
        size: { width: 384, height: 384 }
    },
    androidIcon512: {
        primaryFiles: ["android-chrome-512x512.png", "android-chrome-512x512.webp"],
        additionalFiles: [
            "android-icon-512x512.png",
            "android-icon-512x512.webp",
        ],
        size: { width: 512, height: 512 }
    },
    msIcon144: {
        primaryFiles: ["ms-icon-144x144.png", "ms-icon-144x144.webp"],
        additionalFiles: [
            "mstile-150x150.png",
            "mstile-150x150.webp",
        ],
        size: { width: 144, height: 144 }
    },
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { logoType, file } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating logo upload request");
    if (!logoType || !file) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Logo type and file are required",
        });
    }
    const logoConfig = STRICT_LOGO_MAPPING[logoType];
    if (!logoConfig) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Invalid logo type: ${logoType}. Valid types: ${Object.keys(STRICT_LOGO_MAPPING).join(', ')}`,
        });
    }
    if (!file.startsWith('data:')) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid file format",
        });
    }
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing logo upload for type: ${logoType}`);
        console_1.logger.debug("LOGO", `Processing logo upload for type: ${logoType}`);
        console_1.logger.debug("LOGO", `File size: ${file.length} characters`);
        const isProduction = process.env.NODE_ENV === 'production';
        let logoDir;
        if (isProduction) {
            const possiblePaths = [
                path_1.default.join(process.cwd(), "frontend", "public", "img", "logo"),
                path_1.default.join(process.cwd(), "public", "img", "logo"),
                path_1.default.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
                path_1.default.join(process.cwd(), "..", "public", "img", "logo"),
            ];
            logoDir = possiblePaths[0];
            for (const testPath of possiblePaths) {
                const parentDir = path_1.default.dirname(testPath);
                if (fs_1.default.existsSync(parentDir)) {
                    logoDir = testPath;
                    break;
                }
            }
            console_1.logger.debug("LOGO", "Production mode detected");
            console_1.logger.debug("LOGO", `Current working directory: ${process.cwd()}`);
            console_1.logger.debug("LOGO", `Selected logo directory: ${logoDir}`);
            console_1.logger.debug("LOGO", `Logo directory exists: ${fs_1.default.existsSync(logoDir)}`);
            console_1.logger.debug("LOGO", `Parent directory exists: ${fs_1.default.existsSync(path_1.default.dirname(logoDir))}`);
        }
        else {
            logoDir = path_1.default.join(process.cwd(), "..", "frontend", "public", "img", "logo");
        }
        const base64Data = file.split(",")[1];
        if (!base64Data) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Invalid file data",
            });
        }
        const buffer = Buffer.from(base64Data, "base64");
        console_1.logger.debug("LOGO", `Buffer created, size: ${buffer.length} bytes`);
        let finalLogoDir = logoDir;
        let directoryCreated = false;
        if (isProduction) {
            const fallbackPaths = [
                logoDir,
                path_1.default.join(process.cwd(), "public", "img", "logo"),
                path_1.default.join(process.cwd(), "..", "frontend", "public", "img", "logo"),
                path_1.default.join(process.cwd(), "..", "public", "img", "logo"),
            ];
            for (const testPath of fallbackPaths) {
                try {
                    if (!fs_1.default.existsSync(testPath)) {
                        await promises_1.default.mkdir(testPath, { recursive: true });
                        console_1.logger.debug("LOGO", `Successfully created directory: ${testPath}`);
                    }
                    finalLogoDir = testPath;
                    directoryCreated = true;
                    break;
                }
                catch (error) {
                    console_1.logger.error("LOGO", `Failed to create directory ${testPath}: ${error.message}`);
                    continue;
                }
            }
            if (!directoryCreated) {
                throw (0, error_1.createError)({
                    statusCode: 500,
                    message: "Failed to create logo directory in any of the attempted paths",
                });
            }
        }
        else {
            if (!fs_1.default.existsSync(finalLogoDir)) {
                try {
                    await promises_1.default.mkdir(finalLogoDir, { recursive: true });
                    console_1.logger.debug("LOGO", `Created logo directory: ${finalLogoDir}`);
                }
                catch (mkdirError) {
                    console_1.logger.error("LOGO", `Failed to create logo directory: ${finalLogoDir}`, mkdirError);
                    throw (0, error_1.createError)({
                        statusCode: 500,
                        message: `Failed to create logo directory: ${mkdirError.message}`,
                    });
                }
            }
        }
        console_1.logger.debug("LOGO", `Using final logo directory: ${finalLogoDir}`);
        const allFilesToProcess = [...logoConfig.primaryFiles, ...logoConfig.additionalFiles];
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${allFilesToProcess.length} logo variants`);
        const results = [];
        for (const filename of allFilesToProcess) {
            const targetPath = path_1.default.join(finalLogoDir, filename);
            const isWebP = filename.endsWith('.webp');
            const fileSize = getFileSizeFromFilename(filename) || logoConfig.size;
            try {
                let processedImage = (0, sharp_1.default)(buffer);
                processedImage = processedImage.resize(fileSize.width, fileSize.height, {
                    fit: 'inside',
                    withoutEnlargement: false
                });
                if (isWebP) {
                    processedImage = processedImage.webp({ quality: 90 });
                }
                else {
                    processedImage = processedImage.png({ compressionLevel: 6 });
                }
                await processedImage.toFile(targetPath);
                results.push({ filename, success: true });
            }
            catch (error) {
                console_1.logger.error("LOGO", `Failed to process file ${filename}: ${error.message}`);
                results.push({ filename, success: false, error: error.message });
            }
        }
        const logoUrl = `/img/logo/${logoConfig.primaryFiles[0]}`;
        const successCount = results.filter(r => r.success).length;
        const failedCount = results.filter(r => !r.success).length;
        if (failedCount > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.warn(`${failedCount} logo variants failed to process`);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Logo ${logoType} updated: ${successCount}/${results.length} files processed`);
        return {
            message: `Logo ${logoType} updated successfully. Processed ${successCount}/${results.length} files.`,
            logoUrl,
            results,
        };
    }
    catch (error) {
        console_1.logger.error("LOGO", `Failed to update logo ${logoType}`, error);
        console_1.logger.error("LOGO", `Error message: ${error === null || error === void 0 ? void 0 : error.message}`);
        console_1.logger.debug("LOGO", `Error stack: ${error === null || error === void 0 ? void 0 : error.stack}`);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(`Failed to update logo ${logoType}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Failed to update logo ${logoType}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`,
        });
    }
};
function getFileSizeFromFilename(filename) {
    const sizeMatch = filename.match(/(\d+)x(\d+)/);
    if (sizeMatch) {
        return {
            width: parseInt(sizeMatch[1]),
            height: parseInt(sizeMatch[2]),
        };
    }
    return null;
}
