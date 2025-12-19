import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Improve FAQ Answer with AI",
  description:
    "Uses AI to enhance an existing FAQ answer, making it more comprehensive, clear, and helpful. The improved answer maintains the original intent while improving readability and completeness.",
  operationId: "improveFaqAnswerWithAi",
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
            answer: {
              type: "string",
              description: "Current answer to be improved",
            },
          },
          required: ["question", "answer"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ answer improved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              answer: {
                type: "string",
                description: "AI-improved answer",
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
  logTitle: "AI improve FAQ",
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
    ctx?.step("Improving FAQ with AI");
    const improvedAnswer = await deepseekClient.improveFAQ(question, answer);

    ctx?.success("FAQ improved successfully");
    return improvedAnswer;
  } catch (error) {
    ctx?.fail("Failed to improve FAQ");
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to improve FAQ",
    });
  }
};
