// backend/src/api/(ext)/admin/blog/dashboard.get.ts
import { models } from "@b/db";
import { createError } from "@b/utils/error";
import { Op, Sequelize } from "sequelize";

export const metadata = {
  summary: "Get Unified Blog Dashboard Data",
  description:
    "Retrieves aggregated data for the blog admin dashboard including post counts (published/draft), recent posts, author counts (approved/pending) with recent pending applications, total categories, total tags, and overall blog stats, plus top categories and tags.",
  operationId: "getBlogDashboardData",
  tags: ["Blog", "Admin", "Dashboard"],
  requiresAuth: true,
  responses: {
    200: {
      description: "Dashboard data retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              posts: {
                type: "object",
                properties: {
                  publishedCount: { type: "number" },
                  draftCount: { type: "number" },
                  recentPosts: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
              authors: {
                type: "object",
                properties: {
                  approvedCount: { type: "number" },
                  pendingCount: { type: "number" },
                  recentPendingAuthors: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
              categories: {
                type: "object",
                properties: {
                  count: { type: "number" },
                  list: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
              tags: {
                type: "object",
                properties: {
                  count: { type: "number" },
                  list: {
                    type: "array",
                    items: { type: "object" },
                  },
                },
              },
              stats: {
                type: "object",
                properties: {
                  totalPosts: { type: "number" },
                  totalComments: { type: "number" },
                  totalAuthors: { type: "number" },
                  totalReaders: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized" },
    500: { description: "Internal Server Error" },
  },
  permission: "access.blog",
};

export default async (data: { user?: any }) => {
  const { user } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    // 1) Posts: counts & recent
    const publishedCount = await models.post.count({
      where: { status: "PUBLISHED" },
    });
    const draftCount = await models.post.count({ where: { status: "DRAFT" } });
    const recentPosts = await models.post.findAll({
      order: [["createdAt", "DESC"]],
      limit: 5,
      include: [
        {
          model: models.author,
          as: "author",
          include: [
            {
              model: models.user,
              as: "user",
              attributes: ["id", "firstName", "lastName", "email", "avatar"],
            },
          ],
        },
        {
          model: models.category,
          as: "category",
          attributes: ["id", "name", "slug"],
        },
      ],
    });

    // 2) Authors: counts & recent pending
    const approvedCount = await models.author.count({
      where: { status: "APPROVED" },
    });
    const pendingCount = await models.author.count({
      where: { status: "PENDING" },
    });
    const recentPendingAuthors = await models.author.findAll({
      where: { status: "PENDING" },
      order: [["createdAt", "DESC"]],
      limit: 3,
      include: [
        {
          model: models.user,
          as: "user",
          attributes: ["id", "firstName", "lastName", "email", "avatar"],
        },
      ],
    });

    // 3) Categories: total + top 5
    const totalCategories = await models.category.count();
    const topCategories = await models.category.findAll({
      subQuery: false, // <--- IMPORTANT
      attributes: [
        "id",
        "name",
        "slug",
        "description",
        [Sequelize.fn("COUNT", Sequelize.col("posts.id")), "postCount"],
      ],
      include: [
        {
          model: models.post,
          as: "posts", // Must match your association alias
          attributes: [],
          required: false,
        },
      ],
      group: ["category.id"],
      order: [[Sequelize.fn("COUNT", Sequelize.col("posts.id")), "DESC"]],
      limit: 5,
    });

    // 4) Tags: total + top 10 by post count
    const totalTags = await models.tag.count();
    const topTags = await models.tag.findAll({
      subQuery: false,
      attributes: [
        "id",
        "name",
        "slug",
        [Sequelize.fn("COUNT", Sequelize.col("posts.id")), "postCount"],
      ],
      include: [
        {
          model: models.post,
          as: "posts",
          attributes: [],
          through: { attributes: [] },
          required: false,
        },
      ],
      group: ["tag.id"],
      order: [[Sequelize.fn("COUNT", Sequelize.col("posts.id")), "DESC"]],
      limit: 10,
    });

    // 5) Overall stats
    const totalComments = await models.comment.count();
    const totalReaders = 0; // or however you track readers
    const stats = {
      totalPosts: publishedCount,
      totalComments,
      totalAuthors: approvedCount,
      totalReaders,
    };

    return {
      posts: {
        publishedCount,
        draftCount,
        recentPosts: recentPosts.map((post) => post.toJSON()),
      },
      authors: {
        approvedCount,
        pendingCount,
        recentPendingAuthors: recentPendingAuthors.map((author) => author.toJSON()),
      },
      categories: {
        count: totalCategories,
        list: topCategories.map((c) => c.toJSON()),
      },
      tags: {
        count: totalTags,
        list: topTags.map((t) => t.toJSON()),
      },
      stats,
    };
  } catch (error) {
    console.error("Error fetching dashboard data:", error);
    throw createError({
      statusCode: 500,
      message: "Failed to fetch dashboard data",
    });
  }
};
