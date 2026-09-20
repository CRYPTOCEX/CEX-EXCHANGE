"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertSessionCaller = assertSessionCaller;
exports.requireOwnSessionId = requireOwnSessionId;
const error_1 = require("@b/utils/error");
const token_1 = require("@b/utils/token");
function assertSessionCaller(data) {
    var _a, _b;
    const apiKey = (_a = data.headers) === null || _a === void 0 ? void 0 : _a["x-api-key"];
    if (apiKey || Array.isArray((_b = data.user) === null || _b === void 0 ? void 0 : _b.permissions)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "This action requires a signed-in session.",
        });
    }
}
async function requireOwnSessionId(data, userId) {
    const cookies = data.cookies;
    const sessionId = (cookies && cookies.sessionId) ||
        (data.headers && data.headers.sessionid) ||
        "";
    const sessions = await (0, token_1.getUserSessions)(userId);
    if (!sessionId || !sessions.some((s) => s.sessionId === sessionId)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Could not identify your current session. Please sign in again and retry.",
        });
    }
    return sessionId;
}
