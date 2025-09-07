import { userInclude } from "@b/api/auth/utils";
import { sendSpotWalletWithdrawalConfirmationEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import ExchangeManager from "@b/utils/exchange";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

export const metadata = {
  summary: "Approves a spot wallet withdrawal request",
  operationId: "approveSpotWalletWithdrawal",
  tags: ["Admin", "Wallets"],
  parameters: [
    {
      name: "id",
      in: "path",
      required: true,
      description: "The ID of the wallet withdrawal to approve",
      schema: { type: "string", format: "uuid" },
    },
  ],
  responses: {
    200: {
      description: "Withdrawal request approved successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
            },
          },
        },
      },
    },
    401: unauthorizedResponse,
    404: notFoundMetadataResponse("Wallet"),
    500: serverErrorResponse,
  },
  permission: "edit.wallet",
  requiresAuth: true,
};

export default async (data: Handler) => {
  const { params } = data;
  const { id } = params;
  try {
    const transaction = await models.transaction.findOne({
      where: { id },
    });

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "PENDING") {
      throw new Error("Transaction is not pending");
    }

    const { amount, userId } = transaction;
    const { currency, chain, address, memo } = transaction.metadata as any;

    // Fetch the user's wallet
    const wallet = (await getWalletQuery(
      userId,
      currency
    )) as unknown as walletAttributes;
    if (!wallet) {
      throw new Error("Wallet not found");
    }

    const currencyData = await getCurrency(currency);
    if (!currencyData) {
      throw new Error("Currency not found");
    }

    const fee =
      currencyData.chains?.find((c) => c.network === chain)?.withdrawFee || 0;

    const withdrawAmount = Number(amount) + Number(fee);

    if (withdrawAmount > wallet.balance) {
      throw new Error(
        "Your withdraw amount including fee is higher than your balance"
      );
    }

    // Initialize exchange
    const exchange = await (ExchangeManager as any).startExchange();
    const provider = await (ExchangeManager as any).provider;

    // Implement your third-party API logic here
    let withdrawResponse, withdrawStatus;
    switch (provider) {
      case "kucoin":
        try {
          const chainId = mapChainNameToChainId(chain);
          const transferProcess = await exchange.transfer(
            currency,
            withdrawAmount,
            "main",
            "trade"
          );
          if (transferProcess.id) {
            try {
              withdrawResponse = await exchange.withdraw(
                currency,
                withdrawAmount,
                address,
                memo,
                { chain: chainId }
              );

              if (withdrawResponse.id) {
                try {
                  const withdrawals = await exchange.fetchWithdrawals(currency);
                  const withdrawData = withdrawals.find(
                    (w) => w.id === withdrawResponse.id
                  );
                  if (withdrawData) {
                    withdrawResponse.fee =
                      withdrawAmount * fee + withdrawData.fee?.cost;
                    switch (withdrawData.status) {
                      case "completed":
                      case "ok":
                        withdrawStatus = "COMPLETED";
                        break;
                      case "cancelled":
                      case "canceled":
                        withdrawStatus = "CANCELLED";
                        break;
                      case "failed":
                        withdrawStatus = "FAILED";
                        break;
                      default:
                        withdrawStatus = "PENDING";
                        break;
                    }
                  }
                } catch (error) {
                  withdrawResponse.fee = fee;
                }
              }
            } catch (error) {
              console.error(`Withdrawal failed: ${error.message}`);
              throw new Error(`Withdrawal failed: ${error.message}`);
            }
          }
        } catch (error) {
          console.error(`Transfer failed: ${error.message}`);
          throw new Error(`Transfer failed: ${error.message}`);
        }
        break;
      case "binance":
      case "okx":
        try {
          withdrawResponse = await exchange.withdraw(
            currency,
            withdrawAmount,
            address,
            memo,
            { network: chain }
          );

          withdrawResponse.fee = Number(withdrawResponse.fee) || fee;
          switch (withdrawResponse.status) {
            case "completed":
            case "ok":
              withdrawStatus = "COMPLETED";
              break;
            case "canceled":
              withdrawStatus = "CANCELLED";
              break;
            case "failed":
              withdrawStatus = "FAILED";
              break;
            default:
              withdrawStatus = "PENDING";
              break;
          }
        } catch (error) {
          console.error(`Withdrawal failed: ${error.message}`);
          throw new Error(`Withdrawal failed: ${error.message}`);
        }
        break;
      // other providers
      default:
        break;
    }

    if (
      !withdrawResponse ||
      !withdrawResponse.id ||
      !withdrawStatus ||
      withdrawStatus === "FAILED" ||
      withdrawStatus === "CANCELLED"
    ) {
      throw new Error("Withdrawal failed");
    }

    await models.transaction.update(
      {
        status: withdrawStatus,
        referenceId: withdrawResponse.id,
      },
      {
        where: { id },
      }
    );

    const updatedTransaction = await models.transaction.findOne({
      where: { id },
    });

    if (!updatedTransaction) {
      throw createError(500, "Transaction not found");
    }

    try {
      const userData = (await getUserById(userId)) as unknown as userAttributes;
      sendSpotWalletWithdrawalConfirmationEmail(
        userData,
        updatedTransaction.get({ plain: true }) as transactionAttributes,
        wallet
      );
    } catch (error) {
      console.error(`Withdrawal confirmation email failed: ${error.message}`);
    }

    return {
      message: "Withdrawal approved successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function getWalletQuery(userId: string, currency: string) {
  const wallet = await models.wallet.findOne({
    where: {
      userId,
      currency,
      type: "SPOT",
    },
    include: [
      {
        model: models.transaction, // Assuming 'transaction' is the model name you've used in associations
        as: "transactions", // This should match the alias used in the association if there's one. Omit if no alias is defined.
        order: [["createdAt", "DESC"]],
      },
    ],
  });

  if (!wallet) {
    throw createError(404, "Wallet not found");
  }

  return wallet.get({ plain: true });
}

export async function getCurrency(symbol: string): Promise<any> {
  const currency = await models.exchangeCurrency.findOne({
    where: {
      currency: symbol,
    },
  });

  if (!currency) {
    throw new Error("Currency details not found");
  }
  return currency.get({ plain: true });
}

export function mapChainNameToChainId(chainName) {
  const chainMap = {
    BEP20: "bsc",
    BEP2: "bnb",
    ERC20: "eth",
    TRC20: "trx",
  };

  return chainMap[chainName] || chainName;
}

// Get user by ID
export const getUserById = async (id: string) => {
  const user = await models.user.findOne({
    where: { id },
    include: userInclude,
  });
  if (!user) throw new Error("User not found");

  return {
    ...user.get({ plain: true }),
    password: undefined,
  };
};
