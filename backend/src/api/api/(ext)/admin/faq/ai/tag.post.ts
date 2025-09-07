import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Suggest FAQ Tags",
  description:
    "Suggests 3–5 relevant tags for an FAQ based on the provided question and answer using the DeepSeek API.",
  operationId: "aiSuggestFAQTags",
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
            answer: { type: "string", description: "FAQ answer" },
          },
          required: ["question", "answer"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Tags suggested successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: { type: "array", items: { type: "string" } },
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
    const tags = await deepseekClient.suggestTags(question, answer);
    return tags;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to suggest tags",
    });
  }
};
