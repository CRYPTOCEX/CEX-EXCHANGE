import { updateRecordResponses, updateStatus } from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Bulk updates the status of ecommerce reviews",
  operationId: "bulkUpdateEcommerceReviewStatus",
  tags: ["Admin", "Ecommerce Reviews"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            ids: {
              type: "array",
              description: "Array of ecommerce review IDs to update",
              items: { type: "string" },
            },
            status: {
              type: "boolean",
              description:
                "New status to apply to the ecommerce reviews (true for active, false for inactive)",
            },
          },
          required: ["ids", "status"],
        },
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Review"),
  requiresAuth: true,
  permission: "edit.ecommerce.review",
  logModule: "ADMIN_ECOM",
  logTitle: "Bulk Update E-commerce Review Status",
};

export default async (data: Handler) => {
  const { body, ctx } = data;
  const { ids, status } = body;

  ctx?.step("Updating E-commerce review status");
  const result = await updateStatus("ecommerceReview", ids, status);

  ctx?.success("Successfully updated E-commerce review status");
  return result;
};
