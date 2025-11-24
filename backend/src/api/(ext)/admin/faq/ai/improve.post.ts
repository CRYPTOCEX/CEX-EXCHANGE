import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Improve FAQ Answer",
  description:
    "Improves an existing FAQ answer to make it more comprehensive and clear using the DeepSeek API.",
  operationId: "aiImproveFAQ",
  tags: ["FAQ", "Admin", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string", description: "FAQ question" },
            answer: { type: "string", description: "Current FAQ answer" },
          },
          required: ["question", "answer"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ improved successfully",
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
  const { question, answer } = body;
  if (!question || !answer) {
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  try {
    const improvedAnswer = await deepseekClient.improveFAQ(question, answer);
    return improvedAnswer;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to improve FAQ",
    });
  }
};
