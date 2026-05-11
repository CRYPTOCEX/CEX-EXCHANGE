"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const gateway_1 = require("@b/utils/gateway");
const utils_1 = require("../../utils");
exports.metadata = { summary: "Get refund details",
    description: "Retrieves the details of an existing refund by its ID.",
    operationId: "getRefund",
    tags: ["Gateway", "Refund"],
    parameters: [
        { name: "id",
            in: "path",
            required: true,
            description: "Refund ID (e.g., re_xxx)",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Refund details",
            content: { "application/json": { schema: utils_1.refundResponseSchema,
                },
            },
        },
        401: { description: "Invalid or missing API key",
        },
        404: { description: "Refund not found",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Get Refund V1",
};
exports.default = async (data) => {
    var _a, _b, _c;
    const { params, headers, ctx } = data;
    const { id } = params;
    const apiKeyHeader = (headers === null || headers === void 0 ? void 0 : headers["x-api-key"]) || (headers === null || headers === void 0 ? void 0 : headers["X-API-Key"]);
    const clientIp = ((_b = (_a = headers === null || headers === void 0 ? void 0 : headers["x-forwarded-for"]) === null || _a === void 0 ? void 0 : _a.split(",")[0]) === null || _b === void 0 ? void 0 : _b.trim()) ||
        (headers === null || headers === void 0 ? void 0 : headers["x-real-ip"]) ||
        (headers === null || headers === void 0 ? void 0 : headers["cf-connecting-ip"]) ||
        null;
    const { merchant, apiKey } = await (0, gateway_1.authenticateGatewayApi)(apiKeyHeader, clientIp);
    (0, gateway_1.checkApiPermission)(apiKey, "refund.read");
    const refund = await db_1.models.gatewayRefund.findOne({ where: { refundId: id,
            merchantId: merchant.id,
        },
        include: [
            { model: db_1.models.gatewayPayment,
                as: "payment",
                attributes: ["paymentIntentId"],
            },
        ],
    });
    if (!refund) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Refund not found",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { id: refund.refundId,
        paymentId: (_c = refund.payment) === null || _c === void 0 ? void 0 : _c.paymentIntentId,
        amount: refund.amount,
        currency: refund.currency,
        status: refund.status,
        reason: refund.reason,
        description: refund.description,
        createdAt: refund.createdAt, };
};
