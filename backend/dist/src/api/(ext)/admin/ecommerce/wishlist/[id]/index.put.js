"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const query_1 = require("@b/utils/query");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Updates a specific ecommerce wishlist entry",
    operationId: "updateEcommerceWishlist",
    tags: ["Admin", "Ecommerce", "Wishlist"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "ID of the wishlist entry to update",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "New data for the wishlist entry",
        content: {
            "application/json": {
                schema: utils_1.wishlistUpdateSchema,
            },
        },
    },
    responses: (0, query_1.updateRecordResponses)("Ecommerce Wishlist"),
    requiresAuth: true,
    permission: "edit.ecommerce.wishlist",
    logModule: "ADMIN_ECOM",
    logTitle: "Update E-commerce Wishlist Entry",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { id } = params;
    const { userId, productId } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating E-commerce wishlist entry");
    const result = await (0, query_1.updateRecord)("ecommerceWishlist", id, {
        userId,
        productId,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Successfully updated E-commerce wishlist entry");
    return result;
};
