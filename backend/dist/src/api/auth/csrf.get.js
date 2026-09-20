"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const redis_1 = require("@b/utils/redis");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Re-issues the CSRF token for the current session",
    operationId: "refreshCsrfToken",
    tags: ["Auth"],
    description: "Returns the CSRF token for the authenticated session and re-sets the csrfToken cookie so the client can recover from a missing/stale token without re-authenticating.",
    requiresAuth: true,
    responses: {
        200: {
            description: "CSRF token re-issued",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            csrfToken: { type: "string", description: "Current session CSRF token" },
                        },
                        required: ["csrfToken"],
                    },
                },
            },
        },
        401: { description: "Unauthorized / session not found" },
    },
};
exports.default = async (data) => {
    var _a, _b, _c, _d;
    var _e;
    const user = (_a = data.getUser) === null || _a === void 0 ? void 0 : _a.call(data);
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const sessionId = ((_b = data.cookies) === null || _b === void 0 ? void 0 : _b.sessionId) || ((_c = data.headers) === null || _c === void 0 ? void 0 : _c.sessionid);
    if (!sessionId) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found" });
    }
    const sessionData = await redis_1.RedisSingleton.getInstance().get(`sessionId:${sessionId}`);
    if (!sessionData) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found" });
    }
    const session = JSON.parse(sessionData);
    const sessionUserId = (_e = session.userId) !== null && _e !== void 0 ? _e : (_d = session.user) === null || _d === void 0 ? void 0 : _d.id;
    if (sessionUserId && String(sessionUserId) !== String(user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found" });
    }
    const csrfToken = session.csrfToken;
    if (!csrfToken) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Session not found" });
    }
    return {
        csrfToken,
        cookies: {
            csrfToken,
        },
    };
};
