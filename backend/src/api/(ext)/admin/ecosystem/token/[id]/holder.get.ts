import { createError } from "@b/utils/error";
import { getEcosystemTokenById } from "../utils";
import { fetchTokenHolders } from "@b/api/(ext)/ecosystem/utils/tokens";
import {
  unauthorizedResponse,
  serverErrorResponse,
} from "@b/utils/query";
import { notFoundResponse } from "@b/utils/schema/errors";

export const metadata: OperationObject = {
  summary: "Fetches token holders for an ecosystem token",
  description:
    "Retrieves a list of all holders and their balances for a specific ecosystem token by querying the blockchain. Returns both the token details and the list of holder addresses with their respective balances.",
  operationId: "getEcosystemTokenHolders",
  tags: ["Admin", "Ecosystem", "Token"],
  logModule: "ADMIN_ECO",
  logTitle: "Get token holders",
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "ID of the ecosystem token",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Token holders retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              token: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Token ID" },
                  name: { type: "string", description: "Token name" },
                  contract: {
                    type: "string",
                    description: "Token contract address",
                  },
                  currency: { type: "string", description: "Token currency symbol" },
                  chain: { type: "string", description: "Blockchain chain" },
                },
              },
              holders: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    address: {
                      type: "string",
                      description: "Holder's wallet address",
                    },
                    balance: {
                      type: "string",
                      description: "Amount of tokens held",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundResponse("Ecosystem Token"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.token",
};

export const holdersController = async (data: Handler) => {
  const { user, params, ctx } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { id } = params;
    ctx?.step("Fetching token details");
    const token = await getEcosystemTokenById(id);
    if (!token) {
      throw new Error(`Token not found for id: ${id}`);
    }

    ctx?.step("Fetching token holders");
    const holders = await fetchTokenHolders(
      token.chain,
      token.network,
      token.contract
    );

    ctx?.success(`Retrieved ${holders.length} token holders`);
    return {
      token,
      holders,
    };
  } catch (error) {
    ctx?.fail(error.message);
    throw createError({
      statusCode: 500,
      message: `Failed to fetch token holders: ${error.message}`,
    });
  }
};
