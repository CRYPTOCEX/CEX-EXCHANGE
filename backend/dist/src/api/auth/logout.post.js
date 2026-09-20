"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const token_1 = require("@b/utils/token");
const error_1 = require("@b/utils/error");
const user_activity_1 = require("@b/utils/user-activity");
const mobileDevice_1 = require("@b/services/notification/utils/mobileDevice");
const console_1 = require("@b/utils/console");
exports.metadata = {
    summary: "Logs out the current user",
    operationId: "logoutUser",
    tags: ["Auth"],
    description: "Logs out the current user and clears all session tokens",
    requiresAuth: true,
    logModule: "LOGOUT",
    logTitle: "User logout",
    responses: {
        200: {
            description: "User logged out successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, no user to log out",
        },
    },
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating session");
        const sessionId = data.cookies.sessionId || ((_a = data.headers) === null || _a === void 0 ? void 0 : _a.sessionid);
        if (!sessionId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("No active session found");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "No active session found",
            });
        }
        const userBeforeClear = (_b = data.getUser) === null || _b === void 0 ? void 0 : _b.call(data);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting session");
        await (0, token_1.deleteSession)(sessionId);
        const deviceId = ((_c = data.headers) === null || _c === void 0 ? void 0 : _c["client-device-id"]) || null;
        if (deviceId && (userBeforeClear === null || userBeforeClear === void 0 ? void 0 : userBeforeClear.id)) {
            try {
                await (0, mobileDevice_1.revokeMobileDevice)(String(userBeforeClear.id), deviceId);
            }
            catch (error) {
                console_1.logger.error("LOGOUT", `Failed to revoke device ${deviceId}: ${error === null || error === void 0 ? void 0 : error.message}`);
            }
        }
        if (userBeforeClear === null || userBeforeClear === void 0 ? void 0 : userBeforeClear.id) {
            void (0, user_activity_1.recordUserActivity)({
                userId: String(userBeforeClear.id),
                type: "auth.logout",
                title: "Signed out",
                description: "Session ended",
                severity: "info",
                req: {
                    ip: data.remoteAddress,
                    headers: data.headers,
                },
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Clearing user data");
        data.setUser(null);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("User logged out successfully");
        return {
            message: "You have been logged out",
            cookies: {
                accessToken: "",
                refreshToken: "",
                sessionId: "",
                csrfToken: "",
            },
        };
    }
    catch (error) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(error.message || "Logout failed");
        throw error;
    }
};
