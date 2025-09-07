import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Get All FAQ Feedback",
  description: "Retrieves all FAQ feedback records.",
  operationId: "getAllFAQFeedback",
  tags: ["FAQ", "Admin", "Feedback"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Feedback records retrieved successfully",
      content: {
        "application/json": {
          schema: { type: "array", items: { type: "object" } },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.faq.feedback",
};

export default async (data: Handler) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    const feedbacks = await models.faqFeedback.findAll({
      order: [["createdAt", "ASC"]],
    });
    return feedbacks;
  } catch (error) {
    console.error("Error fetching FAQ feedback:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to fetch feedback",
    });
  }
};
