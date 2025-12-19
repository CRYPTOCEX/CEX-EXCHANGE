import { models } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Update Single FAQ",
  description: "Updates an existing FAQ entry by ID. Allows partial updates of FAQ fields including question, answer, category, tags, status, order, and related FAQs.",
  operationId: "updateFaq",
  tags: ["Admin", "FAQ", "Update"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", format: "uuid" },
      description: "FAQ ID to update",
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string", description: "FAQ question" },
            answer: { type: "string", description: "FAQ answer" },
            image: { type: "string", description: "Image URL" },
            category: { type: "string", description: "FAQ category" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "FAQ tags",
            },
            status: { type: "boolean", description: "Active status" },
            order: { type: "number", description: "Display order" },
            pagePath: { type: "string", description: "Page path" },
            relatedFaqIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Related FAQ IDs",
            },
          },
        },
      },
    },
  },
  responses: {
    200: {
      description: "FAQ updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            description: "Updated FAQ object",
          },
        },
      },
    },
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("FAQ"),
    500: serverErrorResponse,
  },
  permission: "edit.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Update FAQ entry",
};

export default async (data: Handler) => {
  const { user, params, body, ctx } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  ctx?.step("Fetching FAQ");
  const faq = await models.faq.findByPk(params.id);
  if (!faq) {
    ctx?.fail("FAQ not found");
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
    ctx?.fail("pagePath cannot be empty");
    throw createError({ statusCode: 400, message: "pagePath cannot be empty" });
  }

  ctx?.step("Updating FAQ");
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

  ctx?.success("FAQ updated successfully");
  return faq;
};
