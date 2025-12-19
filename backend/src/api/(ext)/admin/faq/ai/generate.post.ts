import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Generate FAQ Content with AI",
  description:
    "Generates a comprehensive FAQ question and answer pair based on a given topic and optional context using AI. Returns structured FAQ content ready to be saved.",
  operationId: "generateFaqWithAi",
  tags: ["Admin", "FAQ", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            topic: { type: "string", description: "Topic for the FAQ" },
            context: {
              type: "string",
              description: "Optional additional context for FAQ generation",
            },
          },
          required: ["topic"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ content generated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              question: {
                type: "string",
                description: "Generated FAQ question",
              },
              answer: {
                type: "string",
                description: "Generated FAQ answer",
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
  logTitle: "AI generate FAQ",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { topic, context } = body;
  if (!topic) {
    ctx?.fail("Topic is required");
    throw createError({ statusCode: 400, message: "Topic is required" });
  }
  try {
    ctx?.step("Generating FAQ with AI");
    const generatedFAQ = await deepseekClient.generateFAQ(topic, context);

    ctx?.success("FAQ generated successfully");
    return generatedFAQ;
  } catch (error) {
    ctx?.fail("Failed to generate FAQ");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to generate FAQ",
    });
  }
};
