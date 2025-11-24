import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, literal } from "sequelize";

export const metadata = {
  summary: "Get Forex Investment Plans",
  description:
    "Retrieves a list of forex investment plans filtered and sorted based on query parameters. Parameters include activeTab, search, minProfit, maxInvestment, and sortBy.",
  operationId: "getForexPlans",
  tags: ["Forex", "Plan"],
  requiresAuth: true,
  parameters: [
    {
      name: "activeTab",
      in: "query",
      description: 'If set to "trending", only trending plans are returned.',
      required: false,
      schema: { type: "string", enum: ["all", "trending"] },
    },
    {
      name: "search",
      in: "query",
      description: "Search term to filter plans by title or description.",
      required: false,
      schema: { type: "string" },
    },
    {
      name: "minProfit",
      in: "query",
      description: "Minimum profit value (number) that a plan must have.",
      required: false,
      schema: { type: "number" },
    },
    {
      name: "maxInvestment",
      in: "query",
      description:
        'Maximum investment allowed. Plans with "maxAmount" (defaulting to 100000 if missing) must be less than or equal to this value.',
      required: false,
      schema: { type: "number" },
    },
    {
      name: "sortBy",
      in: "query",
      description:
        'Sort the plans by "popularity" (invested descending), "profit" (profitPercentage descending) or "minInvestment" (minAmount ascending).',
      required: false,
      schema: {
        type: "string",
        enum: ["popularity", "profit", "minInvestment"],
      },
    },
  ],
  responses: {
    200: {
      description: "Forex investment plans retrieved successfully.",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
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

interface Handler {
  user?: { id: string; [key: string]: any };
  query?: {
    activeTab?: string;
    search?: string;
    minProfit?: string;
    maxInvestment?: string;
    sortBy?: string;
  };
}

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  // Set default values and parse numeric values.
  const {
    activeTab = "all",
    search = "",
    minProfit = "0",
    maxInvestment = "100000",
    sortBy = "popularity",
  } = query || {};

  const minProfitNum = parseFloat(minProfit);
  const maxInvestmentNum = parseFloat(maxInvestment);

  // Build where clause for filtering.
  const whereClause: any = {};

  if (activeTab === "trending") {
    whereClause.trending = true;
  }

  if (search) {
    whereClause[Op.or] = [
      { title: { [Op.iLike]: `%${search}%` } },
      { description: { [Op.iLike]: `%${search}%` } },
    ];
  }

  whereClause.minProfit = { [Op.gte]: minProfitNum };

  whereClause[Op.and] = [
    literal(
      `COALESCE(\`forexPlan\`.\`maxAmount\`, 100000) <= ${maxInvestmentNum}`
    ),
  ];

  // Get the sequelize instance.
  const sequelizeInstance = sequelize;

  // Build order clause.
  const orderClause: any[] = [];
  if (sortBy === "profit") {
    orderClause.push(["profitPercentage", "DESC"]);
  } else if (sortBy === "minInvestment") {
    orderClause.push(["minAmount", "ASC"]);
  } else {
    orderClause.push([sequelizeInstance.literal("invested"), "DESC"]);
  }

  // Fetch the plans, compute "invested", and exclude unwanted fields.
  const plans = await models.forexPlan.findAll({
    attributes: {
      // Exclude fields not intended for user display.
      exclude: ["defaultProfit", "defaultResult", "deletedAt", "status"],
      // Include the aggregated invested field.
      include: [
        [
          sequelizeInstance.fn(
            "COALESCE",
            sequelizeInstance.fn(
              "SUM",
              sequelizeInstance.col("investments.amount")
            ),
            0
          ),
          "invested",
        ],
      ],
    },
    where: whereClause,
    include: [
      {
        model: models.forexInvestment,
        as: "investments",
        attributes: [],
      },
    ],
    group: ["forexPlan.id"],
    order: orderClause,
  });

  return plans;
};
