import {
  deleteRecordParams,
  deleteRecordResponses,
  handleSingleDelete,
} from "@b/utils/query";

export const metadata = {
  summary: "Deletes a specific Payment Intent",
  operationId: "deletePaymentIntent",
  tags: ["Admin", "Payment"],
  parameters: deleteRecordParams("Payment Intent"),
  responses: deleteRecordResponses("Payment Intent"),
  permission: "delete.payment.intent",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params, query } = data;

  return handleSingleDelete({
    model: "paymentIntent",
    id: params.id,
    query,
  });
};
