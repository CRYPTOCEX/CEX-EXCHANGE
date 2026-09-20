"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const token_1 = require("@b/utils/token");
exports.metadata = {
    summary: "List the current user's active login sessions",
    description: "Returns every active session for the authenticated user — device type, browser, OS, IP, approximate location, a device fingerprint, and created / last-active times — flagging the session making this request as the current one.",
    operationId: "listUserSessions",
    tags: ["User", "Session"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Active sessions",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            sessions: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        id: { type: "string" },
                                        current: { type: "boolean" },
                                        browser: { type: "string" },
                                        os: { type: "string" },
                                        device: {
                                            type: "string",
                                            enum: ["desktop", "mobile", "tablet"],
                                        },
                                        ip: { type: "string", nullable: true },
                                        location: { type: "string", nullable: true },
                                        fingerprint: { type: "string", nullable: true },
                                        createdAt: { type: "string", nullable: true },
                                        lastActive: { type: "string", nullable: true },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const cookies = data.cookies;
    const currentSessionId = (cookies && cookies.sessionId) ||
        (data.headers && data.headers.sessionid) ||
        null;
    const sessions = await (0, token_1.getUserSessions)(user.id);
    const mapped = sessions.map((s) => {
        const d = s.device;
        return {
            id: s.sessionId,
            current: !!currentSessionId && s.sessionId === currentSessionId,
            browser: (d === null || d === void 0 ? void 0 : d.browser) || "Unknown Browser",
            os: (d === null || d === void 0 ? void 0 : d.os) || "Unknown OS",
            device: (d === null || d === void 0 ? void 0 : d.deviceType) || "desktop",
            ip: (d === null || d === void 0 ? void 0 : d.ip) || null,
            location: (d === null || d === void 0 ? void 0 : d.location) || null,
            fingerprint: (d === null || d === void 0 ? void 0 : d.fingerprint) || null,
            createdAt: s.createdAt,
            lastActive: s.lastActive,
        };
    });
    mapped.sort((a, b) => {
        if (a.current !== b.current)
            return a.current ? -1 : 1;
        const ta = a.lastActive ? Date.parse(a.lastActive) : 0;
        const tb = b.lastActive ? Date.parse(b.lastActive) : 0;
        return tb - ta;
    });
    return { sessions: mapped };
};
