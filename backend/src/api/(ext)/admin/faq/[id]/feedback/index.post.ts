import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Submit Feedback for FAQ",
  description: "Creates a new feedback record for a specific FAQ. Users can indicate if the FAQ was helpful and optionally provide a comment.",
  operationId: "submitFaqFeedback",
  tags: ["Admin", "FAQ", "Feedback"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
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
          schema: {
            type: "object",
            description: "Created feedback record",
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "create.faq.feedback",
  logModule: "ADMIN_FAQ",
  logTitle: "Submit FAQ feedback",
};

export default async (data: Handler) => {
  const { params, body, ctx } = data;

  const { id } = params;
  if (!id || typeof body.isHelpful !== "boolean") {
    ctx?.fail("FAQ ID and isHelpful are required");
    throw createError({
      statusCode: 400,
      message: "FAQ ID and isHelpful are required",
    });
  }
  try {
    ctx?.step("Creating feedback record");
    const feedback = await models.faqFeedback.create({
      faqId: id,
      isHelpful: body.isHelpful,
      comment: body.comment,
    });

    ctx?.success("Feedback submitted successfully");
    return feedback;
  } catch (error) {
    console.error("Error submitting FAQ feedback:", error);
    ctx?.fail("Failed to submit feedback");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to submit feedback",
    });
  }
};
