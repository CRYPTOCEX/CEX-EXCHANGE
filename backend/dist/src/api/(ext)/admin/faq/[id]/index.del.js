"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Delete Single FAQ",
    description: "Deletes a specific FAQ entry by ID. This is a soft delete operation that marks the FAQ as deleted.",
    operationId: "deleteFaq",
    tags: ["Admin", "FAQ", "Delete"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "FAQ ID to delete",
        },
    ],
    responses: {
        200: (0, errors_1.successMessageResponse)("FAQ deleted successfully"),
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("FAQ"),
        500: errors_1.serverErrorResponse,
    },
    permission: "delete.faq",
    logModule: "ADMIN_FAQ",
    logTitle: "Delete FAQ entry",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching FAQ");
    const faq = await db_1.models.faq.findByPk(params.id);
    if (!faq) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("FAQ not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "FAQ not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting FAQ");
    await faq.destroy();
    ctx === null || ctx === void 0 ? void 0 : ctx.success("FAQ deleted successfully");
    return { message: "FAQ deleted successfully" };
};
