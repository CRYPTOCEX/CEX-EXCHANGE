import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcosystemPrivateLedgerSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get ecosystem private ledger entry by ID",
  operationId: "getEcosystemPrivateLedgerById",
  tags: ["Admin", "Ecosystem", "Ledger"],
  description:
    "Retrieves detailed information of a specific ecosystem private ledger entry by its unique identifier. Returns the ledger entry with associated wallet information including currency, address, and balance.",
  logModule: "ADMIN_ECO",
  logTitle: "Get private ledger details",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the ecosystem private ledger entry",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description:
        "Successfully retrieved ecosystem private ledger entry with wallet details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemPrivateLedgerSchema,
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
  const { params, ctx } = data;

  ctx?.step("Retrieving private ledger details");
  const ledger = await getRecord("ecosystemPrivateLedger", params.id, [
    {
      model: models.wallet,
      as: "wallet",
      attributes: ["currency", "address", "balance"],
    },
  ]);

  ctx?.success("Private ledger details retrieved");
  return ledger;
};
