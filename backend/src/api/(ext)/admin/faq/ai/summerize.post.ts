import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Summarize FAQ Content",
  description:
    "Generates a concise summary of the provided FAQ content using the DeepSeek API.",
  operationId: "aiSummarizeFAQContent",
  tags: ["FAQ", "Admin", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            content: {
              type: "string",
              description: "FAQ content to summarize",
            },
          },
          required: ["content"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Content summarized successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "object",
                properties: { summary: { type: "string" } },
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
  const { content } = body;
  if (!content) {
    throw createError({ statusCode: 400, message: "Content is required" });
  }
  try {
    const summary = await deepseekClient.summarizeFAQ(content);
    return summary;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to summarize content",
    });
  }
};
