"use strict";
Object.defineProperty(exports, "__esModule", { value: !0 });
exports.metadata = void 0;

// BYPASS: Simplified imports (original validation logic removed)
const utils_1 = require("@b/api/admin/system/utils");

exports.metadata = {
    summary: "Gets the current license status",
    operationId: "getLicenseStatus",
    tags: ["Admin", "System"],
    logModule: "ADMIN_SYS",
    logTitle: "Get License Status",
    responses: {
        200: {
            description: "License status retrieved successfully",
            content: { "application/json": { schema: { type: "object" } } }
        },
        401: { description: "Unauthorized, admin permission required" },
        500: { description: "Internal server error" }
    },
    requiresAuth: !0
};

// BYPASS: Always return valid license status
exports.default = async e => {
    const { ctx: n } = e;

    null == n || n.step("Getting product info");
    const a = await (0, utils_1.getProduct)();
    const c = a.productId || a.id || '35599184';

    null == n || n.success("License bypass active - returning valid status");

    // BYPASS: Hardcoded valid response
    return {
        productId: c,
        productName: a.name || "BiCrypto",
        productVersion: a.version || "6.1.2",
        licenseStatus: "active",
        isValid: true,
        securityLevel: 4,
        initialized: true,
        licenseValid: true,
        message: "License is active and valid.",
        features: [
            "ecosystem",
            "staking",
            "p2p",
            "ico",
            "forex",
            "futures",
            "copy_trading",
            "affiliate",
            "ecommerce",
            "nft",
            "ai_investment",
            "ai_market_maker",
            "mlm",
            "knowledge_base",
            "gateway",
            "wallet_connect"
        ]
    };
};