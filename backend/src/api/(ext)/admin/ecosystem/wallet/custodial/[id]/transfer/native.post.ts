// /api/admin/ecosystem/custodialWallets/transferNative.post.ts

import { models } from "@b/db";
import { getCustodialWalletContract } from "@b/api/(ext)/ecosystem/utils/custodialWallet";
import { getProvider } from "@b/api/(ext)/ecosystem/utils/provider";
import { ethers } from "ethers";
import { decrypt } from "@b/utils/encrypt";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata: OperationObject = {
  summary: "Transfer native tokens from Ecosystem Custodial Wallet",
  operationId: "transferNativeEcosystemCustodialWallet",
  tags: ["Admin", "Ecosystem Custodial Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      description: "Ecosystem Custodial Wallet ID",
      required: true,
      schema: {
        type: "string",
      },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            recipient: {
              type: "string",
              description: "Recipient address",
            },
            amount: {
              type: "string",
              description: "Amount to transfer (in wei)",
            },
          },
          required: ["id", "recipient", "amount"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Native tokens transferred successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              transactionHash: {
                type: "string",
                description: "Transaction hash",
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Custodial Wallet"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "access.ecosystem.custodial.wallet",
};

export default async (data: Handler) => {
  const { user, body, params } = data;
  if (!user) {
    throw new Error("Authentication required to transfer native tokens");
  }
  const { id } = params;
  const { recipient, amount } = body;

  try {
    const custodialWallet = await models.ecosystemCustodialWallet.findByPk(id);
    if (!custodialWallet) {
      throw new Error(`Custodial wallet not found`);
    }

    const masterWallet = await models.ecosystemMasterWallet.findByPk(
      custodialWallet.masterWalletId
    );
    if (!masterWallet) {
      throw new Error(`Master wallet not found`);
    }

    if (!masterWallet.data) {
      throw new Error(`Master wallet data not found`);
    }

    const decryptedData = JSON.parse(decrypt(masterWallet.data));
    const { privateKey } = decryptedData;

    const provider = await getProvider(custodialWallet.chain);
    const signer = new ethers.Wallet(privateKey).connect(provider);
    const contract = await getCustodialWalletContract(
      custodialWallet.address,
      signer
    );

    const transaction = await contract.transferNative(recipient, amount);
    await transaction.wait();

    return {
      message: "Native tokens transferred successfully",
    };
  } catch (error) {
    console.error(`Failed to transfer native tokens: ${error.message}`);
    throw new Error(error.message);
  }
};
