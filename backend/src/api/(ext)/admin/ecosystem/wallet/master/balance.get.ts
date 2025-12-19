import { createError } from "@b/utils/error";
import { unauthorizedResponse, serverErrorResponse } from "@b/utils/schema/errors";
import { getAllMasterWallets, updateMasterWalletBalance } from "./utils";
import { RedisSingleton } from "@b/utils/redis";
import { differenceInMinutes } from "date-fns";
import { fetchUTXOWalletBalance } from "@b/api/(ext)/ecosystem/utils/utxo";
import { getProvider } from "@b/api/(ext)/ecosystem/utils/provider";
import { chainConfigs } from "@b/api/(ext)/ecosystem/utils/chains";
import { ethers } from "ethers";

export const metadata: OperationObject = {
  summary: "Update and get all master wallet balances",
  description: "Fetches current balances from the blockchain for all master wallets and updates the database. Includes caching mechanism to prevent excessive blockchain queries. Supports UTXO-based chains (BTC, LTC, DOGE, DASH) and account-based chains (ETH, BSC, etc.).",
  operationId: "updateMasterWalletBalances",
  tags: ["Admin", "Ecosystem", "Wallet"],
  responses: {
    200: {
      description: "Master wallets updated and retrieved successfully",
      content: {
        "application/json": {
          schema: {
            type: "array",
            items: {
              type: "object",
              properties: {
                walletId: { type: "string", description: "Wallet identifier" },
                currency: {
                  type: "string",
                  description: "Currency of the wallet",
                },
                balance: {
                  type: "number",
                  description: "Current balance of the wallet",
                },
                updatedAt: {
                  type: "string",
                  format: "date-time",
                  description: "Last updated timestamp of the wallet balance",
                },
              },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    500: serverErrorResponse,
  },
  permission: "view.ecosystem.master.wallet",
};

export const getMasterWalletBalancesController = async (data: Handler) => {
  const { user, ctx } = data;

  ctx?.step("Updating and fetching master wallet balances");

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized" });
  }

  try {
    const wallets = await getAllMasterWallets(ctx);
    await Promise.all(
      wallets.map((wallet: ecosystemMasterWalletAttributes) =>
        getWalletBalance(wallet)
      )
    );
    return wallets;
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Failed to fetch master wallets: ${error.message}`,
    });
  }
};

const getWalletBalance = async (
  wallet: ecosystemMasterWalletAttributes
): Promise<void> => {
  try {
    const cacheKey = `wallet:${wallet.id}:balance`;
    const redis = RedisSingleton.getInstance();
    let cachedBalanceData: any = await redis.get(cacheKey);

    if (cachedBalanceData) {
      if (typeof cachedBalanceData !== "object") {
        cachedBalanceData = JSON.parse(cachedBalanceData);
      }

      const now = new Date();
      const lastUpdated = new Date(cachedBalanceData.timestamp);

      if (
        differenceInMinutes(now, lastUpdated) < 5 &&
        parseFloat(cachedBalanceData.balance) !== 0
      ) {
        return;
      }
    }

    let formattedBalance;
    if (["BTC", "LTC", "DOGE", "DASH"].includes(wallet.chain)) {
      formattedBalance = await fetchUTXOWalletBalance(
        wallet.chain,
        wallet.address
      );
    } else {
      const provider = await getProvider(wallet.chain);

      const balance = await provider.getBalance(wallet.address);

      const decimals = chainConfigs[wallet.chain].decimals;
      formattedBalance = ethers.formatUnits(balance.toString(), decimals);
    }

    if (!formattedBalance || isNaN(parseFloat(formattedBalance))) {
      console.error(
        `Invalid formatted balance for ${wallet.chain} wallet: ${formattedBalance}`
      );
      return;
    }

    if (parseFloat(formattedBalance) === 0) {
      return;
    }

    await updateMasterWalletBalance(wallet.id, parseFloat(formattedBalance));

    const cacheData = {
      balance: formattedBalance,
      timestamp: new Date().toISOString(),
    };

    await redis.setex(cacheKey, 300, JSON.stringify(cacheData));
  } catch (error) {
    console.error(
      `Failed to fetch ${wallet.chain} wallet balance: ${error.message}`
    );
  }
};
