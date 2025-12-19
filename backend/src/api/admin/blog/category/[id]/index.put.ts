import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { categoryUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific category",
  operationId: "updateCategory",
  tags: ["Admin", "Content", "Category"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the category to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the category",
    content: {
      "application/json": {
        schema: categoryUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Category"),
  requiresAuth: true,
  permission: "edit.blog.category",
  logModule: "ADMIN_BLOG",
  logTitle: "Update category",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { name, slug, image, description } = body;

  ctx?.step("Validating category ID and data");

  ctx?.step("Updating category");
  const result = await updateRecord("category", id, {
    name,
    slug,
    image,
    description,
  });

  ctx?.success("Category updated successfully");
  return result;
};
