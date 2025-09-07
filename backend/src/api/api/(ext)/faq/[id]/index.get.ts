import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, fn, literal, col } from "sequelize";

export const metadata = {
  summary: "Get FAQ by ID",
  description:
    "Retrieves a single FAQ entry by its ID, including its related FAQs, computed helpfulCount from feedback, and increments the view count.",
  operationId: "getFAQById",
  tags: ["FAQ"],
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
  responses: {
    200: {
      description:
        "FAQ retrieved successfully with related FAQs, helpfulCount and updated view count embedded",
      content: { "application/json": { schema: { type: "object" } } },
    },
    404: { description: "FAQ not found" },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { params } = data;
  const faq = await models.faq.findByPk(params.id);

  if (!faq) {
    throw createError({ statusCode: 404, message: "FAQ not found" });
  }

  // Increment the views count and reload the instance to get the updated value.
  await faq.increment("views", { by: 1 });
  await faq.reload();

  // Parse relatedFaqIds if stored as a JSON string.
  let relatedFaqIds: string[] = [];
  if (faq.relatedFaqIds) {
    if (typeof faq.relatedFaqIds === "string") {
      try {
        relatedFaqIds = JSON.parse(faq.relatedFaqIds);
      } catch (e) {
        // If parsing fails, default to empty array.
        relatedFaqIds = [];
      }
    } else if (Array.isArray(faq.relatedFaqIds)) {
      relatedFaqIds = faq.relatedFaqIds;
    }
  }

  // Fetch related FAQs if there are any related FAQ IDs.
  let relatedFaqs = [];
  if (relatedFaqIds.length > 0) {
    relatedFaqs = await models.faq.findAll({
      where: {
        id: relatedFaqIds,
      },
    });
  }

  // Compute the helpfulCount by counting all feedbacks with isHelpful true.
  const helpfulCount = await models.faqFeedback.count({
    where: {
      faqId: faq.id,
      isHelpful: true,
    },
  });

  // Convert the FAQ model instance to a plain object.
  const faqData = faq.toJSON();
  // Embed the related FAQs and helpfulCount within the FAQ object.
  faqData.relatedFaqs = relatedFaqs;
  faqData.helpfulCount = helpfulCount;

  return faqData;
};
