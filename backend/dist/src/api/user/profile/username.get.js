"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const username_1 = require("@b/utils/username");
exports.metadata = {
    summary: "Checks whether a username is available",
    description: "Validates a candidate username against the platform's rules and reports whether it is free, with alternatives when it is not.",
    operationId: "checkUsernameAvailability",
    tags: ["Auth"],
    requiresAuth: true,
    logModule: "USER",
    logTitle: "Check username",
    parameters: [
        {
            name: "username",
            in: "query",
            description: "The candidate username.",
            required: true,
            schema: { type: "string", minLength: username_1.USERNAME_MIN, maxLength: username_1.USERNAME_MAX },
        },
    ],
    responses: {
        200: {
            description: "Availability verdict",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            username: { type: "string" },
                            available: { type: "boolean" },
                            reason: { type: "string", nullable: true },
                            message: { type: "string", nullable: true },
                            suggestions: { type: "array", items: { type: "string" } },
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
    var _a, _b, _c;
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Authentication required" });
    }
    const candidate = String((_a = query === null || query === void 0 ? void 0 : query.username) !== null && _a !== void 0 ? _a : "").trim();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking username availability");
    const verdict = await (0, username_1.checkUsername)(candidate, user.id);
    const suggestions = verdict.reason === "TAKEN" ? await (0, username_1.suggestUsernames)(candidate, 5, user.id) : [];
    ctx === null || ctx === void 0 ? void 0 : ctx.success(verdict.ok ? `"${candidate}" is available` : `"${candidate}" refused (${verdict.reason})`);
    return {
        username: candidate,
        available: verdict.ok,
        reason: (_b = verdict.reason) !== null && _b !== void 0 ? _b : null,
        message: (_c = verdict.message) !== null && _c !== void 0 ? _c : null,
        suggestions,
    };
};
