import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Answer FAQ Question",
  description:
    "Generates an answer to a user question based on existing active FAQs using the DeepSeek API.",
  operationId: "aiAnswerQuestion",
  tags: ["FAQ", "Admin", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string", description: "User question" },
          },
          required: ["question"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Question answered successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: { answer: { type: "string" } },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "create.faq",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { question } = body;
  if (!question) {
    throw createError({ statusCode: 400, message: "Question is required" });
  }
  try {
    // Retrieve existing active FAQs for context.
    const faqs = await models.faq.findAll({
      where: { status: true },
      attributes: ["question", "answer"],
      raw: true,
    });
    const answer = await deepseekClient.answerQuestion(question, faqs);
    return answer;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to answer question",
    });
  }
};
