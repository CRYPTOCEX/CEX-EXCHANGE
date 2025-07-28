import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update FAQ Question Status",
  description: "Updates the status of a FAQ question.",
  operationId: "updateFAQQuestionStatus",
  tags: ["FAQ", "Admin", "Questions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "FAQ question ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              enum: ["PENDING", "ANSWERED", "REJECTED"],
              description: "New status for the FAQ question",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQ question status updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "FAQ question not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.faq.question",
};

export default async (data: Handler) => {
  const { user, params, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;
  const { status } = body;
  if (!id || !status) {
    throw createError({
      statusCode: 400,
      message: "Question ID and status are required",
    });
  }
  try {
    const question = await models.faqQuestion.findByPk(id);
    if (!question) {
      throw createError({ statusCode: 404, message: "FAQ question not found" });
    }
    await question.update({ status });
    return question;
  } catch (error) {
    console.error("Error updating FAQ question status:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update FAQ question status",
    });
  }
};
