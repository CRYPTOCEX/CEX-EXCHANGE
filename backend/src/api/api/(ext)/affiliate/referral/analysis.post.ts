// /server/api/admin/users/analytics/all.get.ts

import { getChartData } from "@b/utils/chart";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Gets chart data for analytics",
  operationId: "getAnalyticsData",
  tags: ["User", "Analytics"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            model: { type: "string" },
            timeframe: { type: "string" },
            db: { type: "string" },
            keyspace: { type: "string", nullable: true },
            charts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  type: {
                    type: "string",
                    enum: ["line", "bar", "pie", "stackedBar", "stackedArea"],
                  },
                  model: { type: "string" },
                  metrics: {
                    type: "array",
                    items: { type: "string" },
                  },
                },
              },
            },
            kpis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  title: { type: "string" },
                  metric: { type: "string" },
                  model: { type: "string" },
                  icon: { type: "string" },
                },
              },
            },
          },
          required: ["model", "timeframe", "charts", "kpis"],
        },
      },
    },
  },
  responses: {
    200: {
      description:
        "Analytics data object matching your shape (kpis + chart keys)",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              kpis: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    value: { type: "number" },
                    change: { type: "number" },
                    trend: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          date: { type: "string" },
                          value: { type: "number" },
                        },
                      },
                    },
                    icon: { type: "string" },
                  },
                },
              },
            },
            additionalProperties: true,
          },
        },
      },
    },
    401: { description: "Unauthorized access" },
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { user, query, body } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const {
    model,
    modelConfig,
    db = "mysql",
    keyspace: providedKeyspace,
    timeframe,
    charts,
    kpis,
  } = body;
  const { availableFilters } = body;

  if (!["mlmReferral", "mlmReferralReward"].includes(model))
    throw createError(400, "Invalid model");

  if (!models[model]) throw createError(400, "Invalid model");

  if (!model) {
    throw createError(400, "Missing model parameter");
  }

  // Default modelConfig to an empty object if it's undefined or null.
  const additionalFilter = modelConfig || {};

  // If MySQL, ensure the model exists and call the MySQL aggregator.
  if (db === "mysql") {
    if (!models[model]) {
      throw createError(400, "Invalid or missing model");
    }
    return getChartData({
      model: models[model],
      timeframe,
      charts,
      kpis,
      where: additionalFilter,
    });
  }
};
