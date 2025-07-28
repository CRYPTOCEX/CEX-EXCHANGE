import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Create a New FAQ",
  description: "Creates a new FAQ entry in the system.",
  operationId: "createFAQ",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string" },
            answer: { type: "string" },
            image: { type: "string" },
            category: { type: "string" },
            tags: { type: "array", items: { type: "string" } },
            status: { type: "boolean" },
            order: { type: "number" },
            pagePath: { type: "string" },
            relatedFaqIds: { type: "array", items: { type: "string" } },
          },
          required: ["question", "answer", "category", "pagePath"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ created successfully",
      content: {
        "application/json": {
          schema: { type: "object", properties: { faq: { type: "object" } } },
        },
      },
    },
    400: { description: "Bad Request" },
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

  const {
    question,
    answer,
    image,
    category,
    tags,
    status,
    order,
    pagePath,
    relatedFaqIds,
  } = body;

  if (!pagePath) {
    throw createError({ statusCode: 400, message: "pagePath is required" });
  }

  const faq = await models.faq.create({
    question,
    answer,
    image,
    category,
    tags,
    status,
    order,
    pagePath,
    relatedFaqIds,
  });

  return faq;
};
