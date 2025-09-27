import { models } from "@b/db";

import { crudParameters, paginationSchema } from "@b/utils/constants";
import {
  getFiltered,
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";
import { ecosystemMasterWalletSchema, getEcosystemMasterWalletBalance } from "./utils";

export const metadata: OperationObject = {
  summary:
    "Lists all ecosystem master wallets with pagination, optional filtering, and real-time balances",
  operationId: "listEcosystemMasterWallets",
  tags: ["Admin", "Ecosystem", "Master Wallets"],
  parameters: crudParameters,
  responses: {
    200: {
      description:
        "List of ecosystem master wallets with optional details on custodial wallets and updated balances",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              data: {
                type: "array",
                items: {
                  type: "object",
                  properties: ecosystemMasterWalletSchema,
                },
              },
              pagination: paginationSchema,
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Ecosystem Master Wallets"),
    500: serverErrorResponse,
  },
  requiresAuth: true,
  permission: "view.ecosystem.master.wallet",
};

export default async (data: Handler) => {
  const { query } = data;

  // Fetch wallets with pagination and filtering
  const result = await getFiltered({
    model: models.ecosystemMasterWallet,
    query,
    sortField: query.sortField || "chain",
    timestamps: false,
    includeModels: [
      {
        model: models.ecosystemCustodialWallet,
        as: "ecosystemCustodialWallets",
        attributes: ["id", "address", "status"],
      },
    ],
  });

  // Update balances in parallel with timeout and error handling
  if (result.items && result.items.length > 0) {
    // Create balance update promises with timeout
    const balanceUpdatePromises = result.items.map(async (walletItem, index) => {
      // Set a timeout for each wallet balance update (3 seconds max)
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Balance fetch timeout')), 3000)
      );
      
      const updatePromise = (async () => {
        try {
          // Handle both plain objects and Sequelize models
          const wallet = (typeof walletItem.get === 'function' 
            ? walletItem.get({ plain: true }) 
            : walletItem) as ecosystemMasterWalletAttributes;
          
          // Only fetch balance, don't wait for database update
          await getEcosystemMasterWalletBalance(wallet);
          
          // Quick refresh without waiting for all includes
          const updatedWallet = await models.ecosystemMasterWallet.findByPk(
            wallet.id,
            { 
              attributes: ['id', 'chain', 'currency', 'address', 'balance', 'status', 'lastIndex'],
              raw: true 
            }
          );
          
          if (updatedWallet) {
            // Merge updated balance with existing data
            if (typeof walletItem.get === 'function') {
              walletItem.set('balance', updatedWallet.balance);
            } else {
              // For plain objects, directly set the balance
              (walletItem as any).balance = updatedWallet.balance;
            }
          }
        } catch (error) {
          // Log error but don't throw - let other wallets continue
          console.error(
            `Balance update skipped for wallet ${index}: ${error.message?.substring(0, 50)}`
          );
        }
      })();
      
      // Race between update and timeout
      return Promise.race([updatePromise, timeoutPromise]).catch(err => {
        console.error(`Wallet ${index} update failed or timed out:`, err.message?.substring(0, 50));
        // Don't throw, just log and continue
      });
    });

    // Wait for all updates to complete or timeout (but don't fail the request)
    await Promise.allSettled(balanceUpdatePromises);
  }

  return result;
};
