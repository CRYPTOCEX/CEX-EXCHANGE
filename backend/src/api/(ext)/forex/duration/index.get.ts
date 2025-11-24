import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get Forex Investment Durations",
  description:
    "Retrieves a list of all available Forex investment durations, ordered by timeframe (HOUR, DAY, WEEK, MONTH) then duration ascending.",
  operationId: "getForexDurations",
  tags: ["Forex", "Duration"],
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

interface Handler {
  user?: { id: string; [key: string]: any };
}

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Use backticks or omit them entirely
    // to produce valid MySQL/MariaDB syntax:
    const timeframeOrder = `
      CASE \`forexDuration\`.\`timeframe\`
        WHEN 'HOUR' THEN 1
        WHEN 'DAY' THEN 2
        WHEN 'WEEK' THEN 3
        WHEN 'MONTH' THEN 4
      END
    `;

    const durations = await models.forexDuration.findAll({
      attributes: ["id", "duration", "timeframe"],
      order: [
        [sequelize.literal(timeframeOrder), "ASC"], // Order by CASE expression
        ["duration", "ASC"], // Then order by numeric duration
      ],
      raw: true,
    });

    return durations;
  } catch (error) {
    console.error("Error fetching durations:", error);
    throw createError({ statusCode: 500, message: "Internal Server Error" });
  }
};
