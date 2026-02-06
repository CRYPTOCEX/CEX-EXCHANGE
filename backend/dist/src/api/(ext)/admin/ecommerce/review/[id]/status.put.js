"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Updates the status of an E-commerce Review",
    operationId: "updateEcommerceReviewStatus",
    tags: ["Admin", "Ecommerce Reviews"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "ID of the E-commerce review to update",
            schema: { type: "string" },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        status: {
                            type: "boolean",
                            description: "New status to apply to the E-commerce review (true for active, false for inactive)",
                        },
                    },
                    required: ["status"],
                },
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("E-commerce Review"),
    requiresAuth: true,
    permission: "edit.ecommerce.review",
    logModule: "ADMIN_ECOM",
    logTitle: "Update E-commerce Review Status",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce review status");
    const result = await (0, query_1.updateStatus)("ecommerceReview", id, status);
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce review status");
    return result;
};
