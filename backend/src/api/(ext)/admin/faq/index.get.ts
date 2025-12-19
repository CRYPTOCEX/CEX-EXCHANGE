import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";
import {
  unauthorizedResponse,
  serverErrorResponse,
  paginationSchema,
} from "@b/utils/schema/errors";

export const metadata = {
  summary: "Get FAQs with Filters",
  description:
    "Retrieves FAQs with pagination and filtering options. Supports searching by question/answer text, filtering by category, status, and page path. Returns paginated results sorted by order.",
  operationId: "getAdminFaqs",
  tags: ["Admin", "FAQ", "Pagination"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "page",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Page number for pagination (default: 1)",
    },
    {
      index: 1,
      name: "limit",
      in: "query",
      required: false,
      schema: { type: "number" },
      description: "Number of items per page (default: 10)",
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
      name: "status",
      in: "query",
      required: false,
      schema: { type: "string", enum: ["active", "inactive", "all"] },
      description: "Filter by FAQ status: active, inactive, or all",
    },
    {
      index: 5,
      name: "pagePath",
      in: "query",
      required: false,
      schema: { type: "string" },
      description: "Filter by page path",
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
              items: {
                type: "array",
                items: { type: "object" },
                description: "Array of FAQ items",
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.faq",
  logModule: "ADMIN_FAQ",
  logTitle: "Get FAQs for admin",
};

export default async (data: Handler) => {
  const { user, query, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  // Build filters
  const where: any = {};
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
  if (query.status && query.status !== "all") {
    where.status = query.status === "active" ? true : false;
  }
  if (query.pagePath) {
    where.pagePath = query.pagePath;
  }

  // Pagination parameters
  const page = parseInt(query.page, 10) || 1;
  const perPage = parseInt(query.limit, 10) || 10;
  const offset = (page - 1) * perPage;

  ctx?.step("Fetching FAQs with filters");
  const { count, rows } = await models.faq.findAndCountAll({
    where,
    order: [["order", "ASC"]],
    offset,
    limit: perPage,
  });
  ctx?.success("FAQs retrieved successfully");

  return {
    items: rows,
    pagination: {
      currentPage: page,
      totalPages: Math.ceil(count / perPage),
      totalItems: count,
      perPage,
    },
  };
};
