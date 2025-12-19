import { models } from "@b/db";

/**
 * LogContext interface for operation logging
 */
export interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

/**
 * Updates spot wallet balance based on deposit, withdrawal, or refund
 * @param userId - User ID
 * @param currency - Currency code
 * @param amount - Transaction amount
 * @param fee - Transaction fee
 * @param type - Transaction type (DEPOSIT, WITHDRAWAL, REFUND_WITHDRAWAL)
 * @param ctx - Optional logging context
 * @returns Updated wallet object or Error
 */
export async function updateSpotWalletBalance(
  userId: string,
  currency: string,
  amount: number,
  fee: number,
  type: "DEPOSIT" | "WITHDRAWAL" | "REFUND_WITHDRAWAL",
  ctx?: LogContext
) {
  try {
    ctx?.step?.(`Finding wallet for user ${userId}, currency ${currency}`);

    const wallet = await models.wallet.findOne({
      where: { userId: userId, currency: currency, type: "SPOT" },
    });

    if (!wallet) {
      const errorMsg = "Wallet not found";
      ctx?.fail?.(errorMsg);
      return new Error(errorMsg);
    }

    ctx?.step?.(`Calculating new balance for ${type} operation`);

    let balance;
    switch (type) {
      case "WITHDRAWAL":
        balance = wallet.balance - (amount + fee);
        ctx?.step?.(`Withdrawal: ${wallet.balance} - (${amount} + ${fee}) = ${balance}`);
        break;
      case "DEPOSIT":
        balance = wallet.balance + (amount - fee);
        ctx?.step?.(`Deposit: ${wallet.balance} + (${amount} - ${fee}) = ${balance}`);
        break;
      case "REFUND_WITHDRAWAL":
        balance = wallet.balance + amount + fee;
        ctx?.step?.(`Refund: ${wallet.balance} + ${amount} + ${fee} = ${balance}`);
        break;
      default:
        break;
    }

    if (balance < 0) {
      const errorMsg = "Insufficient balance";
      ctx?.fail?.(errorMsg);
      throw new Error(errorMsg);
    }

    ctx?.step?.(`Updating wallet balance to ${balance}`);

    await models.wallet.update(
      { balance: balance },
      { where: { id: wallet.id } }
    );

    const updatedWallet = await models.wallet.findByPk(wallet.id);

    if (!updatedWallet) {
      const errorMsg = "Wallet not found after update";
      ctx?.fail?.(errorMsg);
      throw new Error(errorMsg);
    }

    ctx?.success?.(`Successfully updated wallet balance to ${balance} ${currency}`);

    return updatedWallet.get({ plain: true });
  } catch (error: any) {
    ctx?.fail?.(error.message);
    throw error;
  }
}
