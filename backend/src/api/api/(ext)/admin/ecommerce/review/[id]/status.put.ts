import { updateStatus, updateRecordResponses } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Updates the status of an E-commerce Review",
  operationId: "updateEcommerceReviewStatus",
  tags: ["Admin", "Ecommerce Reviews"],
  parameters: [
    {
      index: 0, // Ensuring the parameter index is specified as requested
      name: "id",
      in: "path",
      required: true,
      description: "ID of the E-commerce review to update",
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
                "New status to apply to the E-commerce review (true for active, false for inactive)",
            },
          },
          required: ["status"],
        },
      },
    },
  },
  responses: updateRecordResponses("E-commerce Review"),
  requiresAuth: true,
  permission: "edit.ecommerce.review",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { status } = body;
  return updateStatus("ecommerceReview", id, status);
};
