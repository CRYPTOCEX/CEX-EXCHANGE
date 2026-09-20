"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PATH_INJECTION_PATTERNS = exports.COMMON_INJECTION_PATTERNS = void 0;
exports.containsInjection = containsInjection;
exports.COMMON_INJECTION_PATTERNS = [
    /\.\.[/\\]/,
    /%c0%ae|%c0%af|%c1%9c|%e0%80%af|%252e|%252f/i,
    /%00|%0a|%0d/i,
    /(\b(select|union|insert|update|delete|drop|alter|exec|execute)\b.*\b(from|into|where|table|database|sleep|benchmark)\b)/i,
    /(\bnslookup\b|\bcurl\b|\bwget\b|\bping\b)/i,
    /(<script|javascript:|on\w+=)/i,
    /\x00/,
    /win\.ini|boot\.ini|\/etc\/passwd|\/etc\/shadow/i,
];
exports.PATH_INJECTION_PATTERNS = [
    ...exports.COMMON_INJECTION_PATTERNS,
    /(<%|%>|\{\{|\}\})/,
    /[;|`$(){}]/,
];
function containsInjection(value, isPathParam) {
    const patterns = isPathParam ? exports.PATH_INJECTION_PATTERNS : exports.COMMON_INJECTION_PATTERNS;
    return patterns.some((pattern) => pattern.test(value));
}
