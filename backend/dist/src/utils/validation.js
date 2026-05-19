"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizePath = sanitizePath;
exports.sanitizeUserPath = sanitizeUserPath;
exports.validatePathSecurity = validatePathSecurity;
exports.validateSchema = validateSchema;
exports.validateUploadFilePath = validateUploadFilePath;
const ajv_1 = __importDefault(require("ajv"));
const ajv_formats_1 = __importDefault(require("ajv-formats"));
const path_1 = __importDefault(require("path"));
const console_1 = require("./console");
const error_1 = require("./error");
function sanitizePath(inputPath) {
    const normalizedPath = path_1.default.normalize(inputPath);
    return normalizedPath;
}
function sanitizeUserPath(inputPath) {
    if (!inputPath || typeof inputPath !== 'string') {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Invalid path provided' });
    }
    if (inputPath.includes('\0') || inputPath.includes('%00')) {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Path contains null bytes' });
    }
    const dangerousPatterns = [
        /\.\./g,
        /\.\\/g,
        /\.\\+/g,
        /\/\.+\//g,
        /^\.+/,
        /\.+$/,
        /\/{2,}/g,
        /\\{2,}/g,
        /[<>:"|?*]/g,
        /[\x00-\x1F]/g,
    ];
    let sanitized = inputPath;
    for (const pattern of dangerousPatterns) {
        sanitized = sanitized.replace(pattern, '');
    }
    sanitized = sanitized.replace(/\\/g, '/');
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');
    if (!sanitized || sanitized === '.' || sanitized === '/') {
        sanitized = 'default';
    }
    const blockedPaths = ['etc', 'bin', 'usr', 'var', 'proc', 'sys', 'dev', 'boot', 'root', 'home'];
    const pathParts = sanitized.toLowerCase().split('/');
    for (const part of pathParts) {
        if (blockedPaths.includes(part)) {
            throw (0, error_1.createError)({ statusCode: 403, message: `Access to system directory ${part} is not allowed` });
        }
    }
    if (sanitized.length > 200) {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Path too long' });
    }
    if (!/^[a-zA-Z0-9_\-/.]+$/.test(sanitized)) {
        throw (0, error_1.createError)({ statusCode: 400, message: 'Path contains invalid characters' });
    }
    return sanitized;
}
function validatePathSecurity(resolvedPath, allowedBasePath) {
    try {
        const normalizedPath = path_1.default.resolve(resolvedPath);
        const normalizedBase = path_1.default.resolve(allowedBasePath);
        return normalizedPath.startsWith(normalizedBase + path_1.default.sep) || normalizedPath === normalizedBase;
    }
    catch (error) {
        console_1.logger.error("VALIDATION", "Path validation error", error);
        return false;
    }
}
function convertBooleanStrings(value) {
    if (typeof value === "string") {
        if (value.toLowerCase() === "true")
            return true;
        if (value.toLowerCase() === "false")
            return false;
    }
    else if (typeof value === "object" && value !== null) {
        for (const key in value) {
            value[key] = convertBooleanStrings(value[key]);
        }
    }
    return value;
}
function getFieldSchema(pathStr, schema) {
    return pathStr
        .split(".")
        .reduce((acc, key) => acc && acc.properties && acc.properties[key] ? acc.properties[key] : {}, schema);
}
function toFriendlyName(pathStr) {
    const lastSegment = pathStr.split(".").pop() || pathStr;
    return lastSegment
        .replace(/([A-Z])/g, " $1")
        .replace(/^./, (str) => str.toUpperCase())
        .trim();
}
function formatErrorMessage(pathStr, error, schema) {
    const fieldName = toFriendlyName(pathStr);
    const fieldSchema = getFieldSchema(pathStr, schema);
    const expectedFormat = fieldSchema["x-expectedFormat"];
    let message = error.message || "";
    switch (error.keyword) {
        case "required":
            message = `${fieldName} is required.`;
            break;
        case "minLength":
            message = `${fieldName} must be at least ${error.params.limit} characters long.`;
            break;
        case "maxLength":
            message = `${fieldName} must be no more than ${error.params.limit} characters long.`;
            break;
        case "minimum":
            message = `${fieldName} must be at least ${error.params.limit}.`;
            break;
        case "maximum":
            message = `${fieldName} must not exceed ${error.params.limit}.`;
            break;
        case "enum": {
            const allowedValues = error.params.allowedValues.join(", ");
            message = `${fieldName} must be one of the following: ${allowedValues}.`;
            break;
        }
        case "pattern":
            message = `${fieldName} is incorrectly formatted. Expected format: ${expectedFormat || error.params.pattern}.`;
            break;
        case "type":
            message = `${fieldName} must be a ${error.params.type}.`;
            break;
        default:
            message = `${fieldName} ${error.message}.`;
            break;
    }
    return message;
}
function validateSchema(value, schema) {
    const ajv = new ajv_1.default({ allErrors: true, coerceTypes: true, strict: false });
    (0, ajv_formats_1.default)(ajv);
    ajv.addKeyword({
        keyword: "x-expectedFormat",
        metaSchema: { type: "string" },
    });
    let validate;
    try {
        validate = ajv.compile(schema);
    }
    catch (error) {
        console_1.logger.error("VALIDATION", "Schema compilation failed", error);
        throw (0, error_1.createError)({ statusCode: 400, message: "Schema compilation failed: " + error.message });
    }
    const transformedValue = convertBooleanStrings(value);
    if (!validate(transformedValue)) {
        const errorDetails = (validate.errors || []).map((error) => {
            let pathStr = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
            if (!pathStr && error.params && error.params.missingProperty) {
                pathStr = error.params.missingProperty;
            }
            const customMessage = formatErrorMessage(pathStr, error, schema);
            return { path: pathStr, message: customMessage };
        });
        console_1.logger.debug("VALIDATION", `Schema validation failed: ${JSON.stringify(errorDetails)}`);
        const userFriendlyMessages = errorDetails.map(err => err.message);
        const friendlyMessage = userFriendlyMessages.length === 1
            ? userFriendlyMessages[0]
            : userFriendlyMessages.join("; ");
        const validationError = new Error(friendlyMessage);
        validationError.details = errorDetails;
        validationError.isValidationError = true;
        throw validationError;
    }
    return transformedValue;
}
function validateUploadFilePath(filePath) {
    if (!filePath || typeof filePath !== 'string') {
        return { isValid: false, exists: false, error: 'Invalid file path' };
    }
    if (!filePath.startsWith('/uploads/')) {
        return { isValid: false, exists: false, error: 'File path must start with /uploads/' };
    }
    try {
        const fs = require('fs');
        const path = require('path');
        const isProduction = process.env.NODE_ENV === 'production';
        const basePath = isProduction
            ? path.join(process.cwd(), "frontend", "public")
            : path.join(process.cwd(), "..", "frontend", "public");
        const fullPath = path.join(basePath, filePath);
        const exists = fs.existsSync(fullPath);
        return {
            isValid: true,
            exists,
            fullPath,
            error: exists ? undefined : 'File does not exist'
        };
    }
    catch (error) {
        return {
            isValid: false,
            exists: false,
            error: `Error validating file: ${error.message}`
        };
    }
}
