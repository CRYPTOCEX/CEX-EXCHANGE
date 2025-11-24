import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Generate FAQ using AI",
  description:
    "Generates a comprehensive FAQ based on a topic (and optional context) using the DeepSeek API.",
  operationId: "aiGenerateFAQ",
  tags: ["FAQ", "Admin", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "FAQ topic" },
            context: {
              type: "string",
              description: "Optional additional context",
            },
          },
          required: ["topic"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ generated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: { type: "object", description: "Generated FAQ object" },
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
  const { topic, context } = body;
  if (!topic) {
    throw createError({ statusCode: 400, message: "Topic is required" });
  }
  try {
    const generatedFAQ = await deepseekClient.generateFAQ(topic, context);
    return generatedFAQ;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to generate FAQ",
    });
  }
};
