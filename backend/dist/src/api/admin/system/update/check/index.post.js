"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/system/utils");
exports.metadata = {
    summary: "Checks for updates for a product",
    operationId: "checkProductUpdate",
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
                            description: "Product ID to check for updates",
                        },
                        currentVersion: {
                            type: "string",
                            description: "Current version of the product",
                        },
                    },
                    required: ["productId", "currentVersion"],
                },
            },
        },
    },
    permission: "create.license",
    responses: {
        200: {
            description: "Update check completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            updateAvailable: {
                                type: "boolean",
                                description: "Indicates if an update is available",
                            },
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
    logModule: "ADMIN_SYS",
    logTitle: "Check product update",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Checking updates for product ${data.body.productId}`);
    const result = await (0, utils_1.checkUpdate)(data.body.productId, data.body.currentVersion);
    if (result.updateAvailable) {
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Update available: ${result.version}`);
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Product is up to date");
    }
    return result;
};
