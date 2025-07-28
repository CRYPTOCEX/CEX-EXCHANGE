// /server/api/blog/posts/update.put.ts
import { slugify } from "@b/utils";
import { models, sequelize } from "@b/db";
import { createError } from "@b/utils/error";

export const metadata: OperationObject = {
  summary: "Updates a blog post identified by id",
  description: "This endpoint updates an existing blog post.",
  operationId: "updatePost",
  tags: ["Content", "Author", "Post"],
  requiresAuth: true,
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "The id of the blog post to update",
      required: true,
      schema: {
        type: "string",
        description: "Post id",
      },
    },
  ],
  requestBody: {
    required: true,
    description: "Updated blog post data",
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
              description: "New status of the blog post",
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
            image: { type: "string", description: "Image URL for the post" },
          },
          required: ["title", "content", "categoryId", "status"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Blog post updated successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: {
                type: "string",
                description: "Confirmation message of successful post update",
              },
            },
          },
        },
      },
    },
    401: { description: "Unauthorized, user must be authenticated" },
    404: { description: "Blog post not found" },
    500: { description: "Internal server error" },
  },
};

export default async (data) => {
  const { params, body, user } = data;
  if (!user?.id)
    throw createError({ statusCode: 401, message: "Unauthorized" });

  const { id } = params;
  const { content, tags, categoryId, description, title, status, image } = body;

  const author = await models.author.findOne({
    where: { userId: user.id },
  });

  if (!author)
    throw createError({ statusCode: 404, message: "Author not found" });

  return await sequelize
    .transaction(async (transaction) => {
      // Check if the post exists
      const existingPost = await models.post.findOne({
        where: { id, authorId: author.id },
        include: [{ model: models.postTag, as: "postTags" }],
        transaction,
      });

      if (!existingPost)
        throw new Error(
          "Post not found or you don't have permission to edit it."
        );

      // Update the post fields
      existingPost.title = title;
      existingPost.content = content;
      existingPost.description = description;
      existingPost.status = status;
      existingPost.image = image;

      // Save the post
      await existingPost.save();

      // Update the category if provided
      if (categoryId) {
        const category = await models.category.findByPk(categoryId, {
          transaction,
        });
        if (!category)
          throw new Error("Category not found with the provided ID");
        await existingPost.setCategory(category, { transaction });
      }

      // Update tags if provided
      if (tags) {
        await updateTags(existingPost, tags, transaction);
      }

      return {
        message: "Post updated successfully",
      };
    })
    .catch((error) => {
      throw error;
    });
};

async function updateTags(existingPost, tags, transaction) {
  // Remove existing tags
  await models.postTag.destroy({
    where: { postId: existingPost.id },
    transaction,
  });

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
      postId: existingPost.id,
      tagId: tag.id,
    })),
    { transaction }
  );
}
