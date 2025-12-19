import { deepseekClient } from "@b/utils/ai/deepseek-client";
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Generate AI Answer for User Question",
  description:
    "Uses AI to generate an answer to a user question based on existing active FAQs. The AI analyzes all active FAQ entries to provide a relevant answer.",
  operationId: "generateAiAnswerForQuestion",
  tags: ["Admin", "FAQ", "AI"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: {
              type: "string",
              description: "The user question to be answered",
            },
          },
          required: ["question"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "AI-generated answer returned successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              answer: {
                type: "string",
                description: "AI-generated answer based on existing FAQs",
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
  logTitle: "AI answer question",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { question } = body;
  if (!question) {
    ctx?.fail("Question is required");
    throw createError({ statusCode: 400, message: "Question is required" });
  }
  try {
    ctx?.step("Retrieving active FAQs");
    const faqs = await models.faq.findAll({
      where: { status: true },
      attributes: ["question", "answer"],
      raw: true,
    });

    ctx?.step("Generating AI answer");
    const answer = await deepseekClient.answerQuestion(question, faqs);

    ctx?.success("Question answered successfully");
    return answer;
  } catch (error) {
    ctx?.fail("Failed to answer question");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error ? error.message : "Failed to answer question",
    });
  }
};
