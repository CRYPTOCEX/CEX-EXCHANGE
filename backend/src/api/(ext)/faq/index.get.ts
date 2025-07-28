import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Public FAQs",
  description:
    "Retrieves active FAQ entries with optional search and category filters.",
  operationId: "getPublicFAQs",
  tags: ["FAQ"],
  responses: {
    200: {
      description: "FAQs retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: { type: "array", items: { type: "object" } },
            },
          },
        },
      },
    },
    500: { description: "Internal Server Error" },
  },
};

export default async (data: Handler) => {
  const { query } = data;
  const where: any = {};
  // By default, only return active FAQs unless active=false is explicitly passed.
  if (query.active === "false") {
    where.status = false;
  } else {
    where.status = true;
  }
  if (query.search) {
    const search = query.search.toLowerCase();
    where[Op.or] = [
      { question: { [Op.like]: `%${search}%` } },
      { answer: { [Op.like]: `%${search}%` } },
    ];
  }
  if (query.category) {
    where.category = query.category;
  }
  try {
    const faqs = await models.faq.findAll({
      where,
      order: [["order", "ASC"]],
    });
    return faqs;
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    throw createError({ statusCode: 500, message: "Failed to fetch FAQs" });
  }
};
