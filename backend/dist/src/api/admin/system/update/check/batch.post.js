"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/system/utils");
exports.metadata = {
    summary: "Batch check for updates for all products",
    operationId: "batchCheckProductUpdates",
    tags: ["Admin", "System"],
    permission: "create.license",
    responses: {
        200: {
            description: "Batch update check completed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Indicates if the batch check was successful",
                            },
                            message: {
                                type: "string",
                                description: "Status message",
                            },
                            products: {
                                type: "array",
                                description: "Array of products with their update status",
                                items: {
                                    type: "object",
                                    properties: {
                                        productId: { type: "string" },
                                        currentVersion: { type: "string" },
                                        latestVersion: { type: "string" },
                                        updateAvailable: { type: "boolean" },
                                        updateId: { type: "string" },
                                        changelog: { type: "string" },
                                    },
                                },
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
    logTitle: "Batch check product updates",
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking updates for all products");
    const result = await (0, utils_1.fetchAllProductsUpdates)();
    if (result.products && result.products.length > 0) {
        const updatesAvailable = result.products.filter((p) => p.updateAvailable).length;
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Found ${updatesAvailable} updates available out of ${result.products.length} products`);
    }
    else {
        ctx === null || ctx === void 0 ? void 0 : ctx.success("All products are up to date");
    }
    return result;
};
