"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sanitizeName = sanitizeName;
function sanitizeName(name) {
    if (typeof name !== "string")
        return "";
    let sanitized = name.replace(/<.*?>/g, "");
    sanitized = sanitized.replace(/[&<>"'/\\;:]/g, "");
    sanitized = sanitized.replace(/[^\p{L} \-'.]/gu, "");
    sanitized = sanitized.trim().slice(0, 64);
    return sanitized;
}
