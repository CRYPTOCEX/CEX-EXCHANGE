import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Submit FAQ Feedback",
  description: "Creates a new FAQ feedback record for a specific FAQ.",
  operationId: "submitFAQFeedback",
  tags: ["FAQ", "Admin", "Feedback"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "FAQ ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            isHelpful: {
              type: "boolean",
              description: "Indicates if the FAQ was helpful",
            },
            comment: {
              type: "string",
              description: "Optional feedback comment",
            },
          },
          required: ["isHelpful"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Feedback submitted successfully",
      content: {
        "application/json": {
          schema: { type: "object", properties: { data: { type: "object" } } },
        },
      },
    },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "create.faq.feedback",
};

export default async (data: Handler) => {
  const { params, body } = data;

  const { id } = params;
  if (!id || typeof body.isHelpful !== "boolean") {
    throw createError({
      statusCode: 400,
      message: "FAQ ID and isHelpful are required",
    });
  }
  try {
    const feedback = await models.faqFeedback.create({
      faqId: id,
      isHelpful: body.isHelpful,
      comment: body.comment,
    });
    return feedback;
  } catch (error) {
    console.error("Error submitting FAQ feedback:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to submit feedback",
    });
  }
};
