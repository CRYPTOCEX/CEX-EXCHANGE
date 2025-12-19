import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of a page",
  operationId: "updatePageStatus",
  tags: ["Admin", "Content", "Page"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the page to update",
      schema: { type: "string" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            status: {
              type: "string",
              description: "New status to apply",
              enum: ["PUBLISHED", "DRAFT"],
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Page"),
  requiresAuth: true,
  permission: "edit.page",
  logModule: "ADMIN_CMS",
  logTitle: "Update page status",
};

export default async (data: Handler) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { status } = body;

  ctx?.step(`Updating page status to ${status}`);
  const result = await updateStatus("page", id, status);

  ctx?.success("Page status updated successfully");
  return result;
};
