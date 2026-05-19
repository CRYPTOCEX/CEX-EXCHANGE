"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/system/utils");
exports.metadata = {
    summary: "Checks for the latest version of a product",
    operationId: "checkLatestProductVersion",
    tags: ["Admin", "System"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        productId: {
                            type: "string",
                            description: "Product ID to check",
                        },
                    },
                    required: ["productId"],
                },
            },
        },
    },
    permission: "create.license",
    responses: {
        200: {
            description: "Latest version fetched successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            latestVersion: {
                                type: "string",
                                description: "Latest version of the product",
                            },
                        },
                    },
                },
            },
        },
        401: {
            description: "Unauthorized, admin permission required",
        },
        500: {
            description: "Internal server error",
        },
    },
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Check latest product version",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking latest version for product ${data.body.productId}`);
    const result = await (0, utils_1.checkLatestVersion)(data.body.productId);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Latest version: ${result.latestVersion || "Unknown"}`);
    return result;
};
