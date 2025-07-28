import { models } from "@b/db";
import { serverErrorResponse } from "@b/utils/query";

export const metadata = {
  summary: "List Payment Methods",
  description:
    "Retrieves a list of available payment methods using the payment methods model.",
  operationId: "listPaymentMethods",
  tags: ["P2P", "Payment Method"],
  responses: {
    200: { description: "Payment methods retrieved successfully." },
    500: serverErrorResponse,
  },
  requiresAuth: false,
};

export default async () => {
  try {
    const methods = await models.p2pPaymentMethod.findAll({
      order: [["popularityRank", "ASC"]],
      raw: true,
    });
    return methods;
  } catch (err: any) {
    throw new Error("Internal Server Error: " + err.message);
  }
};
