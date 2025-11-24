import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { paymentIntentUpdateSchema } from "../utils";

export const metadata = {
  summary: "Updates a specific Payment Intent",
  operationId: "updatePaymentIntent",
  tags: ["Admin", "Payment"],
  parameters: [
    {
      name: "id",
      in: "path",
      description: "ID of the Payment Intent to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the Payment Intent",
    content: {
      "application/json": {
        schema: paymentIntentUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Payment Intent"),
  requiresAuth: true,
  permission: "edit.payment.intent",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const updatedFields = {
    amount: body.amount,
    tax: body.tax,
    discount: body.discount,
    status: body.status,
  };

  return await updateRecord("paymentIntent", id, updatedFields);
};
