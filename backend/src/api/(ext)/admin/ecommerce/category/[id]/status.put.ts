import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an E-commerce Category",
  operationId: "updateEcommerceCategoryStatus",
  tags: ["Admin", "Ecommerce Categories"],
  parameters: [
    {
      index: 0, // This is the index you mentioned
      name: "id",
      in: "path",
      required: true,
      description: "ID of the E-commerce category to update",
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
              type: "boolean",
              description:
                "New status to apply to the E-commerce category (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("E-commerce Category"),
  requiresAuth: true,
  permission: "edit.ecommerce.category",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("ecommerceCategory", id, status);
};
