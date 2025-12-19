import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { authorUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific author",
  operationId: "updateAuthor",
  tags: ["Admin", "Content", "Author"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the author to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the author",
    content: {
      "application/json": {
        schema: authorUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Author"),
  requiresAuth: true,
  permission: "edit.blog.author",
  logModule: "ADMIN_BLOG",
  logTitle: "Update author",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step("Validating author ID and data");

  ctx?.step("Updating author");
  const result = await updateRecord("author", id, {
    status,
  });

  ctx?.success("Author updated successfully");
  return result;
};
