import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Suggest Tags for FAQ with AI",
  description:
    "Uses AI to analyze an FAQ question and answer pair to suggest 3-5 relevant tags. Tags help with categorization and searchability of FAQ content.",
  operationId: "suggestFaqTagsWithAi",
  tags: ["Admin", "FAQ", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string", description: "The FAQ question" },
            answer: { type: "string", description: "The FAQ answer" },
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
              tags: {
                type: "array",
                items: { type: "string" },
                description: "AI-suggested tags (3-5 tags)",
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
  logTitle: "AI suggest tags",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { question, answer } = body;
  if (!question || !answer) {
    ctx?.fail("Missing required fields");
    throw createError({ statusCode: 400, message: "Missing required fields" });
  }
  try {
    ctx?.step("Suggesting tags with AI");
    const tags = await deepseekClient.suggestTags(question, answer);

    ctx?.success("Tags suggested successfully");
    return tags;
  } catch (error) {
    ctx?.fail("Failed to suggest tags");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to suggest tags",
    });
  }
};
