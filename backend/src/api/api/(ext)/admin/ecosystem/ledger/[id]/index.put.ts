import { updateRecord, updateRecordResponses } from "@b/utils/query";
import { privateLedgerUpdateSchema } from "../utils";

export const metadata: OperationObject = {
  summary: "Updates a specific private ledger entry",
  operationId: "updateEcosystemPrivateLedger",
  tags: ["Admin", "Ecosystem", "Private Ledgers"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the private ledger to update",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    description: "New data for the private ledger entry",
    content: {
      "application/json": {
        schema: privateLedgerUpdateSchema,
      },
    },
  },
  responses: updateRecordResponses("Private Ledger"),
  requiresAuth: true,
  permission: "edit.ecosystem.private.ledger",
};

export default async (data) => {
  const { body, params } = data;
  const { id } = params;
  const { index, currency, chain, network, offchainDifference } = body;

  return await updateRecord("ecosystemPrivateLedger", id, {
    index,
    currency,
    chain,
    network,
    offchainDifference,
  });
};
