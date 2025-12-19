import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { postUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific Post",
  operationId: "updatePost",
  tags: ["Admin", "Post"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Post to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Post",
    required: true,
    content: {
      "application/json": {
        schema: postUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Post"),
  requiresAuth: true,
  permission: "edit.blog.post",
  logModule: "ADMIN_BLOG",
  logTitle: "Update blog post",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;

  ctx?.step("Validating blog post ID and data");

  const updatedFields = {
    title: body.title,
    content: body.content,
    categoryId: body.categoryId,
    authorId: body.authorId,
    slug: body.slug,
    description: body.description,
    status: body.status,
    image: body.image,
  };

  ctx?.step("Updating blog post");
  const result = await updateRecord("post", id, updatedFields);

  ctx?.success("Blog post updated successfully");
  return result;
};
