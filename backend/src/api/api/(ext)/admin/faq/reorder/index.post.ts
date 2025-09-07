import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

// Example metadata object, adjust if needed
export const metadata = {
  summary: "Reorder FAQs",
  description: "Reorders FAQs, optionally moving a FAQ to a different page.",
  operationId: "reorderFAQs",
  tags: ["FAQ", "Admin"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            faqId: { type: "string", description: "ID of the FAQ being moved" },
            targetId: {
              type: ["string", "null"],
              description:
                "ID of the FAQ at the target position (or null if dropping onto an empty area)",
            },
            targetPagePath: {
              type: "string",
              description:
                "Optional new page path if moving to a different page",
            },
          },
          required: ["faqId"],
        },
      },
    },
  },
  responses: {
    200: { description: "FAQs reordered successfully" },
    400: { description: "Bad Request" },
    401: { description: "Unauthorized" },
    404: { description: "FAQ not found" },
    500: { description: "Internal Server Error" },
  },
  permission: "edit.faq",
};

export default async (data: Handler) => {
  const { user, body } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { faqId, targetId, targetPagePath } = body;

  if (!faqId) {
    throw createError({ statusCode: 400, message: "Missing faqId" });
  }

  // Find the dragged FAQ
  const draggedFaq = await models.faq.findByPk(faqId);
  if (!draggedFaq) {
    throw createError({ statusCode: 404, message: "Dragged FAQ not found" });
  }

  // If targetId is given, we must ensure that FAQ exists
  let targetFaq = null;
  if (targetId) {
    targetFaq = await models.faq.findByPk(targetId);
    if (!targetFaq) {
      throw createError({ statusCode: 404, message: "Target FAQ not found" });
    }
  }

  // Determine which page we are placing the dragged FAQ on
  const contextPagePath = targetPagePath || draggedFaq.pagePath;

  const transaction = await sequelize.transaction();
  try {
    // Get all FAQs on the *destination* page (the new or same page)
    const faqsOnPage = await models.faq.findAll({
      where: { pagePath: contextPagePath },
      order: [["order", "ASC"]],
      transaction,
    });

    // Remove the dragged FAQ if it's already in this list
    const filteredFaqs: any[] = faqsOnPage.filter(
      (f: any) => f.id !== draggedFaq.id
    );

    // Decide where to insert the dragged FAQ
    let newIndex = filteredFaqs.length; // default to the end of the list
    if (targetFaq) {
      // Insert right before the target FAQ
      const targetIndex = filteredFaqs.findIndex(
        (f: any) => f.id === (targetFaq as any).id
      );
      if (targetIndex === -1) {
        throw createError({
          statusCode: 404,
          message: "Target FAQ not found in the destination page",
        });
      }
      newIndex = targetIndex;
    }

    // Insert dragged FAQ at newIndex
    filteredFaqs.splice(newIndex, 0, draggedFaq);

    // Update order and pagePath for all FAQs in this new array
    for (let i = 0; i < filteredFaqs.length; i++) {
      await filteredFaqs[i].update(
        {
          order: i,
          pagePath: contextPagePath,
        },
        { transaction }
      );
    }

    await transaction.commit();
    return { message: "FAQs reordered successfully" };
  } catch (err) {
    await transaction.rollback();
    throw createError({ statusCode: 500, message: "Failed to reorder FAQs" });
  }
};
