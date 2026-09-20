"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const utils_1 = require("@b/api/admin/system/utils");
const utils_2 = require("../../utils");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Activate Exchange License",
    operationId: "activateLicense",
    tags: ["Admin", "Settings", "Exchange"],
    description: "Activates the license for the exchange product.",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            in: "path",
            name: "productId",
            description: "Product ID whose license to activate",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    requestBody: {
        description: "Product ID, purchase code, and envato username for license activation.",
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        purchaseCode: {
                            type: "string",
                            description: "Purchase code for the license.",
                        },
                        envatoUsername: { type: "string", description: "Envato username." },
                    },
                    required: ["purchaseCode", "envatoUsername"],
                },
            },
        },
        required: true,
    },
    responses: {
        200: {
            description: "License activated successfully",
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("License"),
        500: query_1.serverErrorResponse,
    },
    permission: "edit.exchange",
    logModule: "ADMIN_FIN",
    logTitle: "Activate Exchange Provider",
};
exports.default = async (data) => {
    const { body, params, ctx } = data;
    const { purchaseCode, envatoUsername } = body;
    const { productId } = params;
    if (!productId || !purchaseCode || !envatoUsername) {
        throw (0, error_1.createError)({ statusCode: 400, message: "All fields are required for license activation." });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Activating license");
    const response = await (0, utils_1.activateLicense)(productId, purchaseCode, envatoUsername);
    if (response.status) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Saving license");
        await (0, utils_2.saveLicense)(productId, envatoUsername);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return response;
};
