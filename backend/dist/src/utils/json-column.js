"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.readJsonArrayColumn = readJsonArrayColumn;
exports.readJsonObjectColumn = readJsonObjectColumn;
function readJsonArrayColumn(value) {
    if (value == null)
        return [];
    if (Array.isArray(value))
        return value.slice();
    if (typeof value === "string") {
        if (!value.trim())
            return [];
        try {
            const parsed = JSON.parse(value);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch (_a) {
            return [];
        }
    }
    return [];
}
function readJsonObjectColumn(value) {
    if (value == null)
        return null;
    if (Array.isArray(value))
        return null;
    if (typeof value === "string") {
        if (!value.trim())
            return null;
        try {
            const parsed = JSON.parse(value);
            return parsed && typeof parsed === "object" && !Array.isArray(parsed)
                ? { ...parsed }
                : null;
        }
        catch (_a) {
            return null;
        }
    }
    if (typeof value === "object")
        return { ...value };
    return null;
}
