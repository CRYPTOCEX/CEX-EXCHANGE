import {
  notFoundResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/schema/errors";
import { getBlockchain } from "@b/api/admin/system/utils";

export const metadata = {
  summary: "Get ecosystem blockchain details",
  description:
    "Retrieves detailed information about a specific ecosystem blockchain by its product ID. Returns blockchain metadata including ID, product ID, name, chain identifier, description, link, status, version, and image.",
  operationId: "getEcosystemBlockchainDetails",
  tags: ["Admin", "Ecosystem", "Blockchain"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Product ID of the blockchain to retrieve",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  permission: "view.ecosystem.blockchain",
  logModule: "ADMIN_ECO",
  logTitle: "Get blockchain details",
  responses: {
    200: {
      description: "Blockchain details retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              id: {
                type: "string",
                format: "uuid",
                description: "Unique identifier of the blockchain record",
              },
              productId: {
                type: "string",
                description: "Product ID of the blockchain",
              },
              name: {
                type: "string",
                description: "Name of the blockchain",
              },
              chain: {
                type: "string",
                description: "Chain identifier (e.g., SOL, MO)",
              },
              description: {
                type: "string",
                description: "Blockchain description",
              },
              link: {
                type: "string",
                format: "uri",
                description: "External link for the blockchain",
              },
              status: {
                type: "boolean",
                description: "Whether the blockchain is active",
              },
              version: {
                type: "string",
                description: "Version of the blockchain integration",
              },
              image: {
                type: "string",
                description: "Image path for the blockchain",
              },
            },
            required: ["id", "productId", "name", "status"]
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Blockchain"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
};

export default async (data) => {
  const { params, ctx } = data;

  ctx?.step("Retrieving blockchain details");
  const blockchain = await getBlockchain(params.id);

  ctx?.success("Blockchain details retrieved");
  return blockchain;
};
