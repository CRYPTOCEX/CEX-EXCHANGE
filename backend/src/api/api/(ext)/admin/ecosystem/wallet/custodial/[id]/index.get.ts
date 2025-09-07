// /api/admin/ecosystem/custodialWallets/view.get.ts

import { getProvider } from "@b/api/(ext)/ecosystem/utils/provider";
import { getSmartContract } from "@b/api/(ext)/ecosystem/utils/smartContract";
import { models } from "@b/db";
import { notFoundMetadataResponse, serverErrorResponse } from "@b/utils/query";
import { ethers } from "ethers";

export const metadata: OperationObject = {
  summary: "View Ecosystem Custodial Wallet Balances and Tokens",
  operationId: "viewEcosystemCustodialWallet",
  tags: ["Admin", "Ecosystem Custodial Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "ID of the ecosystem custodial wallet",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  responses: {
    200: {
      description:
        "Ecosystem custodial wallet balances and tokens retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              nativeBalance: {
                type: "string",
                description: "Native token balance",
              },
              tokenBalances: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    tokenAddress: {
                      type: "string",
                      description: "Token contract address",
                    },
                    name: {
                      type: "string",
                      description: "Token name",
                    },
                    currency: {
                      type: "string",
                      description: "Token currency",
                    },
                    icon: {
                      type: "string",
                      description: "Token icon URL",
                    },
                    balance: {
                      type: "string",
                      description: "Token balance",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    404: notFoundMetadataResponse("Custodial Wallet"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.custodial.wallet",
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;

  try {
    const custodialWallet = await models.ecosystemCustodialWallet.findByPk(id);
    if (!custodialWallet) {
      throw new Error(`Custodial wallet not found`);
    }

    const provider = await getProvider(custodialWallet.chain);
    if (!provider) {
      throw new Error("Provider not initialized");
    }

    const { abi } = await getSmartContract("wallet", "CustodialWalletERC20");
    if (!abi) {
      throw new Error("Smart contract ABI not found");
    }

    const contract = new ethers.Contract(
      custodialWallet.address,
      abi,
      provider
    );

    let nativeBalance;
    try {
      nativeBalance = await contract.getNativeBalance();
      if (nativeBalance === undefined) {
        nativeBalance = ethers.parseUnits("0", 18);
      }
    } catch (error) {
      console.error("Error fetching native balance:", error);
      nativeBalance = ethers.parseUnits("0", 18); // Default to zero if fetching fails
    }

    const tokens = await models.ecosystemToken.findAll({
      where: { chain: custodialWallet.chain, status: true },
      attributes: ["contract", "decimals", "name", "currency", "icon"],
    });

    const tokenAddresses = tokens.map((token) => token.contract);
    let tokenBalancesRaw;
    try {
      tokenBalancesRaw = await contract.getAllBalances(tokenAddresses);
      if (!tokenBalancesRaw || tokenBalancesRaw.length === 0) {
        tokenBalancesRaw = [
          nativeBalance,
          Array(tokenAddresses.length).fill(ethers.parseUnits("0", 18)),
        ];
      }
    } catch (callError) {
      console.error("Contract call error:", callError);
      tokenBalancesRaw = [
        nativeBalance,
        Array(tokenAddresses.length).fill(ethers.parseUnits("0", 18)),
      ]; // Default to zero balances if fetching fails
    }

    const tokenBalances = tokenBalancesRaw[1].map((balance, index) => ({
      tokenAddress: tokenAddresses[index],
      name: tokens[index].name,
      currency: tokens[index].currency,
      icon: tokens[index].icon,
      balance: ethers.formatUnits(balance, tokens[index].decimals),
    }));

    return {
      nativeBalance: ethers.formatEther(nativeBalance),
      tokenBalances,
    };
  } catch (error) {
    console.error(
      `Failed to retrieve custodial wallet balances and tokens: ${error.message}`
    );
    throw new Error(error.message);
  }
};
