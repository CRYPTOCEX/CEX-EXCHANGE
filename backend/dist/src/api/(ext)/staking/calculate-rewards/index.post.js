"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = {
    summary: "Calculate Potential Staking Rewards",
    description: "Calculates potential rewards for a given amount and duration based on available staking pools.",
    operationId: "calculateStakingRewards",
    tags: ["Staking", "Rewards", "Calculator"],
    requiresAuth: true,
    logModule: "STAKING",
    logTitle: "Calculate rewards",
    parameters: [],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    required: ["amount", "duration"],
                    properties: {
                        amount: {
                            type: "number",
                            description: "Amount to stake",
                        },
                        duration: {
                            type: "number",
                            description: "Duration in days",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Rewards calculated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            calculations: {
                                type: "array",
                                items: {
                                    type: "object",
                                    properties: {
                                        poolId: { type: "string" },
                                        poolName: { type: "string" },
                                        tokenSymbol: { type: "string" },
                                        apr: { type: "number" },
                                        potentialReward: { type: "number" },
                                        totalReturn: { type: "number" },
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { amount, duration } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating calculation parameters");
    if (!amount || amount <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid amount" });
    }
    if (!duration || duration <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid duration" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Finding eligible staking pools");
    const whereClause = {
        status: "ACTIVE",
        lockPeriod: { [sequelize_1.Op.lte]: duration },
    };
    const pools = await db_1.models.stakingPool.findAll({
        where: whereClause,
        order: [["apr", "DESC"]],
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating potential rewards for each pool");
    const calculations = pools.map((pool) => {
        const { id, name, apr, symbol, icon, token } = pool;
        const annualReward = amount * (apr / 100);
        const dailyReward = annualReward / 365;
        const potentialReward = dailyReward * duration;
        const totalReturn = amount + potentialReward;
        return {
            poolId: id,
            poolName: name,
            tokenSymbol: symbol,
            tokenName: token,
            tokenIcon: icon,
            apr,
            potentialReward,
            totalReturn,
        };
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Calculated rewards for ${pools.length} pools`);
    return { calculations };
};
