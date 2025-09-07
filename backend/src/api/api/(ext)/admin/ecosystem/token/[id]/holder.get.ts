import { createError } from "@b/utils/error";
import { getEcosystemTokenById } from "../utils";
import { fetchTokenHolders } from "@b/api/(ext)/ecosystem/utils/tokens";

export const metadata: OperationObject = {
  summary: "Fetches holders of a specific ecosystem token",
  description:
    "Retrieves a list of all holders of a specified token on a specific chain.",
  operationId: "fetchTokenHolders",
  tags: ["Admin", "Ecosystem", "Token Holders"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      schema: { type: "string", description: "Token identifier" },
    },
  ],
  responses: {
    200: {
      description: "Token holders fetched successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              token: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Token identifier" },
                  name: { type: "string", description: "Token name" },
                  contract: {
                    type: "string",
                    description: "Token contract address",
                  },
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
    404: {
      description: "Token not found",
    },
    500: {
      description: "Internal server error",
    },
  },
  permission: "view.ecosystem.token",
};

export const holdersController = async (data: Handler) => {
  const { user, params } = data;
  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const { id } = params;
    const token = await getEcosystemTokenById(id);
    if (!token) {
      throw new Error(`Token not found for id: ${id}`);
    }

    const holders = await fetchTokenHolders(
      token.chain,
      token.network,
      token.contract
    );

    return {
      token,
      holders,
    };
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch token holders: ${error.message}`,
    });
  }
};
