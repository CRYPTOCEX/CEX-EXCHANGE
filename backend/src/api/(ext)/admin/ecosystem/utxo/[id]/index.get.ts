import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcosystemUtxoSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Retrieves detailed information of a specific ecosystem UTXO by ID",
  operationId: "getEcosystemUtxoById",
  tags: ["Admin", "Ecosystem UTXOs"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem UTXO to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Ecosystem UTXO details",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemUtxoSchema, // Define this schema in your utils if it's not already defined
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem UTXO"),
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.utxo",
  requiresAuth: true,
};

export default async (data) => {
  const { params } = data;

  return await getRecord("ecosystemUtxo", params.id, [
    {
      model: models.wallet,
      as: "wallet",
      attributes: ["currency"],
    },
  ]);
};
