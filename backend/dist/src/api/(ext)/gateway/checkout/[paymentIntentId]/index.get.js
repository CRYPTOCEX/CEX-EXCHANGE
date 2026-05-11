"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = { summary: "Get checkout session",
    description: "Retrieves checkout session details for the customer to complete payment.",
    operationId: "getCheckoutSession",
    tags: ["Gateway", "Checkout"],
    parameters: [
        { name: "paymentIntentId",
            in: "path",
            required: true,
            description: "Payment intent ID",
            schema: { type: "string" },
        },
    ],
    responses: { 200: { description: "Checkout session details",
        },
        404: { description: "Payment not found or expired",
        },
    },
    requiresAuth: false,
    logModule: "GATEWAY",
    logTitle: "Get Checkout",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { params, ctx } = data;
    const { paymentIntentId } = params;
    const payment = await db_1.models.gatewayPayment.findOne({ where: { paymentIntentId,
        },
        include: [
            { model: db_1.models.gatewayMerchant,
                as: "merchant",
                attributes: ["id", "name", "logo", "website", "status"],
            },
        ],
    });
    if (!payment) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Payment not found",
        });
    }
    if (payment.status !== "PENDING" && payment.status !== "PROCESSING") {
        throw (0, error_1.createError)({ statusCode: 400,
            message: `Payment is ${payment.status.toLowerCase()}`,
        });
    }
    if (new Date(payment.expiresAt) < new Date()) {
        await payment.update({ status: "EXPIRED" });
        throw (0, error_1.createError)({ statusCode: 400,
            message: "Payment session has expired",
        });
    }
    if (((_a = payment.merchant) === null || _a === void 0 ? void 0 : _a.status) !== "ACTIVE") {
        throw (0, error_1.createError)({ statusCode: 400,
            message: "Merchant is not active",
        });
    }
    const lineItems = (_b = payment.lineItems) === null || _b === void 0 ? void 0 : _b.map((item) => ({ name: item.name,
        description: item.description,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        image: item.imageUrl || item.image,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return { id: payment.paymentIntentId,
        merchant: { name: (_c = payment.merchant) === null || _c === void 0 ? void 0 : _c.name,
            logo: (_d = payment.merchant) === null || _d === void 0 ? void 0 : _d.logo,
            website: (_e = payment.merchant) === null || _e === void 0 ? void 0 : _e.website,
        },
        amount: payment.amount,
        currency: payment.currency,
        walletType: payment.walletType,
        description: payment.description,
        lineItems,
        expiresAt: payment.expiresAt,
        status: payment.status,
        testMode: payment.testMode,
        cancelUrl: payment.cancelUrl,
        returnUrl: payment.returnUrl, };
};
