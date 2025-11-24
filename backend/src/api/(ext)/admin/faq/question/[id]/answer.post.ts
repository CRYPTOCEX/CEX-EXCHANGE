import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Answer FAQ Question",
  description:
    "Submits an answer to a FAQ question and updates its status to ANSWERED.",
  operationId: "answerFAQQuestion",
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
            answer: {
              type: "string",
              description: "The answer to the question",
            },
          },
          required: ["answer"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQ question answered successfully" },
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
  const { answer } = body;
  if (!id || !answer) {
    throw createError({
      statusCode: 400,
      message: "Question ID and answer are required",
    });
  }
  try {
    const question = await models.faqQuestion.findByPk(id);
    if (!question) {
      throw createError({ statusCode: 404, message: "FAQ question not found" });
    }
    await question.update({ answer, status: "ANSWERED" });
    return question;
  } catch (error) {
    console.error("Error answering FAQ question:", error);
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to answer FAQ question",
    });
  }
};
