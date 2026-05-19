"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
exports.metadata = { summary: "Get Forex Investment Plans",
    description: "Retrieves a list of forex investment plans filtered and sorted based on query parameters. Parameters include activeTab, search, minProfit, maxInvestment, and sortBy.",
    operationId: "getForexPlans",
    tags: ["Forex", "Plan"],
    requiresAuth: true,
    logModule: "FOREX",
    logTitle: "Get Forex Plans",
    parameters: [
        { name: "activeTab",
            in: "query",
            description: 'If set to "trending", only trending plans are returned.',
            required: false,
            schema: { type: "string", enum: ["all", "trending"] },
        },
        { name: "search",
            in: "query",
            description: "Search term to filter plans by title or description.",
            required: false,
            schema: { type: "string" },
        },
        { name: "minProfit",
            in: "query",
            description: "Minimum profit value (number) that a plan must have.",
            required: false,
            schema: { type: "number" },
        },
        { name: "maxInvestment",
            in: "query",
            description: 'Maximum investment allowed. Plans with "maxAmount" (defaulting to 100000 if missing) must be less than or equal to this value.',
            required: false,
            schema: { type: "number" },
        },
        { name: "sortBy",
            in: "query",
            description: 'Sort the plans by "popularity" (invested descending), "profit" (profitPercentage descending) or "minInvestment" (minAmount ascending).',
            required: false,
            schema: { type: "string",
                enum: ["popularity", "profit", "minInvestment"],
            },
        },
    ],
    responses: { 200: { description: "Forex investment plans retrieved successfully.",
            content: { "application/json": { schema: { type: "array",
                        items: { type: "object",
                            properties: { id: { type: "string" },
                                name: { type: "string" },
                                title: { type: "string" },
                                description: { type: "string" },
                                image: { type: "string" },
                                currency: { type: "string" },
                                walletType: { type: "string" },
                                minProfit: { type: "number" },
                                maxProfit: { type: "number" },
                                minAmount: { type: "number" },
                                maxAmount: { type: "number" },
                                invested: { type: "number" },
                                profitPercentage: { type: "number" },
                                trending: { type: "boolean" },
                                createdAt: { type: "string", format: "date-time" },
                                updatedAt: { type: "string", format: "date-time" },
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized." },
        500: { description: "Internal Server Error." },
    },
};
exports.default = async (data) => {
    const { user, query, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const { activeTab = "all", search = "", minProfit = "0", maxInvestment, sortBy = "popularity", } = query || {};
    const minProfitNum = parseFloat(minProfit);
    const maxInvestmentNum = maxInvestment ? parseFloat(maxInvestment) : null;
    const whereClause = {
        status: true,
    };
    if (activeTab === "trending") {
        whereClause.trending = true;
    }
    if (search) {
        whereClause[sequelize_1.Op.or] = [
            { title: { [sequelize_1.Op.like]: `%${search}%` } },
            { description: { [sequelize_1.Op.like]: `%${search}%` } },
        ];
    }
    if (minProfitNum > 0) {
        whereClause.minProfit = { [sequelize_1.Op.gte]: minProfitNum };
    }
    if (maxInvestmentNum !== null) {
        whereClause[sequelize_1.Op.and] = [
            (0, sequelize_1.literal)(`COALESCE(\`forexPlan\`.\`maxAmount\`, 100000) <= ${maxInvestmentNum}`),
        ];
    }
    const sequelizeInstance = db_1.sequelize;
    const orderClause = [];
    if (sortBy === "profit") {
        orderClause.push(["profitPercentage", "DESC"]);
    }
    else if (sortBy === "minInvestment") {
        orderClause.push(["minAmount", "ASC"]);
    }
    else {
        orderClause.push([sequelizeInstance.literal("invested"), "DESC"]);
    }
    const plans = await db_1.models.forexPlan.findAll({ attributes: {
            exclude: ["defaultProfit", "defaultResult", "deletedAt", "status"],
            include: [
                [
                    sequelizeInstance.fn("COALESCE", sequelizeInstance.fn("SUM", sequelizeInstance.col("investments.amount")), 0),
                    "invested",
                ],
            ],
        },
        where: whereClause,
        include: [
            { model: db_1.models.forexInvestment,
                as: "investments",
                attributes: [],
            },
        ],
        group: ["forexPlan.id"],
        order: orderClause,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Request completed successfully");
    return plans;
};
