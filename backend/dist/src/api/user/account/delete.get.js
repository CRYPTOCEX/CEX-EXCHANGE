"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const utils_1 = require("./utils");
exports.metadata = {
    summary: "Account deletion preconditions and disclosure",
    description: "Reports what stands between this account and deletion, and exactly what deletion removes and retains. Read this before offering the destructive action.",
    operationId: "getAccountDeletionPreconditions",
    tags: ["User", "Account"],
    logModule: "USER",
    logTitle: "Read account deletion preconditions",
    requiresAuth: true,
    responses: {
        200: {
            description: "Preconditions retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            blockers: {
                                type: "array",
                                description: "Must be empty before deletion is allowed. Each names an in-app route where the user resolves it.",
                                items: { type: "object" },
                            },
                            warnings: {
                                type: "array",
                                description: "Shown and acknowledged, never blocking. Amounts are DECIMAL strings.",
                                items: { type: "object" },
                            },
                            acknowledgementRequired: {
                                type: "boolean",
                                description: "True when the deletion request must carry acknowledgeBalance: true.",
                            },
                            disclosure: {
                                type: "object",
                                description: "What deletion removes and what it retains.",
                                properties: {
                                    removed: { type: "array", items: { type: "string" } },
                                    retained: { type: "array", items: { type: "string" } },
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("User not authenticated");
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Evaluating deletion preconditions");
    const preconditions = await (0, utils_1.getDeletionPreconditions)(user.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`${preconditions.blockers.length} blockers, ${preconditions.warnings.length} warnings`);
    return {
        ...preconditions,
        disclosure: utils_1.DELETION_DISCLOSURE,
    };
};
