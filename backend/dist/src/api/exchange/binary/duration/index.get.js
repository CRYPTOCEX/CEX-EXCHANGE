"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const binary_settings_cache_1 = require("@b/utils/binary-settings-cache");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "List Available Binary Durations",
    operationId: "listBinaryDurations",
    tags: ["Exchange", "Binary"],
    description: "Retrieves a list of available durations for binary options with calculated profit percentages.",
    logModule: "EXCHANGE",
    logTitle: "Get Binary Durations",
    responses: {
        200: {
            description: "A list of binary durations with calculated profit percentages",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string" },
                                duration: { type: "number" },
                                profitPercentageRiseFall: { type: "number" },
                                profitPercentageHigherLower: { type: "number" },
                                profitPercentageTouchNoTouch: { type: "number" },
                                profitPercentageCallPut: { type: "number" },
                                profitPercentageTurbo: { type: "number" },
                                status: { type: "boolean" },
                            },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Binary Duration"),
        500: query_1.serverErrorResponse,
    },
};
function applyAdjustment(baseProfit, adjustment) {
    if (adjustment === 0) {
        return baseProfit;
    }
    return Math.round(baseProfit * (1 + adjustment / 100));
}
const ORDER_TYPES = [
    "RISE_FALL",
    "HIGHER_LOWER",
    "TOUCH_NO_TOUCH",
    "CALL_PUT",
    "TURBO",
];
function calculateCumulativeAdjustments(durations) {
    var _a;
    const sortedDurations = [...durations].sort((a, b) => a.minutes - b.minutes);
    const cumulativeByType = {
        RISE_FALL: 0,
        HIGHER_LOWER: 0,
        TOUCH_NO_TOUCH: 0,
        CALL_PUT: 0,
        TURBO: 0,
    };
    const result = new Map();
    for (const duration of sortedDurations) {
        const overrides = duration.orderTypeOverrides || {};
        for (const type of ORDER_TYPES) {
            const adjustment = ((_a = overrides[type]) === null || _a === void 0 ? void 0 : _a.profitAdjustment) || 0;
            if (adjustment !== 0) {
                cumulativeByType[type] += adjustment;
            }
        }
        result.set(duration.id, { ...cumulativeByType });
    }
    return result;
}
function convertDurationToResponse(duration, settings, cumulativeAdjustments) {
    const { orderTypes } = settings;
    const profitPercentageRiseFall = applyAdjustment(orderTypes.RISE_FALL.profitPercentage, cumulativeAdjustments.RISE_FALL);
    const profitPercentageHigherLower = applyAdjustment(orderTypes.HIGHER_LOWER.profitPercentage, cumulativeAdjustments.HIGHER_LOWER);
    const profitPercentageTouchNoTouch = applyAdjustment(orderTypes.TOUCH_NO_TOUCH.profitPercentage, cumulativeAdjustments.TOUCH_NO_TOUCH);
    const profitPercentageCallPut = applyAdjustment(orderTypes.CALL_PUT.profitPercentage, cumulativeAdjustments.CALL_PUT);
    const profitPercentageTurbo = applyAdjustment(orderTypes.TURBO.profitPercentage, cumulativeAdjustments.TURBO);
    return {
        id: duration.id,
        duration: duration.minutes,
        profitPercentageRiseFall,
        profitPercentageHigherLower,
        profitPercentageTouchNoTouch,
        profitPercentageCallPut,
        profitPercentageTurbo,
        profitPercentage: profitPercentageRiseFall,
        status: duration.enabled,
    };
}
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching binary settings");
    const settings = await (0, binary_settings_cache_1.getBinarySettings)();
    const cumulativeAdjustmentsMap = calculateCumulativeAdjustments(settings.durations);
    const durations = settings.durations
        .filter((d) => d.enabled)
        .sort((a, b) => a.minutes - b.minutes)
        .map((d) => {
        const adjustments = cumulativeAdjustmentsMap.get(d.id) || {
            RISE_FALL: 0,
            HIGHER_LOWER: 0,
            TOUCH_NO_TOUCH: 0,
            CALL_PUT: 0,
            TURBO: 0,
        };
        return convertDurationToResponse(d, settings, adjustments);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${durations.length} binary durations from settings`);
    return durations;
};
