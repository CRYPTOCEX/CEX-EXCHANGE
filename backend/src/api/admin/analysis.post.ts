import { models } from "@b/db";
import { createError } from "@b/utils/error";
// Import MySQL aggregator
import { getChartData as getMysqlChartData } from "@b/utils/chart";

// Safe import for Scylla aggregator (only available if extension is installed)
async function getScyllaChartData(params: any) {
  try {
    // @ts-ignore - Dynamic import for optional extension
    const module = await import("@b/api/(ext)/ecosystem/utils/scylla/chart");
    return module.getChartData(params);
  } catch (error) {
    throw createError(400, "Scylla extension is not installed or available");
  }
}

export const metadata: OperationObject = {
  summary: "Gets chart data for user analytics (all in POST body)",
  operationId: "getAnalyticsData",
  tags: ["Admin", "CRM", "User", "Analytics"],
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
  permission: "access.admin",
};

export default async function handler(data: Handler) {
  const { body } = data;
  const {
    model,
    modelConfig,
    db = "mysql",
    keyspace: providedKeyspace,
    timeframe,
    charts,
    kpis,
  } = body;

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
    return getMysqlChartData({
      model: models[model],
      timeframe,
      charts,
      kpis,
      where: additionalFilter,
    });
  }

  // For Scylla, determine keyspace.
  if (!providedKeyspace) throw createError(400, "Missing keyspace parameter");

  const keyspace =
    providedKeyspace === "ecosystem"
      ? process.env.SCYLLA_KEYSPACE || "trading"
      : process.env.SCYLLA_FUTURES_KEYSPACE || "futures";

  // Call the Scylla aggregator.
  return getScyllaChartData({
    model,
    keyspace,
    timeframe,
    charts,
    kpis,
    where: additionalFilter,
  });
}
