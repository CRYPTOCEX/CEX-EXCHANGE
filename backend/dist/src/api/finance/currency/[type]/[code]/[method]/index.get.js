"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.handleNetworkMappingReverse = exports.handleNetworkMapping = exports.validateDepositAddressResponse = void 0;
const error_1 = require("@b/utils/error");
const exchange_1 = __importDefault(require("@b/utils/exchange"));
const query_1 = require("@b/utils/query");
const utils_1 = require("@b/api/exchange/utils");
const utils_2 = require("../../../utils");
const console_1 = require("@b/utils/console");
const deposit_address_1 = require("../../../deposit-address");
var deposit_address_2 = require("../../../deposit-address");
Object.defineProperty(exports, "validateDepositAddressResponse", { enumerable: true, get: function () { return deposit_address_2.validateDepositAddressResponse; } });
Object.defineProperty(exports, "handleNetworkMapping", { enumerable: true, get: function () { return deposit_address_2.handleNetworkMapping; } });
Object.defineProperty(exports, "handleNetworkMappingReverse", { enumerable: true, get: function () { return deposit_address_2.handleNetworkMappingReverse; } });
exports.metadata = {
    summary: "Retrieves a single currency by its ID",
    description: "This endpoint retrieves a single currency by its ID.",
    operationId: "getCurrencyById",
    tags: ["Finance", "Currency"],
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "type",
            in: "path",
            required: true,
            schema: {
                type: "string",
                enum: ["SPOT"],
            },
        },
        {
            index: 1,
            name: "code",
            in: "path",
            required: true,
            schema: {
                type: "string",
            },
        },
        {
            index: 2,
            name: "method",
            in: "path",
            required: false,
            schema: {
                type: "string",
            },
        },
    ],
    responses: {
        200: {
            description: "Currency retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            ...utils_2.baseResponseSchema,
                            data: {
                                type: "object",
                                properties: utils_2.baseCurrencySchema,
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Currency"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)(401, "Unauthorized");
    const { type, code, method } = params;
    if (!type || !code)
        throw (0, error_1.createError)(400, "Invalid type or code");
    const safeParamPattern = /^[a-zA-Z0-9._-]{1,20}$/;
    if (!safeParamPattern.test(code)) {
        throw (0, error_1.createError)(400, "Invalid currency code");
    }
    if (method && !/^[a-zA-Z0-9 ._()+:-]{1,100}$/.test(method)) {
        throw (0, error_1.createError)(400, "Invalid method");
    }
    if (type !== "SPOT")
        throw (0, error_1.createError)(400, "Invalid type");
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching deposit address for ${code}/${method}`);
    const exchange = await exchange_1.default.startExchange(ctx);
    const provider = await exchange_1.default.getProvider();
    if (!exchange)
        throw (0, error_1.createError)(500, "Exchange not found");
    if (!provider)
        throw (0, error_1.createError)(500, "Exchange provider not found");
    try {
        const networkToUse = method;
        const depositAddress = await (0, deposit_address_1.resolveExchangeDepositAddress)(exchange, provider, code, networkToUse, ctx);
        if (!(0, deposit_address_1.validateDepositAddressResponse)(depositAddress, networkToUse)) {
            throw (0, error_1.createError)(500, (0, utils_1.sanitizeErrorMessage)("Deposit address generation failed. The exchange returned invalid or empty address data. Please try again later or contact support."));
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Deposit address retrieved for ${code}/${method}`);
        return { ...depositAddress, trx: true };
    }
    catch (error) {
        if (error.statusCode) {
            throw error;
        }
        console_1.logger.error("EXCHANGE", `[${provider}] Error for ${code}/${method}`, error);
        const message = (0, utils_1.sanitizeErrorMessage)(error.message);
        throw (0, error_1.createError)(404, message);
    }
};
