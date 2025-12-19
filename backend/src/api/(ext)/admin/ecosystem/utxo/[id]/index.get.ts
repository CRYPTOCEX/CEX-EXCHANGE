import {
  getRecord,
  unauthorizedResponse,
  notFoundMetadataResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { baseEcosystemUtxoSchema } from "../utils";
import { models } from "@b/db";

export const metadata: OperationObject = {
  summary: "Get ecosystem UTXO by ID",
  operationId: "getEcosystemUtxoById",
  tags: ["Admin", "Ecosystem", "UTXO"],
  description:
    "Retrieves detailed information of a specific ecosystem Unspent Transaction Output (UTXO) by its unique identifier. Returns the UTXO with all details including transaction ID, index, amount, script, status, and associated wallet currency information.",
  logModule: "ADMIN_ECO",
  logTitle: "Get UTXO details",
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "Unique identifier of the ecosystem UTXO to retrieve",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description:
        "Successfully retrieved ecosystem UTXO with wallet currency information",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: baseEcosystemUtxoSchema,
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
  demoMask: ["transactionId", "script"],
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Retrieving UTXO details");
  const utxo = await getRecord("ecosystemUtxo", params.id, [
    {
      model: models.wallet,
      as: "wallet",
      attributes: ["currency"],
    },
  ]);

  ctx?.success("UTXO details retrieved");
  return utxo;
};
