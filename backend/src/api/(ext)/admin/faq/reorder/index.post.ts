import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";
import {
  unauthorizedResponse,
  serverErrorResponse,
  badRequestResponse,
  notFoundResponse,
  successMessageResponse,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Reorder FAQs",
  description:
    "Reorders FAQ entries within a page or moves a FAQ to a different page. Updates the order field for all affected FAQs. Supports drag-and-drop functionality.",
  operationId: "reorderFaqs",
  tags: ["Admin", "FAQ", "Reorder"],
  requiresAuth: true,
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            faqId: {
              type: "string",
              format: "uuid",
              description: "ID of the FAQ being moved",
            },
            targetId: {
              type: ["string", "null"],
              format: "uuid",
              description:
                "ID of the FAQ at the target position (null if dropping to empty area)",
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
    200: successMessageResponse("FAQs reordered successfully"),
    400: badRequestResponse,
    401: unauthorizedResponse,
    404: notFoundResponse("FAQ"),
    500: serverErrorResponse,
  },
  permission: "edit.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Reorder FAQs",
};

export default async (data: Handler) => {
  const { user, body, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  const { faqId, targetId, targetPagePath } = body;

  if (!faqId) {
    ctx?.fail("Missing faqId");
    throw createError({ statusCode: 400, message: "Missing faqId" });
  }

  ctx?.step("Fetching dragged FAQ");
  const draggedFaq = await models.faq.findByPk(faqId);
  if (!draggedFaq) {
    ctx?.fail("Dragged FAQ not found");
    throw createError({ statusCode: 404, message: "Dragged FAQ not found" });
  }

  // If targetId is given, we must ensure that FAQ exists
  let targetFaq = null;
  if (targetId) {
    ctx?.step("Fetching target FAQ");
    targetFaq = await models.faq.findByPk(targetId);
    if (!targetFaq) {
      ctx?.fail("Target FAQ not found");
      throw createError({ statusCode: 404, message: "Target FAQ not found" });
    }
  }

  // Determine which page we are placing the dragged FAQ on
  const contextPagePath = targetPagePath || draggedFaq.pagePath;

  const transaction = await sequelize.transaction();
  try {
    ctx?.step("Reordering FAQs");
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
        ctx?.fail("Target FAQ not found in destination page");
        throw createError({
          statusCode: 404,
          message: "Target FAQ not found in the destination page",
        });
      }
      newIndex = targetIndex;
    }

    // Insert dragged FAQ at newIndex
    filteredFaqs.splice(newIndex, 0, draggedFaq);

    ctx?.step("Updating FAQ order");
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
    ctx?.success("FAQs reordered successfully");
    return { message: "FAQs reordered successfully" };
  } catch (err) {
    await transaction.rollback();
    ctx?.fail("Failed to reorder FAQs");
    throw createError({ statusCode: 500, message: "Failed to reorder FAQs" });
  }
};
