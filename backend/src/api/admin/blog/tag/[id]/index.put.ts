import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { tagUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific tag",
  operationId: "updateTag",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the tag to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the tag",
    content: {
      "application/json": {
        schema: tagUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Tag"),
  requiresAuth: true,
  permission: "edit.blog.tag",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { name, slug } = body;

  return await updateRecord("tag", id, {
    name,
    slug,
  });
};
