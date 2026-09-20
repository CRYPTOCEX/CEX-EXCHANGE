"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = { summary: "List API keys",
    description: "Lists all API keys for the current merchant.",
    operationId: "listApiKeys",
    tags: ["Gateway", "Merchant", "API Keys"],
    parameters: [
        { name: "mode",
            in: "query",
            description: "Filter by mode (LIVE or TEST)",
            schema: { type: "string",
                enum: ["LIVE", "TEST"],
            },
        },
    ],
    responses: { 200: { description: "List of API keys",
        },
        404: { description: "Merchant not found",
        },
    },
    requiresAuth: true,
    logModule: "GATEWAY",
    logTitle: "Get API Keys",
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const merchant = await db_1.models.gatewayMerchant.findOne({ where: { userId: user.id },
    });
    if (!merchant) {
        throw (0, error_1.createError)({ statusCode: 404,
            message: "Merchant account not found",
        });
    }
    const where = { merchantId: merchant.id };
    const mode = query === null || query === void 0 ? void 0 : query.mode;
    if (mode) {
        where.mode = mode;
    }
    const apiKeys = await db_1.models.gatewayApiKey.findAll({ where,
        order: [
            ["mode", "ASC"],
            ["type", "ASC"],
            ["createdAt", "DESC"],
        ],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return apiKeys.map((key) => ({ id: key.id,
        name: key.name,
        keyPreview: `${key.keyPrefix}...${key.lastFourChars}`,
        type: key.type,
        mode: key.mode,
        permissions: key.permissions,
        allowedWalletTypes: key.allowedWalletTypes,
        ipWhitelist: key.ipWhitelist,
        successUrl: key.successUrl,
        cancelUrl: key.cancelUrl,
        webhookUrl: key.webhookUrl,
        status: key.status,
        lastUsedAt: key.lastUsedAt,
        lastUsedIp: key.lastUsedIp,
        expiresAt: key.expiresAt,
        createdAt: key.createdAt,
    }));
};
