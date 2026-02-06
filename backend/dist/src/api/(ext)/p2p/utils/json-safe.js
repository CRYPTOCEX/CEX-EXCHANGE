"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.safeStringify = safeStringify;
exports.safeParse = safeParse;
exports.prepareJsonFields = prepareJsonFields;
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
function safeStringify(value, fieldName = 'field') {
    if (typeof value === 'string') {
        try {
            JSON.parse(value);
            return value;
        }
        catch (err) {
            throw (0, error_1.createError)({ statusCode: 400, message: `${fieldName} contains invalid JSON string: ${err}` });
        }
    }
    if (typeof value === 'object' && value !== null) {
        try {
            const stringified = JSON.stringify(value);
            JSON.parse(stringified);
            return stringified;
        }
        catch (err) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Failed to stringify ${fieldName}: ${err}` });
        }
    }
    throw (0, error_1.createError)({ statusCode: 400, message: `${fieldName} must be an object or valid JSON string` });
}
function safeParse(value, defaultValue) {
    if (typeof value === 'object' && value !== null) {
        return value;
    }
    if (typeof value === 'string') {
        try {
            return JSON.parse(value);
        }
        catch (err) {
            console_1.logger.error("P2P_JSON", "JSON parse error", err);
            return defaultValue;
        }
    }
    return defaultValue;
}
function prepareJsonFields(data, jsonFields) {
    const prepared = { ...data };
    for (const field of jsonFields) {
        if (prepared[field] !== undefined && prepared[field] !== null) {
            try {
                prepared[field] = safeStringify(prepared[field], String(field));
            }
            catch (err) {
                throw (0, error_1.createError)({ statusCode: 400, message: `Failed to prepare ${String(field)}: ${err}` });
            }
        }
    }
    return prepared;
}
