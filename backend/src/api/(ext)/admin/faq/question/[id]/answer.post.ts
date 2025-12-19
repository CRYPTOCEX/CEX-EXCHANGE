import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Answer User-Submitted FAQ Question",
  description:
    "Submits an answer to a user-submitted FAQ question and updates its status to ANSWERED. The answer is stored with the question record.",
  operationId: "answerFaqQuestion",
  tags: ["Admin", "FAQ", "Questions"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "FAQ question ID",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            answer: {
              type: "string",
              description: "The answer to the question",
            },
          },
          required: ["answer"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ question answered successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Updated question object with answer",
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("FAQ question"),
    500: serverErrorResponse,
  },
  permission: "edit.faq.question",
  logModule: "ADMIN_FAQ",
  logTitle: "Answer FAQ question",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  const { id } = params;
  const { answer } = body;
  if (!id || !answer) {
    ctx?.fail("Question ID and answer are required");
    throw createError({
      statusCode: 400,
      message: "Question ID and answer are required",
    });
  }
  try {
    ctx?.step("Fetching FAQ question");
    const question = await models.faqQuestion.findByPk(id);
    if (!question) {
      ctx?.fail("FAQ question not found");
      throw createError({ statusCode: 404, message: "FAQ question not found" });
    }

    ctx?.step("Updating question with answer");
    await question.update({ answer, status: "ANSWERED" });

    ctx?.success("FAQ question answered successfully");
    return question;
  } catch (error) {
    console.error("Error answering FAQ question:", error);
    ctx?.fail("Failed to answer FAQ question");
    throw createError({
      statusCode: 500,
      message:
        error instanceof Error
          ? error.message
          : "Failed to answer FAQ question",
    });
  }
};
