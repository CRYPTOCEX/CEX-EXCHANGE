import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { privateLedgerUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Update ecosystem private ledger entry",
  operationId: "updateEcosystemPrivateLedger",
  tags: ["Admin", "Ecosystem", "Ledger"],
  description:
    "Updates a specific ecosystem private ledger entry. Allows modification of the ledger index, currency, blockchain chain, network, and offchain balance difference. The ledger tracks discrepancies between onchain and offchain wallet balances.",
  logModule: "ADMIN_ECO",
  logTitle: "Update private ledger",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Unique identifier of the private ledger entry to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description:
      "Updated ledger data including index, currency, chain, network, and offchain difference",
    content: {
      "application/json": {
        schema: privateLedgerUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Ecosystem Private Ledger"),
  requiresAuth: true,
  permission: "edit.ecosystem.private.ledger",
};

export default async (data) => {
  const { body, params, ctx } = data;
  const { id } = params;
  const { index, currency, chain, network, offchainDifference } = body;

  ctx?.step("Updating private ledger entry");
  const result = await updateRecord("ecosystemPrivateLedger", id, {
    index,
    currency,
    chain,
    network,
    offchainDifference,
  });

  ctx?.success("Private ledger updated successfully");
  return result;
};
