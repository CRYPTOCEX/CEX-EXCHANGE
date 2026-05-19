"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Update FAQ Status by Page",
    description: "Enables or disables all FAQs associated with a specific page path. Updates the status field for all FAQs on the specified page.",
    operationId: "updateFaqStatusByPage",
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
                            description: "Page path to update FAQs for",
                        },
                        status: {
                            type: "boolean",
                            description: "New status for all FAQs (true=active, false=inactive)",
                        },
                    },
                    required: ["pagePath", "status"],
                },
            },
        },
    },
    responses: {
        200: (0, errors_1.successMessageResponse)("FAQs status updated successfully"),
        400: errors_1.badRequestResponse,
        401: errors_1.unauthorizedResponse,
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Update FAQ status by page",
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { pagePath, status } = body;
    if (typeof pagePath !== "string" || typeof status !== "boolean") {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("pagePath (string) and status (boolean) are required");
        throw (0, error_1.createError)({ statusCode: 400, message: "pagePath (string) and status (boolean) are required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating FAQ status by page");
    await db_1.models.faq.update({ status }, { where: { pagePath } });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQs status updated successfully");
    return { message: "FAQs status updated successfully" };
};
