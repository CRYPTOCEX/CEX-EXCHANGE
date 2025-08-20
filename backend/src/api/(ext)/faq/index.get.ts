import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Public FAQs",
  description:
    "Retrieves active FAQ entries with optional search, category filters and pagination.",
  operationId: "getPublicFAQs",
  tags: ["FAQ"],
  parameters: [
    {
      index: 0,
      name: "page",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Page number for pagination",
    },
    {
      index: 1,
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Number of items per page",
    },
    {
      index: 2,
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Search query for FAQ question or answer",
    },
    {
      index: 3,
      name: "category",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by FAQ category",
    },
    {
      index: 4,
      name: "active",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by active status",
    },
  ],
  responses: {
    200: {
      description: "FAQs retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: { type: "array", items: { type: "object" } },
              pagination: {
                type: "object",
                properties: {
                  currentPage: { type: "number" },
                  totalPages: { type: "number" },
                  totalItems: { type: "number" },
                  perPage: { type: "number" },
                },
              },
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
    // Pagination parameters
    const page = parseInt(query.page, 10) || 1;
    const perPage = Math.min(parseInt(query.limit, 10) || 10, 100); // Max 100 items per page
    const offset = (page - 1) * perPage;

    // If pagination is requested
    if (query.page || query.limit) {
      const { count, rows } = await models.faq.findAndCountAll({
        where,
        order: [["order", "ASC"]],
        offset,
        limit: perPage,
      });

      return {
        items: rows,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / perPage),
          totalItems: count,
          perPage,
        },
      };
    } else {
      // No pagination - return all results (backward compatibility)
      const faqs = await models.faq.findAll({
        where,
        order: [["order", "ASC"]],
      });
      return faqs;
    }
  } catch (error) {
    console.error("Error fetching public FAQs:", error);
    throw createError({ statusCode: 500, message: "Failed to fetch FAQs" });
  }
};
