"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.publicDirectory = exports.mediaDirectory = exports.cacheInitialized = exports.mediaCache = exports.operatorMap = void 0;
exports.filterMediaCache = filterMediaCache;
exports.initMediaWatcher = initMediaWatcher;
const fs_1 = require("fs");
const path_1 = require("path");
const sharp_1 = __importDefault(require("sharp"));
const console_1 = require("@b/utils/console");
exports.operatorMap = {
    equal: (item, key, value) => item[key] === value,
    notEqual: (item, key, value) => item[key] !== value,
    greaterThan: (item, key, value) => item[key] > value,
    greaterThanOrEqual: (item, key, value) => item[key] >= value,
    lessThan: (item, key, value) => item[key] < value,
    lessThanOrEqual: (item, key, value) => item[key] <= value,
    between: (item, key, value) => item[key] >= value[0] && item[key] <= value[1],
    notBetween: (item, key, value) => item[key] < value[0] || item[key] > value[1],
    like: (item, key, value) => new RegExp(value, "i").test(item[key]),
    notLike: (item, key, value) => !new RegExp(value, "i").test(item[key]),
    startsWith: (item, key, value) => { var _a; return (_a = item[key]) === null || _a === void 0 ? void 0 : _a.startsWith(value); },
    endsWith: (item, key, value) => { var _a; return (_a = item[key]) === null || _a === void 0 ? void 0 : _a.endsWith(value); },
    substring: (item, key, value) => { var _a; return (_a = item[key]) === null || _a === void 0 ? void 0 : _a.includes(value); },
    regexp: (item, key, value) => new RegExp(value).test(item[key]),
    notRegexp: (item, key, value) => !new RegExp(value).test(item[key]),
};
exports.mediaCache = [];
exports.cacheInitialized = false;
const isProduction = process.env.NODE_ENV === 'production';
exports.mediaDirectory = isProduction
    ? (0, path_1.join)(process.cwd(), "frontend", "public", "uploads")
    : (0, path_1.join)(process.cwd(), "..", "frontend", "public", "uploads");
exports.publicDirectory = isProduction
    ? (0, path_1.join)(process.cwd(), "frontend", "public")
    : (0, path_1.join)(process.cwd(), "..", "frontend", "public");
function filterMediaCache(imagePath) {
    exports.mediaCache = exports.mediaCache.filter((file) => file.id !== imagePath);
}
async function updateMediaCache(directory) {
    const fileList = [];
    async function readMediaFiles(dir) {
        const files = await fs_1.promises.readdir(dir, { withFileTypes: true });
        for (const file of files) {
            const filePath = (0, path_1.join)(dir, file.name);
            if (file.isDirectory()) {
                await readMediaFiles(filePath);
            }
            else if (/\.(jpg|jpeg|png|gif|webp)$/i.test(file.name)) {
                try {
                    const { mtime } = await fs_1.promises.stat(filePath);
                    let webPath = filePath
                        .substring(exports.mediaDirectory.length)
                        .replace(/\\/g, "/");
                    if (!webPath.startsWith("/"))
                        webPath = "/" + webPath;
                    const image = (0, sharp_1.default)(filePath);
                    const metadata = await image.metadata();
                    fileList.push({
                        id: "/uploads" + webPath.replace(/\//g, "_"),
                        name: file.name,
                        path: "/uploads" + webPath,
                        width: metadata.width,
                        height: metadata.height,
                        dateModified: mtime,
                    });
                }
                catch (error) {
                    console_1.logger.error("MEDIA", `Error accessing file: ${filePath}`, error);
                }
            }
        }
    }
    await readMediaFiles(directory);
    exports.mediaCache = fileList;
    exports.cacheInitialized = true;
}
async function initMediaWatcher() {
    await updateMediaCache(exports.mediaDirectory);
    (0, fs_1.watch)(exports.mediaDirectory, { recursive: true }, async (eventType, filename) => {
        await updateMediaCache(exports.mediaDirectory);
    });
}
