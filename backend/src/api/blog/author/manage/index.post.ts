// /server/api/blog/posts/create.post.ts
import { slugify } from "@b/utils";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Creates a new blog post",
  description: "This endpoint creates a new blog post.",
  operationId: "createPost",
  tags: ["Content", "Author", "Post"],
  requiresAuth: true,
  requestBody: {
    required: true,
    description: "New blog post data",
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            title: { type: "string", description: "Title of the post" },
            content: { type: "string", description: "Content of the post" },
            description: {
              type: "string",
              description: "Description of the post",
            },
            categoryId: {
              type: "string",
              description: "Category ID for the post",
            },
            status: {
              type: "string",
              description: "Status of the blog post",
              enum: ["PUBLISHED", "DRAFT"],
            },
            tags: {
              type: "array",
              description: "Array of tag objects associated with the post",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                },
                required: ["id"],
              },
            },
            slug: { type: "string", description: "Slug of the post" },
            image: { type: "string", description: "Image URL for the post" },
          },
          required: ["title", "content", "categoryId", "status", "slug"],
        },
      },
    },
  },
  responses: {
    201: {
      description: "Blog post created successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Confirmation message of successful post creation",
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized, user must be authenticated" },
    409: {
      description: "Conflict, post with the same slug already exists",
    },
    500: { description: "Internal server error" },
  },
};

export default async (data) => {
  const { params, body, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { content, tags, categoryId, description, title, status, slug, image } =
    body;

  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  return await sequelize
    .transaction(async (transaction) => {
      // Check if a post with the same slug already exists
      const existingPost = await models.post.findOne({
        where: { slug, authorId: author.id },
        transaction,
      });

      if (existingPost) {
        throw createError({
          statusCode: 409,
          message: "A post with the same slug already exists",
        });
      }

      // Create the new post
      const newPost = await models.post.create(
        {
          title,
          content,
          description,
          status,
          slug,
          authorId: author.id,
          categoryId,
          image,
        },
        { transaction }
      );

      // Add tags if provided
      if (tags) {
        await addTags(newPost, tags, transaction);
      }

      return {
        message: "Post created successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

async function addTags(newPost, tags, transaction) {
  const tagInstances: any[] = [];

  for (const tagItem of tags) {
    if (!tagItem.id) {
      throw createError({
        statusCode: 400,
        message: "Each tag object must have an id property",
      });
    }
    const tag = await models.tag.findByPk(tagItem.id, { transaction });
    if (!tag) {
      throw createError({
        statusCode: 400,
        message: `Tag with id ${tagItem.id} not found`,
      });
    }
    tagInstances.push(tag);
  }

  // Associate the tags with the post
  await models.postTag.bulkCreate(
    tagInstances.map((tag) => ({
      postId: newPost.id,
      tagId: tag.id,
    })),
    { transaction }
  );
}
