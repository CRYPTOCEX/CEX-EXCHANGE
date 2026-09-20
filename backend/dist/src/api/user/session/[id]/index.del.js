"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const token_1 = require("@b/utils/token");
const user_activity_1 = require("@b/utils/user-activity");
exports.metadata = {
    summary: "Revoke a specific session",
    description: "Signs out a single device by revoking the session with the given id. The session must belong to the authenticated user.",
    operationId: "revokeUserSession",
    tags: ["User", "Session"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The session id to revoke",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Session revoked",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: { message: { type: "string" } },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Session"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { id } = params;
    if (!id) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Missing session id" });
    }
    const revoked = await (0, token_1.revokeUserSession)(user.id, id);
    if (!revoked) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Session not found" });
    }
    const cookies = data.cookies;
    const currentSessionId = (cookies && cookies.sessionId) ||
        (data.headers && data.headers.sessionid) ||
        "";
    void (0, user_activity_1.recordUserActivity)({
        userId: user.id,
        type: "security.session_revoked",
        title: "Revoked a session",
        description: id === currentSessionId ? "Signed out current device" : "Signed out a device",
        severity: "warning",
        req: data,
        metadata: { sessionId: id },
    });
    return { message: "Session revoked successfully." };
};
