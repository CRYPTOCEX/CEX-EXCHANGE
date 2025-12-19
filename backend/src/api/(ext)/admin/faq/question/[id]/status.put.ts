import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update FAQ Question Status",
  description: "Updates the status of a user-submitted FAQ question. Status can be PENDING, ANSWERED, or REJECTED.",
  operationId: "updateFaqQuestionStatus",
  tags: ["Admin", "FAQ", "Questions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
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
    200: {
      description: "FAQ question status updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Updated question object",
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("FAQ question"),
    500: serverErrorResponse,
  },
  permission: "edit.faq.question",
  logModule: "ADMIN_FAQ",
  logTitle: "Update FAQ question status",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;
  const { status } = body;
  if (!id || !status) {
    ctx?.fail("Question ID and status are required");
    throw createError({
      statusCode: 400,
      message: "Question ID and status are required",
    });
  }
  try {
    ctx?.step("Fetching FAQ question");
    const question = await models.faqQuestion.findByPk(id);
    if (!question) {
      ctx?.fail("FAQ question not found");
      throw createError({ statusCode: 404, message: "FAQ question not found" });
    }

    ctx?.step("Updating question status");
    await question.update({ status });

    ctx?.success("FAQ question status updated successfully");
    return question;
  } catch (error) {
    console.error("Error updating FAQ question status:", error);
    ctx?.fail("Failed to update FAQ question status");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to update FAQ question status",
    });
  }
};
