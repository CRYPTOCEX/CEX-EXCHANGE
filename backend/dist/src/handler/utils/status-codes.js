"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_MESSAGES = void 0;
exports.getStatusMessage = getStatusMessage;
exports.isSuccessStatus = isSuccessStatus;
exports.isClientError = isClientError;
exports.isServerError = isServerError;
exports.STATUS_MESSAGES = {
    100: "Continue",
    101: "Switching Protocols",
    200: "OK",
    201: "Created",
    202: "Accepted",
    204: "No Content",
    301: "Moved Permanently",
    302: "Found",
    304: "Not Modified",
    400: "Bad Request",
    401: "Unauthorized",
    402: "Payment Required",
    403: "Forbidden",
    404: "Not Found",
    405: "Method Not Allowed",
    408: "Request Timeout",
    409: "Conflict",
    410: "Gone",
    415: "Unsupported Media Type",
    422: "Unprocessable Entity",
    429: "Too Many Requests",
    500: "Internal Server Error",
    501: "Not Implemented",
    502: "Bad Gateway",
    503: "Service Unavailable",
    504: "Gateway Timeout",
};
function getStatusMessage(code) {
    return exports.STATUS_MESSAGES[code] || "Unknown Status";
}
function isSuccessStatus(code) {
    return code >= 200 && code < 300;
}
function isClientError(code) {
    return code >= 400 && code < 500;
}
function isServerError(code) {
    return code >= 500 && code < 600;
}
