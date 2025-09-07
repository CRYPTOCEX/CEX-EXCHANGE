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
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
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

  return await updateRecord("post", id, updatedFields);
};
