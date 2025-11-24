import { models } from "@b/db";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { crudParameters } from "@b/utils/constants";
import { fn, literal } from "sequelize";

export const metadata = {
  summary: "Lists ICO offerings with computed currentRaised",
  operationId: "listIcoTransactions",
  tags: ["User", "Ico", "Transaction"],
  parameters: crudParameters,
  responses: {
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Transactions"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ico.offer",
};

export default async (data: Handler) => {
  const { user, query } = data;
  if (!user) {
    throw new Error("Unauthorized");
  }

  return getFiltered({
    model: models.icoTokenOffering,
    query,
    sortField: query.sortField || "createdAt",
    compute: [
      [
        literal(`(
          SELECT COALESCE(SUM(t.price * t.amount), 0)
          FROM ico_transaction t
          WHERE t.offeringId = icoTokenOffering.id
            AND t.status IN ('PENDING', 'RELEASED')
        )`),
        "currentRaised",
      ],
    ],
  });
};
