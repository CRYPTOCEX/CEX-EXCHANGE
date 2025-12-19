import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get All FAQ Feedback",
  description: "Retrieves all FAQ feedback records including user ratings and comments. Returns feedback ordered by creation date.",
  operationId: "getAllFaqFeedback",
  tags: ["Admin", "FAQ", "Feedback"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Feedback records retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                faqId: { type: "string", format: "uuid" },
                userId: { type: "string", format: "uuid" },
                isHelpful: { type: "boolean" },
                comment: { type: "string", nullable: true },
                createdAt: { type: "string", format: "date-time" },
                updatedAt: { type: "string", format: "date-time" },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.faq.feedback",
  logModule: "ADMIN_FAQ",
  logTitle: "Get all FAQ feedback",
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    ctx?.step("Fetching all faq feedback");
    const feedbacks = await models.faqFeedback.findAll({
      order: [["createdAt", "ASC"]],
    });
    ctx?.success("all FAQ feedback retrieved successfully");
    return feedbacks;
  } catch (error) {
    console.error("Error fetching FAQ feedback:", error);
    ctx?.fail("Failed to fetch all faq feedback");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to fetch feedback",
    });
  }
};
