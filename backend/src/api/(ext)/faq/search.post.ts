import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Search FAQs and Record Query",
  description: "Searches FAQs based on query and category, and records the search for analytics.",
  operationId: "searchAndRecordFAQ",
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
            category: { type: "string" },
          },
          required: ["query"],
        },
      },
    },
  },
  responses: {
    200: { 
      description: "Search results returned",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: { type: "object" }
          },
        },
      },
    },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: false,
};

export default async (data: Handler) => {
  const { body, user } = data;
  const { query, category } = body;

  if (!query || typeof query !== 'string') {
    throw createError({ statusCode: 400, message: "Query is required" });
  }

  const searchQuery = query.trim().toLowerCase();
  if (searchQuery.length < 2) {
    throw createError({ statusCode: 400, message: "Query must be at least 2 characters" });
  }

  try {
    // Build search conditions
    const where: any = {
      status: true, // Only active FAQs
      [Op.or]: [
        { question: { [Op.like]: `%${searchQuery}%` } },
        { answer: { [Op.like]: `%${searchQuery}%` } },
      ],
    };

    if (category && category !== "all") {
      where.category = category;
    }

    // Search FAQs
    const faqs = await models.faq.findAll({
      where,
      order: [["order", "ASC"]],
      limit: 50, // Limit results
    });

    // Record search for analytics (non-blocking)
    const userId = user?.id || body.userId;
    if (userId || searchQuery.length > 3) { // Only log meaningful searches
      models.faqSearch.create({
        userId,
        query: searchQuery,
        resultCount: faqs.length,
        category,
      }).catch(error => {
        console.error("Error recording FAQ search:", error);
        // Don't fail the request if logging fails
      });
    }

    return faqs;
  } catch (error) {
    console.error("Error searching FAQs:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to search FAQs",
    });
  }
};
