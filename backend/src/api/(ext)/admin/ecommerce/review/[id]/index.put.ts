import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { reviewUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific ecommerce review",
  operationId: "updateEcommerceReview",
  tags: ["Admin", "Ecommerce", "Reviews"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecommerce review to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the ecommerce review",
    content: {
      "application/json": {
        schema: reviewUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecommerce Review"),
  requiresAuth: true,
  permission: "edit.ecommerce.review",
  logModule: "ADMIN_ECOM",
  logTitle: "Update E-commerce Review",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { rating, comment, status } = body;

  ctx?.step("Updating E-commerce review");
  const result = await updateRecord("ecommerceReview", id, {
    rating,
    comment,
    status,
  });

  ctx?.success("Successfully updated E-commerce review");
  return result;
};
