"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/system/utils");
exports.metadata = {
    summary: "Downloads an update for a product",
    operationId: "downloadProductUpdate",
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
                            description: "Product ID to download update for",
                        },
                        updateId: {
                            type: "string",
                            description: "Update ID to download",
                        },
                        version: {
                            type: "string",
                            description: "Version of the update",
                        },
                        product: {
                            type: "string",
                            description: "Name of the product",
                        },
                        type: {
                            type: "string",
                            description: "Type of the update",
                        },
                    },
                    required: ["productId", "updateId", "version", "product"],
                },
            },
        },
    },
    permission: "create.license",
    responses: {
        200: {
            description: "Update downloaded successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Confirmation message indicating successful download",
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
            description: "Internal server error or update download failed",
        },
    },
    requiresAuth: true,
    logModule: "ADMIN_SYS",
    logTitle: "Download product update",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { productId, updateId, version, product, type } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Downloading update ${version} for ${product}`);
    const result = await (0, utils_1.downloadUpdate)(productId, updateId, version, product, type);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Update ${version} downloaded successfully`);
    return result;
};
