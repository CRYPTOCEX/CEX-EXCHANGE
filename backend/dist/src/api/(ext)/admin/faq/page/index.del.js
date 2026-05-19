"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete FAQs by Page Path",
    description: "Deletes all FAQ entries associated with a specific page path. This operation removes all FAQs belonging to the specified page.",
    operationId: "deleteFaqsByPage",
    tags: ["Admin", "FAQ", "Pages"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        pagePath: {
                            type: "string",
                            description: "Page path to delete FAQs from",
                        },
                    },
                    required: ["pagePath"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("FAQs deleted successfully for the page"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Delete FAQs by page",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { pagePath } = body;
    if (!pagePath) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("pagePath is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "pagePath is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting FAQs by page");
    await db_1.models.faq.destroy({ where: { pagePath } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQs deleted successfully for the page");
    return { message: "FAQs deleted successfully for the page" };
};
