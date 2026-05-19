"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const token_1 = require("@b/utils/token");
const error_1 = require("@b/utils/error");
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
    const { ctx } = data;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating session");
        if (!data.cookies.sessionId) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("No active session found");
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "No active session found",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting session");
        await (0, token_1.deleteSession)(data.cookies.sessionId);
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
