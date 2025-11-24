import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op } from "sequelize";

export const metadata = {
  summary: "Get Admin Activities",
  description:
    "Retrieves all admin activities with optional filtering by action, type, and search term (e.g. admin name or related ID).",
  operationId: "getAdminActivities",
  tags: ["Staking", "Admin", "Activities"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "action",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["create", "update", "delete", "approve", "reject", "distribute"],
      },
      description: "Filter activities by action type",
    },
    {
      index: 1,
      name: "type",
      in: "query",
      required: false,
      schema: {
        type: "string",
        enum: ["pool", "position", "earnings", "settings", "withdrawal"],
      },
      description: "Filter activities by activity type",
    },
    {
      index: 2,
      name: "search",
      in: "query",
      required: false,
      schema: { type: "string" },
      description:
        "Search term to filter activities by relatedId or admin details (first name, last name, email)",
    },
  ],
  responses: {
    200: {
      description: "Admin activities retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object" },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "view.staking.activity",
};

export default async (data: { user?: any; query?: any }) => {
  const { user, query } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // Build filter conditions for the admin activity
    const where: any = {};
    if (query?.action) {
      where.action = query.action;
    }
    if (query?.type) {
      where.type = query.type;
    }

    // If a search term is provided, search in relatedId and also in the associated user's details.
    // Note that filtering on the included user requires a nested where.
    let userWhere: any = undefined;
    if (query?.search) {
      const searchTerm = `%${query.search}%`;
      // Add a condition to search admin details from the associated user model.
      userWhere = {
        [Op.or]: [
          { firstName: { [Op.like]: searchTerm } },
          { lastName: { [Op.like]: searchTerm } },
          { email: { [Op.like]: searchTerm } },
        ],
      };

      // Also search in the activity's own relatedId field.
      where[Op.or] = [{ relatedId: { [Op.like]: searchTerm } }];
    }

    // Fetch activities and include the associated user for extra details
    const activities = await models.stakingAdminActivity.findAll({
      where,
      include: [
        {
          model: models.user,
          as: "user",
          required: false,
          ...(userWhere ? { where: userWhere } : {}),
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    return activities;
  } catch (error) {
    console.error("Error fetching admin activities:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch admin activities",
    });
  }
};
