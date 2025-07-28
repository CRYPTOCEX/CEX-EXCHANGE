import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get FAQ Questions",
  description: "Retrieves all FAQ questions for admin review.",
  operationId: "getFAQQuestions",
  tags: ["FAQ", "Admin", "Questions"],
  requiresAuth: true,
  responses: {
    200: {
      description: "FAQ questions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.faq.question",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    const questions = await models.faqQuestion.findAll({
      order: [["createdAt", "DESC"]],
    });
    return questions;
  } catch (error) {
    console.error("Error fetching FAQ questions:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch FAQ questions",
    });
  }
};
