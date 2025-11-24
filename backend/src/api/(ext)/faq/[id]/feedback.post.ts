import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { faqFeedbackRateLimit } from "@b/handler/Middleware";

export const metadata = {
  summary: "Submit FAQ Feedback",
  description:
    "Creates or updates a feedback record for a specific FAQ. If a feedback record already exists for the user and FAQ, it updates the comment field.",
  operationId: "submitFAQFeedbackPublic",
  tags: ["FAQ"],
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
            isHelpful: { type: "boolean" },
            comment: { type: "string" },
          },
          required: ["isHelpful"],
        },
      },
    },
  },
  responses: {
    200: { description: "Feedback submitted successfully" },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  // Apply rate limiting
  await faqFeedbackRateLimit(data);
  
  const { params, body, user } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { id } = params;
  if (!id || typeof body.isHelpful !== "boolean") {
    throw createError({ statusCode: 400, message: "Invalid input" });
  }

  try {
    // Check for an existing feedback record for this FAQ and user.
    const existingFeedback = await models.faqFeedback.findOne({
      where: { faqId: id, userId: user.id },
    });

    if (existingFeedback) {
      // If the user is adding a comment (or wants to update their vote),
      // update the existing record.
      const updatedFeedback = await existingFeedback.update({
        isHelpful: body.isHelpful,
        comment: body.comment || existingFeedback.comment,
      });
      return updatedFeedback;
    } else {
      // Otherwise, create a new feedback record.
      const feedback = await models.faqFeedback.create({
        userId: user.id,
        faqId: id,
        isHelpful: body.isHelpful,
        comment: body.comment,
      });
      return feedback;
    }
  } catch (error) {
    console.error("Error submitting FAQ feedback:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to submit feedback",
    });
  }
};
