import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { validateAndSanitizeFAQ } from "@b/api/(ext)/faq/utils/faq-validation";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Create New FAQ",
  description:
    "Creates a new FAQ entry in the system. Validates and sanitizes input data before creation. Automatically determines the order if not specified.",
  operationId: "createFaq",
  tags: ["Admin", "FAQ", "Create"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            question: { type: "string", description: "FAQ question" },
            answer: { type: "string", description: "FAQ answer" },
            image: { type: "string", description: "Optional image URL" },
            category: { type: "string", description: "FAQ category" },
            tags: {
              type: "array",
              items: { type: "string" },
              description: "Tags for the FAQ",
            },
            status: {
              type: "boolean",
              description: "Active status (default: true)",
            },
            order: {
              type: "number",
              description: "Display order (auto-assigned if 0)",
            },
            pagePath: {
              type: "string",
              description: "Page path where FAQ appears",
            },
            relatedFaqIds: {
              type: "array",
              items: { type: "string", format: "uuid" },
              description: "Related FAQ IDs",
            },
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
          schema: {
            type: "object",
            description: "Created FAQ object",
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
  logTitle: "Create FAQ entry",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const validation = validateAndSanitizeFAQ(body, ctx);
  if (!validation.isValid) {
    throw createError({
      statusCode: 400,
      message: validation.errors.join(', ')
    });
  }

  const sanitizedData = validation.sanitized;

  try {
    ctx?.step("Determining FAQ order");
    let finalOrder = sanitizedData.order;
    if (finalOrder === 0) {
      const maxOrderFaq = await models.faq.findOne({
        where: { pagePath: sanitizedData.pagePath },
        order: [['order', 'DESC']],
      });
      finalOrder = maxOrderFaq ? maxOrderFaq.order + 1 : 0;
    }

    ctx?.step("Creating FAQ entry");
    const faq = await models.faq.create({
      ...sanitizedData,
      order: finalOrder,
      relatedFaqIds: body.relatedFaqIds || [],
    });

    ctx?.success("FAQ entry created successfully");
    return faq;
  } catch (error) {
    console.error("Error creating FAQ:", error);
    ctx?.fail("Failed to create FAQ");
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to create FAQ",
    });
  }
};
