import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Record FAQ Search Query",
  description: "Records a search query used on the FAQ page.",
  operationId: "recordFAQSearch",
  tags: ["FAQ"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            userId: { type: "string" },
            query: { type: "string" },
            resultCount: { type: "number" },
            category: { type: "string" },
          },
          required: ["query", "resultCount"],
        },
      },
    },
  },
  responses: {
    200: { description: "Search query recorded successfully" },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body } = data;

  const { query, resultCount, category, userId } = body;

  if (!userId) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  if (!query || resultCount === undefined) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  try {
    const searchRecord = await models.faqSearch.create({
      userId: userId,
      query,
      resultCount,
      category,
    });
    return searchRecord;
  } catch (error) {
    console.error("Error recording FAQ search:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to record search",
    });
  }
};
