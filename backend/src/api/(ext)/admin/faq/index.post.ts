import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { validateAndSanitizeFAQ } from "@b/api/(ext)/faq/utils/faq-validation";

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

  // Validate and sanitize FAQ data
  const validation = validateAndSanitizeFAQ(body);
  if (!validation.isValid) {
    throw createError({ 
      statusCode: 400, 
      message: validation.errors.join(', ') 
    });
  }

  const sanitizedData = validation.sanitized;
  
  try {
    // Check if order is provided, if not, get the max order for the page
    let finalOrder = sanitizedData.order;
    if (finalOrder === 0) {
      const maxOrderFaq = await models.faq.findOne({
        where: { pagePath: sanitizedData.pagePath },
        order: [['order', 'DESC']],
      });
      finalOrder = maxOrderFaq ? maxOrderFaq.order + 1 : 0;
    }

    const faq = await models.faq.create({
      ...sanitizedData,
      order: finalOrder,
      relatedFaqIds: body.relatedFaqIds || [],
    });

    return faq;
  } catch (error) {
    console.error("Error creating FAQ:", error);
    throw createError({
      statusCode: 500,
      message: error instanceof Error ? error.message : "Failed to create FAQ",
    });
  }
};
