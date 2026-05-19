"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Get Trading admin settings",
    operationId: "getTradingAdminSettings",
    tags: ["Admin", "Trading"],
    responses: {
        200: {
            description: "Trading settings",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        500: query_1.serverErrorResponse,
    },
    requiresAuth: true,
    permission: "access.trading.settings",
};
const DEFAULT_SETTINGS = {
    chartProvider: "tradingview",
    defaultLayout: "pro",
    features: {
        analytics: true,
        hotkeys: true,
        advancedOrders: true,
        oneClickTrading: false,
        depthChart: true,
        recentTrades: true,
        positionsPanel: true,
        ordersPanel: true,
        marketsPanel: true,
    },
    layouts: {
        allowCustomLayouts: true,
        maxSavedLayouts: 5,
        defaultPanels: ["chart", "orderbook", "trades", "form"],
    },
    hotkeys: {
        enabled: true,
        allowCustomization: true,
        defaults: {
            buy: "B",
            sell: "S",
            cancel: "Escape",
            focusPrice: "P",
            focusAmount: "A",
        },
    },
    analytics: {
        enabled: true,
        retentionDays: 90,
        showPnLChart: true,
        showWinRate: true,
        showTradeDistribution: true,
        showPerformanceMetrics: true,
    },
    trading: {
        confirmOrders: true,
        showEstimatedFees: true,
        showOrderPreview: true,
        defaultOrderType: "limit",
        quickAmountPercentages: [25, 50, 75, 100],
    },
    mobile: {
        enabled: true,
        showQuickTradeFab: true,
        enableSwipeGestures: true,
        hapticFeedback: true,
    },
    display: {
        compactMode: false,
        showSpread: true,
        showVolume: true,
        priceDecimals: 2,
        amountDecimals: 6,
        theme: "system",
    },
};
function deepMerge(target, source) {
    const result = { ...target };
    for (const key of Object.keys(source)) {
        if (source[key] && typeof source[key] === "object" && !Array.isArray(source[key])) {
            result[key] = deepMerge(target[key] || {}, source[key]);
        }
        else {
            result[key] = source[key];
        }
    }
    return result;
}
exports.default = async (data) => {
    const settings = await db_1.models.settings.findOne({
        where: { key: "trading_pro" },
    });
    if (!(settings === null || settings === void 0 ? void 0 : settings.value)) {
        return DEFAULT_SETTINGS;
    }
    try {
        const stored = JSON.parse(settings.value);
        return deepMerge(DEFAULT_SETTINGS, stored);
    }
    catch (_a) {
        return DEFAULT_SETTINGS;
    }
};
