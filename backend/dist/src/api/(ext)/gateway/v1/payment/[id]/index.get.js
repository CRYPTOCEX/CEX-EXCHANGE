"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const utils_1 = require("../../utils");
exports.metadata = { summary: "Get payment details",
    description: "Retrieves the details of an existing payment by its ID.",
    operationId: "getPayment",
    tags: ["Gateway", "Payment"],
    parameters: [
        { name: "id",
            in: "path",
            required: true,
            description: "Payment intent ID (e.g., pi_xxx)",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Payment details",
            content: { "application/json": { schema: utils_1.paymentResponseSchema,
                },
            },
        },
        401: { description: "Invalid or missing API key",
        },
        404: { description: "Payment not found",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Get Payment V1",
};
exports.default = async (data) => {
    var _a, _b;
    const { params, headers, ctx } = data;
    const { id } = params;
    const apiKeyHeader = (headers === null || headers === void 0 ? void 0 : headers["x-api-key"]) || (headers === null || headers === void 0 ? void 0 : headers["X-API-Key"]);
    const clientIp = ((_b = (_a = headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        (headers === null || headers === void 0 ? void 0 : headers["x-real-ip"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["cf-connecting-ip"]) ||
        null;
    const { merchant, apiKey, isTestMode } = await (0, gateway_1.authenticateGatewayApi)(apiKeyHeader, clientIp);
    (0, gateway_1.checkApiPermission)(apiKey, "payment.read");
    const payment = await db_1.models.gatewayPayment.findOne({ where: { paymentIntentId: id,
            merchantId: merchant.id,
        },
    });
    if (!payment) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payment not found",
        });
    }
    if (payment.testMode !== isTestMode) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payment not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { id: payment.paymentIntentId,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        walletType: payment.walletType,
        merchantOrderId: payment.merchantOrderId,
        description: payment.description,
        feeAmount: payment.feeAmount,
        netAmount: payment.netAmount,
        checkoutUrl: payment.checkoutUrl,
        customerEmail: payment.customerEmail,
        customerName: payment.customerName,
        metadata: payment.metadata,
        expiresAt: payment.expiresAt,
        completedAt: payment.completedAt,
        createdAt: payment.createdAt,
    };
};
