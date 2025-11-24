// backend/src/api/(ext)/admin/blog/author/top.get.ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { fn, col, literal } from "sequelize";

export const metadata = {
  summary: "Get Top Blog Authors",
  description: "Retrieves top authors based on post counts.",
  operationId: "getAdminTopBlogAuthors",
  tags: ["Blog", "Admin", "Authors"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Top authors retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                id: { type: "string" },
                userId: { type: "string" },
                status: { type: "string" },
                postCount: { type: "number" },
                user: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    firstName: { type: "string" },
                    lastName: { type: "string" },
                    email: { type: "string" },
                    avatar: { type: "string" },
                    profile: { type: "object" },
                    role: {
                      type: "object",
                      properties: {
                        name: { type: "string" }
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    },
    401: {
      description: "Unauthorized"
    },
    500: {
      description: "Internal server error"
    }
  }
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }
  try {
    // Get top authors with post counts using a subquery approach
    const topAuthors = await models.author.findAll({
      attributes: [
        "id",
        "userId",
        "status",
        [
          literal(`(
            SELECT COUNT(*)
            FROM post
            WHERE post.authorId = author.id
            AND post.status = 'PUBLISHED'
            AND post.deletedAt IS NULL
          )`),
          "postCount"
        ],
      ],
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar", "profile"],
          include: [
            {
              model: models.role,
              as: "role",
              attributes: ["name"],
            },
          ],
        },
      ],
      order: [[literal("postCount"), "DESC"]],
      limit: 5,
    });

    // Convert to plain objects and ensure postCount is a number
    return topAuthors.map(author => {
      const plainAuthor = author.get({ plain: true });
      return {
        ...plainAuthor,
        postCount: parseInt(plainAuthor.postCount) || 0,
      };
    });
  } catch (error) {
    console.error("Error fetching top authors:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch top authors",
    });
  }
};
