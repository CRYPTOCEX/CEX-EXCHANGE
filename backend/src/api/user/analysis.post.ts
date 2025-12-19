import { models } from "@b/db";
import { createError } from "@b/utils/error";
// Import MySQL aggregator
import { getChartData as getMysqlChartData } from "@b/utils/chart";

export const metadata: OperationObject = {
  summary: "Gets chart data for user analytics (all in POST body)",
  operationId: "getAnalyticsData",
  tags: ["User", "CRM", "User", "Analytics"],
  logModule: "USER",
  logTitle: "Get analytics data",
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
            modelConfig: {
              type: "object",
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
  // No permission required - endpoint filters by userId for user's own analytics
};

export default async function handler(data: Handler) {
  const { user, body, ctx } = data;
  if (!user) {
    ctx?.fail("User not authenticated");
    throw createError(401, "Unauthorized access");
  }

  const { model, modelConfig, timeframe, charts, kpis } = body;

  if (!model) {
    ctx?.fail("Model parameter missing");
    throw createError(400, "Missing model parameter");
  }

  // Merge the default userId filter with any provided additional filters.
  const additionalFilter = { userId: user.id, ...(modelConfig || {}) };

  if (!models[model]) {
    ctx?.fail("Invalid model specified");
    throw createError(400, "Invalid or missing model");
  }

  ctx?.step(`Retrieving analytics data for model: ${model}`);
  const result = await getMysqlChartData({
    model: models[model],
    timeframe,
    charts,
    kpis,
    where: additionalFilter,
  });

  ctx?.success("Analytics data retrieved successfully");
  return result;
}
