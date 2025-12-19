import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get User-Submitted FAQ Questions",
  description: "Retrieves all user-submitted FAQ questions for admin review. Returns questions ordered by creation date (newest first).",
  operationId: "getFaqQuestions",
  tags: ["Admin", "FAQ", "Questions"],
  requiresAuth: true,
  responses: {
    200: {
      description: "FAQ questions retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string", format: "uuid" },
                name: { type: "string", description: "Submitter name" },
                email: { type: "string", format: "email" },
                question: { type: "string" },
                answer: { type: "string", nullable: true },
                status: {
                  type: "string",
                  enum: ["PENDING", "ANSWERED", "REJECTED"],
                },
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
  permission: "view.faq.question",
  logModule: "ADMIN_FAQ",
  logTitle: "Get FAQ questions",
};

export default async (data: Handler) => {
  const { user, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    ctx?.step("Fetching faq questions");
    const questions = await models.faqQuestion.findAll({
      order: [["createdAt", "DESC"]],
    });
    ctx?.success("FAQ questions retrieved successfully");
    return questions;
  } catch (error) {
    console.error("Error fetching FAQ questions:", error);
    ctx?.fail("Failed to fetch faq questions");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to fetch FAQ questions",
    });
  }
};
