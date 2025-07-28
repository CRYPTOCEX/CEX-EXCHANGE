import { models } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata = {
  summary: "Update FAQ",
  description: "Updates an existing FAQ entry.",
  operationId: "updateFAQ",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string" },
      description: "FAQ ID",
    },
  ],
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
        },
      },
    },
  },
  responses: {
    200: { description: "FAQ updated successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "FAQ not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.faq.feedback",
};

export default async (data: Handler) => {
  const { user, params, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const faq = await models.faq.findByPk(params.id);
  if (!faq) {
    throw createError({ statusCode: 404, message: "FAQ not found" });
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

  if (pagePath !== undefined && pagePath === "") {
    throw createError({ statusCode: 400, message: "pagePath cannot be empty" });
  }

  await faq.update({
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
