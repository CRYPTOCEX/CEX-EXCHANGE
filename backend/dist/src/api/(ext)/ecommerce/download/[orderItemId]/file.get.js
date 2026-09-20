"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const promises_1 = require("stream/promises");
const Middleware_1 = require("@b/handler/Middleware");
exports.metadata = {
    summary: "Stream digital product file",
    description: "Streams the actual file content for purchased digital products",
    operationId: "streamDigitalProductFile",
    tags: ["Ecommerce", "Downloads"],
    logModule: "ECOM",
    logTitle: "Download File",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "orderItemId",
            in: "path",
            required: true,
            schema: { type: "string" },
            description: "Order item ID for the digital product to download",
        },
    ],
    responses: {
        200: {
            description: "File streamed successfully",
            content: {
                "application/octet-stream": {
                    schema: {
                        type: "string",
                        format: "binary",
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Digital Product File"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { ctx } = data;
    await Middleware_1.rateLimiters.download(data);
    const { user, params } = data;
    const { res } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Download File");
    const { orderItemId } = params;
    const orderItem = await db_1.models.ecommerceOrderItem.findOne({
        where: { id: orderItemId },
        include: [
            {
                model: db_1.models.ecommerceOrder,
                as: "order",
                where: { userId: user.id },
                attributes: ["id", "status", "userId"],
            },
            {
                model: db_1.models.ecommerceProduct,
                as: "product",
                attributes: ["id", "name", "type"],
            },
        ],
    });
    if (!orderItem) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Order item not found or access denied"
        });
    }
    const orderItemData = orderItem.get({ plain: true });
    if (orderItemData.order.status !== "COMPLETED") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Order must be completed before downloading"
        });
    }
    if (orderItemData.product.type !== "DOWNLOADABLE") {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "This product is not downloadable"
        });
    }
    if (!orderItemData.filePath) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Download file not found"
        });
    }
    try {
        const { handle, stats, fileName } = await require("../file-access").openDownloadFile(orderItemData.filePath);
        try {
            res.setHeader('Content-Type', 'application/octet-stream');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}"; filename*=UTF-8''${encodeURIComponent(fileName).replace(/['()*]/g, c => '%' + c.charCodeAt(0).toString(16))}`);
            res.setHeader('Content-Length', stats.size.toString());
            await (0, promises_1.pipeline)(handle.createReadStream({ autoClose: false }), res);
        } finally { await handle.close(); }
    }
    catch (error) {
        console.error("File streaming error:", error);
        if (!res.headersSent) {
            throw (0, error_1.createError)({
                statusCode: error.statusCode || 500,
                message: "Error streaming file"
            });
        }
    }
};
