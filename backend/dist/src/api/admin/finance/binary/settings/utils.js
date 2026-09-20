"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BINARY_PRESETS = exports.AGGRESSIVE_PRESET = exports.CONSERVATIVE_PRESET = exports.DEFAULT_BINARY_SETTINGS = void 0;
exports.validateBinarySettings = validateBinarySettings;
exports.generateWarnings = generateWarnings;
exports.findBarrierLevel = findBarrierLevel;
exports.findStrikeLevel = findStrikeLevel;
exports.calculateBarrierPrice = calculateBarrierPrice;
exports.calculateStrikePrice = calculateStrikePrice;
exports.getProfitForLevel = getProfitForLevel;
exports.isOrderTypeEnabled = isOrderTypeEnabled;
exports.getEnabledBarrierLevels = getEnabledBarrierLevels;
exports.getEnabledStrikeLevels = getEnabledStrikeLevels;
exports.getEnabledDurations = getEnabledDurations;
exports.isDurationEnabledForType = isDurationEnabledForType;
exports.mergeWithDefaults = mergeWithDefaults;
const DEFAULT_HIGHER_LOWER_BARRIERS = [
    {
        id: "hl_close",
        label: "Close (0.1%)",
        distancePercent: 0.1,
        profitPercent: 68,
        enabled: true,
    },
    {
        id: "hl_near",
        label: "Near (0.2%)",
        distancePercent: 0.2,
        profitPercent: 54,
        enabled: true,
    },
    {
        id: "hl_medium",
        label: "Medium (0.3%)",
        distancePercent: 0.3,
        profitPercent: 45,
        enabled: true,
    },
    {
        id: "hl_far",
        label: "Far (0.5%)",
        distancePercent: 0.5,
        profitPercent: 35,
        enabled: false,
    },
];
const DEFAULT_TOUCH_BARRIERS = [
    {
        id: "tn_close",
        label: "Close (0.1%)",
        distancePercent: 0.1,
        profitPercent: 95,
        enabled: true,
    },
    {
        id: "tn_near",
        label: "Near (0.2%)",
        distancePercent: 0.2,
        profitPercent: 120,
        enabled: true,
    },
    {
        id: "tn_medium",
        label: "Medium (0.3%)",
        distancePercent: 0.3,
        profitPercent: 150,
        enabled: true,
    },
];
const DEFAULT_CALL_PUT_STRIKES = [
    {
        id: "cp_atm",
        label: "At The Money (0.1%)",
        distancePercent: 0.1,
        profitPercent: 72,
        enabled: true,
    },
    {
        id: "cp_near",
        label: "Near (0.2%)",
        distancePercent: 0.2,
        profitPercent: 62,
        enabled: true,
    },
    {
        id: "cp_otm",
        label: "Out of Money (0.5%)",
        distancePercent: 0.5,
        profitPercent: 48,
        enabled: true,
    },
];
const DEFAULT_TURBO_BARRIERS = [
    {
        id: "turbo_tight",
        label: "Tight (0.03%)",
        distancePercent: 0.03,
        profitPercent: 75,
        enabled: true,
    },
    {
        id: "turbo_normal",
        label: "Normal (0.05%)",
        distancePercent: 0.05,
        profitPercent: 65,
        enabled: true,
    },
    {
        id: "turbo_wide",
        label: "Wide (0.1%)",
        distancePercent: 0.1,
        profitPercent: 52,
        enabled: true,
    },
];
const DEFAULT_DURATIONS = [
    {
        id: "d_1m",
        minutes: 1,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: 5 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: 3 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 5 },
            CALL_PUT: { enabled: true, profitAdjustment: 3 },
            TURBO: { enabled: true, profitAdjustment: 0 },
        },
    },
    {
        id: "d_2m",
        minutes: 2,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: 3 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: 2 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 3 },
            CALL_PUT: { enabled: true, profitAdjustment: 2 },
            TURBO: { enabled: true, profitAdjustment: -2 },
        },
    },
    {
        id: "d_3m",
        minutes: 3,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: 0 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: 0 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 0 },
            CALL_PUT: { enabled: true, profitAdjustment: 0 },
            TURBO: { enabled: true, profitAdjustment: -5 },
        },
    },
    {
        id: "d_5m",
        minutes: 5,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: 0 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: -2 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 0 },
            CALL_PUT: { enabled: true, profitAdjustment: -2 },
            TURBO: { enabled: true, profitAdjustment: -8 },
        },
    },
    {
        id: "d_10m",
        minutes: 10,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: -3 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: -5 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -3 },
            CALL_PUT: { enabled: true, profitAdjustment: -5 },
            TURBO: { enabled: false, profitAdjustment: 0 },
        },
    },
    {
        id: "d_15m",
        minutes: 15,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: -5 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: -7 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -5 },
            CALL_PUT: { enabled: true, profitAdjustment: -7 },
            TURBO: { enabled: false, profitAdjustment: 0 },
        },
    },
    {
        id: "d_30m",
        minutes: 30,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: -8 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: -10 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -8 },
            CALL_PUT: { enabled: true, profitAdjustment: -10 },
            TURBO: { enabled: false, profitAdjustment: 0 },
        },
    },
    {
        id: "d_1h",
        minutes: 60,
        enabled: true,
        orderTypeOverrides: {
            RISE_FALL: { enabled: true, profitAdjustment: -12 },
            HIGHER_LOWER: { enabled: true, profitAdjustment: -15 },
            TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -12 },
            CALL_PUT: { enabled: true, profitAdjustment: -15 },
            TURBO: { enabled: false, profitAdjustment: 0 },
        },
    },
];
const DEFAULT_CANCELLATION_SETTINGS = {
    enabled: true,
    rules: {
        RISE_FALL: {
            enabled: true,
            minTimeBeforeExpirySeconds: 30,
            penaltyPercentage: 10,
            penaltyByTimeRemaining: {
                above60Seconds: 5,
                above30Seconds: 10,
                below30Seconds: 20,
            },
        },
        HIGHER_LOWER: {
            enabled: true,
            minTimeBeforeExpirySeconds: 30,
            penaltyPercentage: 15,
            penaltyByTimeRemaining: {
                above60Seconds: 10,
                above30Seconds: 15,
                below30Seconds: 25,
            },
        },
        TOUCH_NO_TOUCH: {
            enabled: false,
            minTimeBeforeExpirySeconds: 60,
            penaltyPercentage: 20,
        },
        CALL_PUT: {
            enabled: true,
            minTimeBeforeExpirySeconds: 60,
            penaltyPercentage: 15,
            penaltyByTimeRemaining: {
                above60Seconds: 10,
                above30Seconds: 15,
                below30Seconds: 25,
            },
        },
        TURBO: {
            enabled: false,
            minTimeBeforeExpirySeconds: 0,
            penaltyPercentage: 0,
        },
    },
};
exports.DEFAULT_BINARY_SETTINGS = {
    global: {
        enabled: true,
        practiceEnabled: true,
        maxConcurrentOrders: 10,
        maxDailyOrders: 100,
        cooldownSeconds: 3,
        orderExpirationBuffer: 30,
        cancelExpirationBuffer: 60,
    },
    display: {
        chartType: "CHART_ENGINE",
    },
    cancellation: DEFAULT_CANCELLATION_SETTINGS,
    orderTypes: {
        RISE_FALL: {
            enabled: true,
            profitPercentage: 72,
            tradingModes: { demo: true, live: true },
        },
        HIGHER_LOWER: {
            enabled: false,
            profitPercentage: 68,
            barrierLevels: DEFAULT_HIGHER_LOWER_BARRIERS,
            tradingModes: { demo: true, live: true },
        },
        TOUCH_NO_TOUCH: {
            enabled: false,
            profitPercentage: 95,
            barrierLevels: DEFAULT_TOUCH_BARRIERS,
            touchProfitMultiplier: 1.2,
            noTouchProfitMultiplier: 0.7,
            tradingModes: { demo: true, live: true },
        },
        CALL_PUT: {
            enabled: false,
            profitPercentage: 72,
            strikeLevels: DEFAULT_CALL_PUT_STRIKES,
            tradingModes: { demo: true, live: true },
        },
        TURBO: {
            enabled: false,
            profitPercentage: 65,
            barrierLevels: DEFAULT_TURBO_BARRIERS,
            payoutPerPointRange: { min: 0.1, max: 10 },
            maxDuration: 5,
            allowTicksBased: true,
            tradingModes: { demo: true, live: true },
        },
    },
    durations: DEFAULT_DURATIONS,
    riskManagement: {
        dailyLossLimit: 0,
        winRateAlert: 65,
    },
    _preset: "balanced",
    _lastModified: new Date().toISOString(),
};
exports.CONSERVATIVE_PRESET = {
    global: {
        enabled: true,
        practiceEnabled: true,
        maxConcurrentOrders: 5,
        maxDailyOrders: 50,
        cooldownSeconds: 5,
        orderExpirationBuffer: 45,
        cancelExpirationBuffer: 90,
    },
    display: {
        chartType: "CHART_ENGINE",
    },
    cancellation: {
        enabled: true,
        rules: {
            RISE_FALL: {
                enabled: true,
                minTimeBeforeExpirySeconds: 45,
                penaltyPercentage: 15,
            },
            HIGHER_LOWER: {
                enabled: true,
                minTimeBeforeExpirySeconds: 45,
                penaltyPercentage: 20,
            },
            TOUCH_NO_TOUCH: {
                enabled: false,
                minTimeBeforeExpirySeconds: 90,
                penaltyPercentage: 25,
            },
            CALL_PUT: {
                enabled: true,
                minTimeBeforeExpirySeconds: 90,
                penaltyPercentage: 20,
            },
            TURBO: {
                enabled: false,
                minTimeBeforeExpirySeconds: 0,
                penaltyPercentage: 0,
            },
        },
    },
    orderTypes: {
        RISE_FALL: {
            enabled: true,
            profitPercentage: 65,
            tradingModes: { demo: true, live: true },
        },
        HIGHER_LOWER: {
            enabled: false,
            profitPercentage: 60,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "hl_close",
                    label: "Close (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 62,
                    enabled: true,
                },
                {
                    id: "hl_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 48,
                    enabled: true,
                },
            ],
        },
        TOUCH_NO_TOUCH: {
            enabled: false,
            profitPercentage: 85,
            touchProfitMultiplier: 1.3,
            noTouchProfitMultiplier: 0.65,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "tn_close",
                    label: "Close (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 80,
                    enabled: true,
                },
                {
                    id: "tn_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 100,
                    enabled: true,
                },
            ],
        },
        CALL_PUT: {
            enabled: false,
            profitPercentage: 62,
            tradingModes: { demo: true, live: true },
            strikeLevels: [
                {
                    id: "cp_atm",
                    label: "At The Money (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 62,
                    enabled: true,
                },
                {
                    id: "cp_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 52,
                    enabled: true,
                },
            ],
        },
        TURBO: {
            enabled: false,
            profitPercentage: 58,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "turbo_tight",
                    label: "Tight (0.03%)",
                    distancePercent: 0.03,
                    profitPercent: 65,
                    enabled: true,
                },
                {
                    id: "turbo_normal",
                    label: "Normal (0.05%)",
                    distancePercent: 0.05,
                    profitPercent: 55,
                    enabled: true,
                },
            ],
            payoutPerPointRange: { min: 0.1, max: 5 },
            maxDuration: 3,
            allowTicksBased: false,
        },
    },
    durations: [
        {
            id: "d_1m",
            minutes: 1,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 3 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: 2 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 3 },
                CALL_PUT: { enabled: true, profitAdjustment: 2 },
                TURBO: { enabled: true, profitAdjustment: 0 },
            },
        },
        {
            id: "d_3m",
            minutes: 3,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 0 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: 0 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 0 },
                CALL_PUT: { enabled: true, profitAdjustment: 0 },
                TURBO: { enabled: true, profitAdjustment: -3 },
            },
        },
        {
            id: "d_5m",
            minutes: 5,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -3 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -4 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -3 },
                CALL_PUT: { enabled: true, profitAdjustment: -4 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
        {
            id: "d_15m",
            minutes: 15,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -8 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -10 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -8 },
                CALL_PUT: { enabled: true, profitAdjustment: -10 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
    ],
    riskManagement: {
        dailyLossLimit: 1000,
        winRateAlert: 60,
    },
    _preset: "conservative",
    _lastModified: new Date().toISOString(),
};
exports.AGGRESSIVE_PRESET = {
    global: {
        enabled: true,
        practiceEnabled: true,
        maxConcurrentOrders: 20,
        maxDailyOrders: 200,
        cooldownSeconds: 0,
        orderExpirationBuffer: 15,
        cancelExpirationBuffer: 30,
    },
    display: {
        chartType: "CHART_ENGINE",
    },
    cancellation: {
        enabled: true,
        rules: {
            RISE_FALL: {
                enabled: true,
                minTimeBeforeExpirySeconds: 15,
                penaltyPercentage: 5,
                penaltyByTimeRemaining: {
                    above60Seconds: 2,
                    above30Seconds: 5,
                    below30Seconds: 10,
                },
            },
            HIGHER_LOWER: {
                enabled: true,
                minTimeBeforeExpirySeconds: 15,
                penaltyPercentage: 8,
                penaltyByTimeRemaining: {
                    above60Seconds: 3,
                    above30Seconds: 8,
                    below30Seconds: 15,
                },
            },
            TOUCH_NO_TOUCH: {
                enabled: true,
                minTimeBeforeExpirySeconds: 30,
                penaltyPercentage: 10,
            },
            CALL_PUT: {
                enabled: true,
                minTimeBeforeExpirySeconds: 30,
                penaltyPercentage: 8,
                penaltyByTimeRemaining: {
                    above60Seconds: 3,
                    above30Seconds: 8,
                    below30Seconds: 15,
                },
            },
            TURBO: {
                enabled: true,
                minTimeBeforeExpirySeconds: 10,
                penaltyPercentage: 25,
            },
        },
    },
    orderTypes: {
        RISE_FALL: {
            enabled: true,
            profitPercentage: 82,
            tradingModes: { demo: true, live: true },
        },
        HIGHER_LOWER: {
            enabled: true,
            profitPercentage: 78,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "hl_close",
                    label: "Close (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 78,
                    enabled: true,
                },
                {
                    id: "hl_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 65,
                    enabled: true,
                },
                {
                    id: "hl_medium",
                    label: "Medium (0.3%)",
                    distancePercent: 0.3,
                    profitPercent: 55,
                    enabled: true,
                },
                {
                    id: "hl_far",
                    label: "Far (0.5%)",
                    distancePercent: 0.5,
                    profitPercent: 42,
                    enabled: true,
                },
            ],
        },
        TOUCH_NO_TOUCH: {
            enabled: false,
            profitPercentage: 110,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "tn_close",
                    label: "Close (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 110,
                    enabled: true,
                },
                {
                    id: "tn_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 140,
                    enabled: true,
                },
                {
                    id: "tn_medium",
                    label: "Medium (0.3%)",
                    distancePercent: 0.3,
                    profitPercent: 180,
                    enabled: true,
                },
                {
                    id: "tn_far",
                    label: "Far (0.5%)",
                    distancePercent: 0.5,
                    profitPercent: 230,
                    enabled: true,
                },
            ],
            touchProfitMultiplier: 1.15,
            noTouchProfitMultiplier: 0.75,
        },
        CALL_PUT: {
            enabled: false,
            profitPercentage: 80,
            tradingModes: { demo: true, live: true },
            strikeLevels: [
                {
                    id: "cp_atm",
                    label: "At The Money (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 80,
                    enabled: true,
                },
                {
                    id: "cp_near",
                    label: "Near (0.2%)",
                    distancePercent: 0.2,
                    profitPercent: 70,
                    enabled: true,
                },
                {
                    id: "cp_otm",
                    label: "Out of Money (0.5%)",
                    distancePercent: 0.5,
                    profitPercent: 55,
                    enabled: true,
                },
            ],
        },
        TURBO: {
            enabled: false,
            profitPercentage: 75,
            tradingModes: { demo: true, live: true },
            barrierLevels: [
                {
                    id: "turbo_tight",
                    label: "Tight (0.03%)",
                    distancePercent: 0.03,
                    profitPercent: 85,
                    enabled: true,
                },
                {
                    id: "turbo_normal",
                    label: "Normal (0.05%)",
                    distancePercent: 0.05,
                    profitPercent: 75,
                    enabled: true,
                },
                {
                    id: "turbo_wide",
                    label: "Wide (0.1%)",
                    distancePercent: 0.1,
                    profitPercent: 60,
                    enabled: true,
                },
            ],
            payoutPerPointRange: { min: 0.1, max: 20 },
            maxDuration: 5,
            allowTicksBased: true,
        },
    },
    durations: [
        {
            id: "d_1m",
            minutes: 1,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 5 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: 4 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 5 },
                CALL_PUT: { enabled: true, profitAdjustment: 4 },
                TURBO: { enabled: true, profitAdjustment: 2 },
            },
        },
        {
            id: "d_2m",
            minutes: 2,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 3 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: 2 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 3 },
                CALL_PUT: { enabled: true, profitAdjustment: 2 },
                TURBO: { enabled: true, profitAdjustment: 0 },
            },
        },
        {
            id: "d_3m",
            minutes: 3,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 0 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: 0 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 0 },
                CALL_PUT: { enabled: true, profitAdjustment: 0 },
                TURBO: { enabled: true, profitAdjustment: -3 },
            },
        },
        {
            id: "d_5m",
            minutes: 5,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: 0 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -2 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: 0 },
                CALL_PUT: { enabled: true, profitAdjustment: -2 },
                TURBO: { enabled: true, profitAdjustment: -5 },
            },
        },
        {
            id: "d_10m",
            minutes: 10,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -2 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -4 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -2 },
                CALL_PUT: { enabled: true, profitAdjustment: -4 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
        {
            id: "d_15m",
            minutes: 15,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -4 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -6 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -4 },
                CALL_PUT: { enabled: true, profitAdjustment: -6 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
        {
            id: "d_30m",
            minutes: 30,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -6 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -8 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -6 },
                CALL_PUT: { enabled: true, profitAdjustment: -8 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
        {
            id: "d_1h",
            minutes: 60,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -10 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -12 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -10 },
                CALL_PUT: { enabled: true, profitAdjustment: -12 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
        {
            id: "d_4h",
            minutes: 240,
            enabled: true,
            orderTypeOverrides: {
                RISE_FALL: { enabled: true, profitAdjustment: -15 },
                HIGHER_LOWER: { enabled: true, profitAdjustment: -18 },
                TOUCH_NO_TOUCH: { enabled: true, profitAdjustment: -15 },
                CALL_PUT: { enabled: true, profitAdjustment: -18 },
                TURBO: { enabled: false, profitAdjustment: 0 },
            },
        },
    ],
    riskManagement: {
        dailyLossLimit: 0,
        winRateAlert: 75,
    },
    _preset: "aggressive",
    _lastModified: new Date().toISOString(),
};
exports.BINARY_PRESETS = {
    conservative: exports.CONSERVATIVE_PRESET,
    balanced: exports.DEFAULT_BINARY_SETTINGS,
    aggressive: exports.AGGRESSIVE_PRESET,
};
function validateBinarySettings(settings) {
    const errors = [];
    const warnings = [];
    if (settings.global.maxConcurrentOrders < 1) {
        errors.push("Max concurrent orders must be at least 1");
    }
    for (const [typeName, config] of Object.entries(settings.orderTypes)) {
        if (config.profitPercentage < 0 || config.profitPercentage > 1000) {
            errors.push(`${typeName}: Profit percentage must be between 0 and 1000`);
        }
        if ("barrierLevels" in config) {
            const barrierConfig = config;
            if (!barrierConfig.barrierLevels || barrierConfig.barrierLevels.length === 0) {
                if (config.enabled) {
                    errors.push(`${typeName}: At least one barrier level is required when enabled`);
                }
            }
            else {
                for (const level of barrierConfig.barrierLevels) {
                    if (level.distancePercent <= 0) {
                        errors.push(`${typeName}: Barrier distance must be positive`);
                    }
                    if (level.profitPercent < 0 || level.profitPercent > 1000) {
                        errors.push(`${typeName}: Barrier profit must be between 0 and 1000`);
                    }
                }
            }
        }
        if ("strikeLevels" in config) {
            const strikeConfig = config;
            if (!strikeConfig.strikeLevels || strikeConfig.strikeLevels.length === 0) {
                if (config.enabled) {
                    errors.push(`${typeName}: At least one strike level is required when enabled`);
                }
            }
        }
    }
    if (!settings.durations || settings.durations.length === 0) {
        errors.push("At least one duration is required");
    }
    else {
        const enabledDurations = settings.durations.filter((d) => d.enabled);
        if (enabledDurations.length === 0) {
            errors.push("At least one duration must be enabled");
        }
        for (const duration of settings.durations) {
            if (duration.minutes < 1) {
                errors.push(`Duration must be at least 1 minute`);
            }
        }
    }
    return {
        valid: errors.length === 0,
        errors,
        warnings: generateWarnings(settings),
    };
}
function generateWarnings(settings) {
    const warnings = [];
    const higherLowerConfig = settings.orderTypes.HIGHER_LOWER;
    if (higherLowerConfig.enabled && higherLowerConfig.barrierLevels) {
        const maxDistance = Math.max(...higherLowerConfig.barrierLevels
            .filter((l) => l.enabled)
            .map((l) => l.distancePercent));
        if (maxDistance > 2) {
            warnings.push({
                level: "danger",
                category: "Barrier Risk",
                message: `HIGHER_LOWER max barrier distance (${maxDistance}%) allows nearly guaranteed wins`,
                suggestion: "Reduce max barrier distance to 1% or less, or reduce profit for far barriers",
                field: "orderTypes.HIGHER_LOWER.barrierLevels",
            });
        }
        else if (maxDistance > 1) {
            warnings.push({
                level: "warning",
                category: "Barrier Risk",
                message: `HIGHER_LOWER barrier distance (${maxDistance}%) may be too easy`,
                suggestion: "Consider reducing profit percentage for farther barriers",
                field: "orderTypes.HIGHER_LOWER.barrierLevels",
            });
        }
    }
    const avgProfit = calculateAverageProfit(settings);
    if (avgProfit > 90) {
        warnings.push({
            level: "warning",
            category: "Profitability",
            message: `Average profit (${avgProfit.toFixed(1)}%) may not be sustainable`,
            suggestion: "Consider reducing profit percentages or adding more barrier tiers",
        });
    }
    const enabledDurations = settings.durations.filter((d) => d.enabled);
    if (enabledDurations.length === 0) {
        warnings.push({
            level: "danger",
            category: "Configuration",
            message: "No durations are enabled - trading will not work",
            suggestion: "Enable at least one duration",
            field: "durations",
        });
    }
    if (settings.riskManagement.dailyLossLimit === 0) {
        warnings.push({
            level: "info",
            category: "Risk Management",
            message: "No daily loss limit is configured",
            suggestion: "Consider setting a daily loss limit to prevent large losses",
            field: "riskManagement",
        });
    }
    const touchConfig = settings.orderTypes.TOUCH_NO_TOUCH;
    if (touchConfig.enabled) {
        const minTouchProfit = Math.min(...touchConfig.barrierLevels.filter((l) => l.enabled).map((l) => l.profitPercent));
        if (minTouchProfit < 150) {
            warnings.push({
                level: "info",
                category: "Configuration",
                message: `TOUCH profit (${minTouchProfit}%) is low for a difficult trade type`,
                suggestion: "TOUCH trades are harder to win - consider higher profit percentage",
                field: "orderTypes.TOUCH_NO_TOUCH",
            });
        }
    }
    const turboConfig = settings.orderTypes.TURBO;
    if (turboConfig.enabled && turboConfig.maxDuration > 5) {
        warnings.push({
            level: "warning",
            category: "Configuration",
            message: `TURBO max duration (${turboConfig.maxDuration} min) is longer than typical`,
            suggestion: "Turbo trades are meant to be short (1-5 minutes)",
            field: "orderTypes.TURBO.maxDuration",
        });
    }
    const enabledTypes = Object.entries(settings.orderTypes)
        .filter(([_, config]) => config.enabled)
        .map(([_, config]) => config.profitPercentage);
    if (enabledTypes.length > 1 && new Set(enabledTypes).size === 1) {
        warnings.push({
            level: "info",
            category: "Configuration",
            message: "All enabled order types have the same profit percentage",
            suggestion: "Consider differentiating profits based on trade difficulty",
        });
    }
    return warnings;
}
function calculateAverageProfit(settings) {
    const enabledConfigs = Object.values(settings.orderTypes).filter((config) => config.enabled);
    if (enabledConfigs.length === 0)
        return 0;
    const sum = enabledConfigs.reduce((acc, config) => acc + config.profitPercentage, 0);
    return sum / enabledConfigs.length;
}
function findBarrierLevel(settings, orderType, levelId) {
    const config = settings.orderTypes[orderType];
    if ("barrierLevels" in config) {
        const barrierConfig = config;
        return barrierConfig.barrierLevels.find((l) => l.id === levelId) || null;
    }
    return null;
}
function findStrikeLevel(settings, levelId) {
    const config = settings.orderTypes.CALL_PUT;
    return config.strikeLevels.find((l) => l.id === levelId) || null;
}
function calculateBarrierPrice(currentPrice, level, isHigher) {
    const distance = currentPrice * (level.distancePercent / 100);
    return isHigher ? currentPrice + distance : currentPrice - distance;
}
function calculateStrikePrice(currentPrice, level, isCall) {
    const distance = currentPrice * (level.distancePercent / 100);
    return isCall ? currentPrice + distance : currentPrice - distance;
}
function getProfitForLevel(settings, orderType, levelId) {
    if (orderType === "CALL_PUT") {
        const level = findStrikeLevel(settings, levelId);
        return (level === null || level === void 0 ? void 0 : level.profitPercent) || settings.orderTypes.CALL_PUT.profitPercentage;
    }
    const level = findBarrierLevel(settings, orderType, levelId);
    return (level === null || level === void 0 ? void 0 : level.profitPercent) || settings.orderTypes[orderType].profitPercentage;
}
function isOrderTypeEnabled(settings, orderType) {
    return settings.global.enabled && settings.orderTypes[orderType].enabled;
}
function getEnabledBarrierLevels(settings, orderType) {
    const config = settings.orderTypes[orderType];
    if ("barrierLevels" in config) {
        const barrierConfig = config;
        return barrierConfig.barrierLevels.filter((l) => l.enabled);
    }
    return [];
}
function getEnabledStrikeLevels(settings) {
    return settings.orderTypes.CALL_PUT.strikeLevels.filter((l) => l.enabled);
}
function getEnabledDurations(settings) {
    return settings.durations.filter((d) => d.enabled);
}
function isDurationEnabledForType(settings, durationId, orderType) {
    var _a;
    const duration = settings.durations.find((d) => d.id === durationId);
    if (!duration || !duration.enabled)
        return false;
    const override = (_a = duration.orderTypeOverrides) === null || _a === void 0 ? void 0 : _a[orderType];
    if ((override === null || override === void 0 ? void 0 : override.enabled) === false)
        return false;
    return true;
}
function mergeWithDefaults(partial) {
    var _a, _b, _c, _d, _e;
    return {
        ...exports.DEFAULT_BINARY_SETTINGS,
        ...partial,
        global: {
            ...exports.DEFAULT_BINARY_SETTINGS.global,
            ...(partial.global || {}),
        },
        display: {
            ...exports.DEFAULT_BINARY_SETTINGS.display,
            ...(partial.display || {}),
        },
        orderTypes: {
            RISE_FALL: {
                ...exports.DEFAULT_BINARY_SETTINGS.orderTypes.RISE_FALL,
                ...(((_a = partial.orderTypes) === null || _a === void 0 ? void 0 : _a.RISE_FALL) || {}),
            },
            HIGHER_LOWER: {
                ...exports.DEFAULT_BINARY_SETTINGS.orderTypes.HIGHER_LOWER,
                ...(((_b = partial.orderTypes) === null || _b === void 0 ? void 0 : _b.HIGHER_LOWER) || {}),
            },
            TOUCH_NO_TOUCH: {
                ...exports.DEFAULT_BINARY_SETTINGS.orderTypes.TOUCH_NO_TOUCH,
                ...(((_c = partial.orderTypes) === null || _c === void 0 ? void 0 : _c.TOUCH_NO_TOUCH) || {}),
            },
            CALL_PUT: {
                ...exports.DEFAULT_BINARY_SETTINGS.orderTypes.CALL_PUT,
                ...(((_d = partial.orderTypes) === null || _d === void 0 ? void 0 : _d.CALL_PUT) || {}),
            },
            TURBO: {
                ...exports.DEFAULT_BINARY_SETTINGS.orderTypes.TURBO,
                ...(((_e = partial.orderTypes) === null || _e === void 0 ? void 0 : _e.TURBO) || {}),
            },
        },
        durations: partial.durations || exports.DEFAULT_BINARY_SETTINGS.durations,
        riskManagement: {
            ...exports.DEFAULT_BINARY_SETTINGS.riskManagement,
            ...(partial.riskManagement || {}),
        },
        _lastModified: new Date().toISOString(),
    };
}
