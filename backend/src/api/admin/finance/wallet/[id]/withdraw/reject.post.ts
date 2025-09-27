import { sendTransactionStatusUpdateEmail } from "@b/utils/emails";
import { createError } from "@b/utils/error";
import { models } from "@b/db";
import {
  notFoundMetadataResponse,
  serverErrorResponse,
  unauthorizedResponse,
} from "@b/utils/query";

// Type definitions
type Transaction = any; // Using any to avoid errors when model doesn't exist
type Wallet = any; // Using any to avoid errors when model doesn't exist

export const metadata = {
  summary: "Rejects a spot wallet withdrawal request",
  operationId: "rejectSpotWalletWithdrawal",
  tags: ["Admin", "Wallets"],
  parameters: [
    {
      index: 0,
      name: "id",
      in: "path",
      required: true,
      description: "ID of the withdrawal transaction to reject",
      schema: { type: "string", format: "uuid" },
    },
  ],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            message: {
              type: "string",
              description: "Reason for rejecting the withdrawal request",
            },
          },
          required: ["message"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Withdrawal request rejected successfully",
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
  const { params, body } = data;

  const { id } = params;
  const { message } = body;
  try {
    const transaction = (await models.transaction.findOne({
      where: { id },
    })) as unknown as transactionAttributes;

    if (!transaction) {
      throw new Error("Transaction not found");
    }

    if (transaction.status !== "PENDING") {
      throw new Error("Transaction is not pending");
    }

    const { walletId } = transaction;

    await models.transaction.update(
      {
        status: "REJECTED",
        metadata: {
          ...transaction.metadata,
          note: message || "Withdrawal request rejected",
        },
      },
      {
        where: {
          id,
        },
      }
    );

    const updatedTransaction = await models.transaction.findOne({
      where: {
        id,
      },
    });

    if (!updatedTransaction) {
      throw new Error("Failed to update transaction status");
    }

    const trx = updatedTransaction.get({ plain: true });

    const updatedWallet = (await updateUserWalletBalance(
      walletId,
      Number(trx.amount),
      Number(trx.fee),
      "REFUND_WITHDRAWAL"
    )) as unknown as walletAttributes;

    try {
      const user = await models.user.findOne({
        where: { id: transaction.userId },
      });

      await sendTransactionStatusUpdateEmail(
        user,
        trx,
        updatedWallet,
        updatedWallet.balance,
        trx.metadata?.note || "Withdrawal request rejected"
      );
    } catch (error) {
      console.error(error);
    }

    return {
      message: "Withdrawal rejected successfully",
    };
  } catch (error) {
    throw new Error(error.message);
  }
};

export async function updateUserWalletBalance(
  id: string,
  amount: number,
  fee: number,
  type: "DEPOSIT" | "WITHDRAWAL" | "REFUND_WITHDRAWAL"
) {
  const wallet = await models.wallet.findOne({
    where: {
      id,
    },
  });

  if (!wallet) {
    return new Error("Wallet not found");
  }

  let balance;
  switch (type) {
    case "WITHDRAWAL":
      balance = wallet.balance - (amount + fee);
      break;
    case "DEPOSIT":
      balance = wallet.balance + (amount - fee);
      break;
    case "REFUND_WITHDRAWAL":
      balance = wallet.balance + amount + fee;
      break;
    default:
      break;
  }

  if (balance < 0) {
    throw new Error("Insufficient balance");
  }

  await models.wallet.update(
    {
      balance: balance,
    },
    {
      where: {
        id: wallet.id,
      },
    }
  );

  const updatedWallet = await models.wallet.findOne({
    where: {
      id: wallet.id,
    },
  });

  if (!updatedWallet) {
    throw createError({
      message: "Failed to update wallet balance",
      statusCode: 500,
    });
  }

  return updatedWallet;
}

// model wallet {
//   id                       String                     @id @unique @default(uuid())
//   userId                  String
//   type                     walletType
//   currency                 String                     @db.VarChar(255)
//   balance                  Float                      @default(0)
//   inOrder                  Float?                     @default(0)

//   status                   Boolean                    @default(true)
//   createdAt               DateTime                   @default(now())
//   updatedAt               DateTime                   @updatedAt
//   user                     user                       @relation(fields: [userId], references: [id], onDelete: Cascade)
//   transactions             transaction[]
//   investment               investment[]
//   walletData              walletData[]
//   ecosystemPrivateLedger ecosystemPrivateLedger[]
//   ecosystemUtxo           ecosystemUtxo[]

//   @@unique([userId, currency, type], name: "walletUserIdCurrencyTypeUnique")
// }

// model transaction {
//   id           String             @id @unique @default(uuid())
//   userId      String
//   walletId    String
//   type         transactionType
//   status       transactionStatus @default(PENDING)
//   amount       Float              @default(0)
//   fee          Float?             @default(0)
//   description  String?            @db.Text
//   metadata     Json?              @db.Json
//   referenceId String?            @unique
//   createdAt   DateTime           @default(now())
//   updatedAt   DateTime?          @updatedAt
//   wallet       wallet             @relation(fields: [walletId], references: [id], onDelete: Cascade)
//   user         user               @relation(fields: [userId], references: [id], onDelete: Cascade)
//   invoice      invoice[]

//   @@index([walletId], map: "transactionWalletIdForeign")
// }
