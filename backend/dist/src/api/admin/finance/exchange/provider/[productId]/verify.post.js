"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Verify Exchange Credentials",
    operationId: "verifyExchangeCredentials",
    tags: ["Admin", "Exchange", "Credentials"],
    description: "Verifies the API credentials for the exchange provider.",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            in: "path",
            name: "productId",
            description: "Product ID of the exchange to verify credentials for",
            required: true,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Credentials verification result",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            status: {
                                type: "boolean",
                                description: "Whether the credentials are valid",
                            },
                            message: {
                                type: "string",
                                description: "Verification result message",
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Exchange"),
        500: query_1.serverErrorResponse,
    },
    permission: "edit.exchange",
    logModule: "ADMIN_FIN",
    logTitle: "Verify Exchange Provider",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const { productId } = params;
    if (!productId) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Product ID is required for credentials verification." });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding exchange");
    const exchange = await db_1.models.exchange.findOne({
        where: { productId },
    });
    if (!exchange) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Exchange not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Testing exchange credentials");
    const result = await exchange_1.default.testExchangeCredentials(exchange.name, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return result;
};
