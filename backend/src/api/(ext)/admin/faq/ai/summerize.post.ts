import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Summarize FAQ Content with AI",
  description:
    "Generates a concise summary of the provided FAQ content using AI. Useful for creating brief descriptions or meta descriptions from longer FAQ answers.",
  operationId: "summarizeFaqContentWithAi",
  tags: ["Admin", "FAQ", "AI"],
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
              summary: {
                type: "string",
                description: "AI-generated summary of the content",
              },
            },
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "create.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "AI summarize content",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { content } = body;
  if (!content) {
    ctx?.fail("Content is required");
    throw createError({ statusCode: 400, message: "Content is required" });
  }
  try {
    ctx?.step("Summarizing content with AI");
    const summary = await deepseekClient.summarizeFAQ(content);

    ctx?.success("Content summarized successfully");
    return summary;
  } catch (error) {
    ctx?.fail("Failed to summarize content");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to summarize content",
    });
  }
};
