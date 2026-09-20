"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const token_1 = require("@b/utils/token");
const user_activity_1 = require("@b/utils/user-activity");
const mobileDevice_1 = require("@b/services/notification/utils/mobileDevice");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Sign out all other sessions",
    description: "Revokes every active session for the authenticated user except the one making this request, signing out all other devices.",
    operationId: "revokeOtherUserSessions",
    tags: ["User", "Session"],
    requiresAuth: true,
    responses: {
        200: {
            description: "Other sessions revoked",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            revoked: { type: "number" },
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
    var _a;
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const cookies = data.cookies;
    const currentSessionId = (cookies && cookies.sessionId) ||
        (data.headers && data.headers.sessionid) ||
        "";
    const revoked = await (0, token_1.revokeOtherUserSessions)(user.id, currentSessionId);
    const keepDeviceId = (_a = data.headers) === null || _a === void 0 ? void 0 : _a["client-device-id"];
    let devicesRevoked = 0;
    try {
        devicesRevoked = await (0, mobileDevice_1.revokeOtherMobileDevices)(user.id, keepDeviceId);
    }
    catch (error) {
        console_1.logger.error("SESSION", `Failed to revoke mobile devices for user ${user.id}: ${error === null || error === void 0 ? void 0 : error.message}`);
    }
    if (revoked > 0 || devicesRevoked > 0) {
        void (0, user_activity_1.recordUserActivity)({
            userId: user.id,
            type: "security.session_revoked",
            title: "Signed out other sessions",
            description: `${revoked} other session(s) signed out`,
            severity: "warning",
            req: data,
        });
    }
    return {
        message: revoked > 0
            ? `Signed out ${revoked} other session(s).`
            : "No other active sessions to sign out.",
        revoked,
    };
};
