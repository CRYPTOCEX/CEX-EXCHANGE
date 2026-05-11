"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Get Forex Investment Durations",
    description: "Retrieves a list of all available Forex investment durations, ordered by timeframe (HOUR, DAY, WEEK, MONTH) then duration ascending.",
    operationId: "getForexDurations",
    tags: ["Forex", "Duration"],
    logModule: "FOREX",
    logTitle: "Get Forex Durations",
    requiresAuth: true,
    responses: {
        200: {
            description: "Forex investment durations retrieved successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "array",
                        items: {
                            type: "object",
                            properties: {
                                id: { type: "string", description: "Duration ID" },
                                duration: { type: "number", description: "Duration value" },
                                timeframe: {
                                    type: "string",
                                    enum: ["HOUR", "DAY", "WEEK", "MONTH"],
                                    description: "Timeframe unit",
                                },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching Forex Durations");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    try {
        const timeframeOrder = `
      CASE \`forexDuration\`.\`timeframe\`
        WHEN 'HOUR' THEN 1
        WHEN 'DAY' THEN 2
        WHEN 'WEEK' THEN 3
        WHEN 'MONTH' THEN 4
      END
    `;
        const durations = await db_1.models.forexDuration.findAll({
            attributes: ["id", "duration", "timeframe"],
            order: [
                [(0, sequelize_1.literal)(timeframeOrder), "ASC"],
                ["duration", "ASC"],
            ],
            raw: true,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Get Forex Durations fetched successfully");
        return durations;
    }
    catch (error) {
        console.error("Error fetching durations:", error);
        throw (0, error_1.createError)({ statusCode: 500, message: "Internal Server Error" });
    }
};
