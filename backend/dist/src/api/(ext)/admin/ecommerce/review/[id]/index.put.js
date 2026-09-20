"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific ecommerce review",
    operationId: "updateEcommerceReview",
    tags: ["Admin", "Ecommerce", "Reviews"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the ecommerce review to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the ecommerce review",
        content: {
            "application/json": {
                schema: utils_1.reviewUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Review"),
    requiresAuth: true,
    permission: "edit.ecommerce.review",
    logModule: "ADMIN_ECOM",
    logTitle: "Update E-commerce Review",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { rating, comment, status } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce review");
    const result = await (0, query_1.updateRecord)("ecommerceReview", id, {
        rating,
        comment,
        status,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce review");
    return result;
};
