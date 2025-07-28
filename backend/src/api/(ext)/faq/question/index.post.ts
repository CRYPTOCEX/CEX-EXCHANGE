import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Submit FAQ Question",
  description:
    "Allows a user to submit a question if they cannot find an answer in the FAQs.",
  operationId: "submitFAQQuestion",
  tags: ["FAQ"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            email: { type: "string", description: "User's email" },
            question: { type: "string", description: "The submitted question" },
          },
          required: ["email", "question"],
        },
      },
    },
  },
  responses: {
    200: { description: "Question submitted successfully" },
    400: { description: "Bad Request" },
    500: { description: "Internal Server Error" },
  },
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { body, user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { email, question } = body;
  if (!email || !question) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }

  const userPk = await models.user.findByPk(user.id);
  if (!userPk) {
    throw createError({ statusCode: 400, message: "User not found" });
  }

  try {
    const newQuestion = await models.faqQuestion.create({
      userId: user.id,
      name: userPk.firstName + " " + userPk.lastName,
      email,
      question,
      status: "PENDING",
    });
    return newQuestion;
  } catch (error) {
    console.error("Error submitting FAQ question:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to submit question",
    });
  }
};
