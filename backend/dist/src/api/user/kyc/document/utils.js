"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LEGACY_KYC_UPLOAD_PREFIX = exports.KYC_DOCUMENT_URL_PREFIX = exports.KYC_DOCUMENT_FILENAME = exports.KYC_OWNER_ID = exports.KYC_DOCUMENT_EXTENSIONS = exports.KYC_DOCUMENT_CONTENT_TYPES = void 0;
exports.resolveKycDocumentDir = resolveKycDocumentDir;
exports.resolveKycOwnerDir = resolveKycOwnerDir;
exports.resolveKycDocumentPath = resolveKycDocumentPath;
exports.kycDocumentUrl = kycDocumentUrl;
const path_1 = __importDefault(require("path"));
exports.KYC_DOCUMENT_CONTENT_TYPES = {
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".png": "image/png",
    ".webp": "image/webp",
    ".gif": "image/gif",
    ".pdf": "application/pdf",
    ".doc": "application/msword",
    ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    ".xls": "application/vnd.ms-excel",
    ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ".txt": "text/plain",
    ".csv": "text/csv",
};
exports.KYC_DOCUMENT_EXTENSIONS = Object.keys(exports.KYC_DOCUMENT_CONTENT_TYPES);
exports.KYC_OWNER_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
exports.KYC_DOCUMENT_FILENAME = new RegExp(`^[A-Za-z0-9][A-Za-z0-9._-]{0,118}(${exports.KYC_DOCUMENT_EXTENSIONS.map((extension) => extension.replace(".", "\\.")).join("|")})$`, "i");
function resolveKycDocumentDir() {
    const override = process.env.KYC_DOCUMENT_DIR;
    if (override)
        return path_1.default.resolve(override);
    const cwd = process.cwd();
    const inBackendDir = cwd.endsWith("backend") || cwd.endsWith("backend" + path_1.default.sep);
    return inBackendDir
        ? path_1.default.join(cwd, "storage", "kyc", "documents")
        : path_1.default.join(cwd, "backend", "storage", "kyc", "documents");
}
function resolveKycOwnerDir(userId) {
    if (!exports.KYC_OWNER_ID.test(String(userId || "")))
        return null;
    const baseDir = resolveKycDocumentDir();
    const resolved = path_1.default.resolve(baseDir, String(userId));
    if (!resolved.startsWith(path_1.default.resolve(baseDir) + path_1.default.sep))
        return null;
    return resolved;
}
function resolveKycDocumentPath(userId, filename) {
    const ownerDir = resolveKycOwnerDir(userId);
    if (!ownerDir)
        return null;
    if (!exports.KYC_DOCUMENT_FILENAME.test(String(filename || "")))
        return null;
    const resolved = path_1.default.resolve(ownerDir, String(filename));
    if (!resolved.startsWith(ownerDir + path_1.default.sep))
        return null;
    return resolved;
}
function kycDocumentUrl(userId, filename) {
    return `/api/user/kyc/document/${userId}/${filename}`;
}
exports.KYC_DOCUMENT_URL_PREFIX = "/api/user/kyc/document/";
exports.LEGACY_KYC_UPLOAD_PREFIX = "/uploads/kyc/";
