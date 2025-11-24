import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcosystemPrivateLedgerSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary:
    "Retrieves detailed information of a specific ecosystem private ledger entry by ID",
  operationId: "getEcosystemPrivateLedgerById",
  tags: ["Admin", "Ecosystem Private Ledger"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem private ledger entry to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem private ledger entry details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemPrivateLedgerSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Private Ledger"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.private.ledger",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecosystemPrivateLedger", params.id, [
    {
      model: models.wallet,
      as: "wallet",
      attributes: ["currency", "address", "balance"],
    },
  ]);
};
