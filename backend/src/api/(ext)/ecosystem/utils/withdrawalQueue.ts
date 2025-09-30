import { models } from "@b/db";
import { handleUTXOWithdrawal } from "@b/api/(ext)/ecosystem/utils/utxo";
import { createNotification } from "@b/utils/notifications";
import { getSolanaService, getTronService, getMoneroService, getTonService } from "@b/utils/safe-imports";
import { refundUser } from "@b/api/(ext)/ecosystem/utils/wallet";
import { emailQueue } from "@b/utils/emails";
import { handleEvmWithdrawal } from "./withdraw";

class WithdrawalQueue {
  private static instance: WithdrawalQueue;
  private queue: string[] = [];
  private isProcessing: boolean = false;
  private processingTransactions: Set<string> = new Set();

  private constructor() {}

  public static getInstance(): WithdrawalQueue {
    if (!WithdrawalQueue.instance) {
      WithdrawalQueue.instance = new WithdrawalQueue();
    }
    return WithdrawalQueue.instance;
  }

  public addTransaction(transactionId: string) {
    console.log(`[WITHDRAWAL_QUEUE] Adding transaction to queue: ${transactionId}`);
    if (this.processingTransactions.has(transactionId)) {
      // Transaction is already being processed
      console.log(`[WITHDRAWAL_QUEUE] Transaction ${transactionId} already processing`);
      return;
    }
    if (!this.queue.includes(transactionId)) {
      this.queue.push(transactionId);
      console.log(`[WITHDRAWAL_QUEUE] Queue size: ${this.queue.length}`);
      this.processNext();
    }
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      if (this.isProcessing) {
        console.log(`[WITHDRAWAL_QUEUE] Already processing, skipping`);
      }
      return;
    }

    this.isProcessing = true;
    const transactionId = this.queue.shift();
    console.log(`[WITHDRAWAL_QUEUE] Processing transaction: ${transactionId}`);

    if (transactionId) {
      try {
        this.processingTransactions.add(transactionId);

        // Fetch the transaction from the database
        const transaction = await models.transaction.findOne({
          where: { id: transactionId },
          include: [
            {
              model: models.wallet,
              as: "wallet",
              where: { type: "ECO" },
            },
          ],
        });

        if (!transaction) {
          console.error(`[WITHDRAWAL_QUEUE] Transaction ${transactionId} not found.`);
          throw new Error("Transaction not found");
        }

        console.log(`[WITHDRAWAL_QUEUE] Transaction found:`, {
          id: transaction.id,
          type: transaction.type,
          status: transaction.status,
          amount: transaction.amount
        });

        if (!transaction.wallet) {
          console.error(`[WITHDRAWAL_QUEUE] Wallet not found for transaction ${transactionId}`);
          throw new Error("Wallet not found for transaction");
        }

        // Update transaction status to 'PROCESSING' to prevent duplicate processing
        console.log(`[WITHDRAWAL_QUEUE] Updating transaction status to PROCESSING`);
        const [updatedCount] = await models.transaction.update(
          { status: "PROCESSING" },
          { where: { id: transactionId, status: "PENDING" } }
        );

        if (updatedCount === 0) {
          console.error(`[WITHDRAWAL_QUEUE] Transaction ${transactionId} already processed or in process`);
          throw new Error("Transaction already processed or in process");
        }

        const metadata =
          typeof transaction.metadata === "string"
            ? JSON.parse(transaction.metadata)
            : transaction.metadata;

        console.log(`[WITHDRAWAL_QUEUE] Transaction metadata:`, metadata);

        if (!metadata || !metadata.chain) {
          console.error(`[WITHDRAWAL_QUEUE] Invalid metadata:`, metadata);
          throw new Error("Invalid or missing chain in transaction metadata");
        }

        // Process withdrawal based on the blockchain chain type
        console.log(`[WITHDRAWAL_QUEUE] Processing withdrawal for chain: ${metadata.chain}`);
        await this.processWithdrawal(transaction, metadata);

        // Send email to the user
        await this.sendWithdrawalConfirmationEmail(transaction, metadata);

        // Record admin profit if a fee is associated with the transaction
        await this.recordAdminProfit(transaction, metadata);
      } catch (error) {
        console.error(
          `[WITHDRAWAL_QUEUE] Failed to process transaction ${transactionId}: ${error.message}`,
          error
        );

        // Mark transaction as 'FAILED' and attempt to refund the user
        console.log(`[WITHDRAWAL_QUEUE] Marking transaction as failed`);
        await this.markTransactionFailed(transactionId, error.message);

        await new Promise((resolve) => setTimeout(resolve, 1000));
      } finally {
        this.processingTransactions.delete(transactionId);
        this.isProcessing = false;
        setImmediate(() => this.processNext()); // Process the next transaction
      }
    } else {
      this.isProcessing = false;
    }
  }

  private async processWithdrawal(transaction: any, metadata: any) {
    console.log(`[WITHDRAWAL_QUEUE] processWithdrawal started for chain ${metadata.chain}`);
    if (["BTC", "LTC", "DOGE", "DASH"].includes(metadata.chain)) {
      await handleUTXOWithdrawal(transaction);
    } else if (metadata.chain === "SOL") {
      const SolanaService = await getSolanaService();
      const solanaService = await SolanaService.getInstance();
      if (metadata.contractType === "PERMIT") {
        await solanaService.handleSplTokenWithdrawal(
          transaction.id,
          transaction.walletId,
          metadata.contract,
          transaction.amount,
          metadata.toAddress,
          metadata.decimals
        );
      } else {
        await solanaService.handleSolanaWithdrawal(
          transaction.id,
          transaction.walletId,
          transaction.amount,
          metadata.toAddress
        );
      }
    } else if (metadata.chain === "TRON") {
      const TronService = await getTronService();
      const tronService = await TronService.getInstance();
      await tronService.handleTronWithdrawal(
        transaction.id,
        transaction.walletId,
        transaction.amount,
        metadata.toAddress
      );
    } else if (metadata.chain === "XMR") {
      const MoneroService = await getMoneroService();
      const moneroService = await MoneroService.getInstance();
      await moneroService.handleMoneroWithdrawal(
        transaction.id,
        transaction.walletId,
        transaction.amount,
        metadata.toAddress
      );
    } else if (metadata.chain === "TON") {
      const TonService = await getTonService();
      const tonService = await TonService.getInstance();
      await tonService.handleTonWithdrawal(
        transaction.id,
        transaction.walletId,
        transaction.amount,
        metadata.toAddress
      );
    } else {
      await handleEvmWithdrawal(
        transaction.id,
        transaction.walletId,
        metadata.chain,
        transaction.amount,
        metadata.toAddress
      );
    }

    // Mark the transaction as completed after successful processing
    // Note: For XMR and TRON, the handlers already update the status with trxId, so we skip the update
    if (!["XMR", "TRON"].includes(metadata.chain)) {
      await models.transaction.update(
        { status: "COMPLETED" },
        { where: { id: transaction.id } }
      );
    }
  }

  private async sendWithdrawalConfirmationEmail(
    transaction: any,
    metadata: any
  ) {
    const user = await models.user.findOne({
      where: { id: transaction.userId },
    });
    if (user) {
      const wallet = await models.wallet.findOne({
        where: {
          userId: user.id,
          currency: transaction.wallet.currency,
          type: "ECO",
        },
      });
      if (wallet) {
        await sendEcoWithdrawalConfirmationEmail(
          user,
          transaction,
          wallet,
          metadata.toAddress,
          metadata.chain
        );
      }
    }
  }

  private async recordAdminProfit(transaction: any, metadata: any) {
    // Skip admin profit recording for XMR as it's handled in the XMR service with proper fee splitting
    if (metadata.chain === "XMR") {
      return;
    }

    if (
      transaction &&
      typeof transaction.fee === "number" &&
      transaction.fee > 0
    ) {
      await models.adminProfit.create({
        amount: transaction.fee,
        currency: transaction.wallet.currency,
        chain: metadata.chain,
        type: "WITHDRAW",
        transactionId: transaction.id,
        description: `Admin profit from withdrawal fee of ${transaction.fee} ${transaction.wallet.currency} for transaction (${transaction.id})`,
      });
    }
  }

  private async markTransactionFailed(
    transactionId: string,
    errorMessage: string
  ) {
    await models.transaction.update(
      {
        status: "FAILED",
        description: `Transaction failed: ${errorMessage}`,
      },
      { where: { id: transactionId } }
    );

    const transaction = await models.transaction.findByPk(transactionId, {
      include: [{ model: models.wallet, as: "wallet", where: { type: "ECO" } }],
    });

    if (transaction && transaction.wallet) {
      await refundUser(transaction);

      const user = await models.user.findOne({
        where: { id: transaction.userId },
      });
      if (user) {
        const metadata =
          typeof transaction.metadata === "string"
            ? JSON.parse(transaction.metadata)
            : transaction.metadata;

        await sendEcoWithdrawalFailedEmail(
          user,
          transaction,
          transaction.wallet,
          metadata.toAddress,
          errorMessage
        );
      }

      // Updated notification using the new format:
      await createNotification({
        userId: transaction.userId,
        relatedId: transaction.id,
        title: "Withdrawal Failed",
        message: `Your withdrawal of ${transaction.amount} ${transaction.wallet.currency} has failed.`,
        type: "system",
        link: `/finance/wallet/withdrawals/${transaction.id}`,
        actions: [
          {
            label: "View Withdrawal",
            link: `/finance/wallet/withdrawals/${transaction.id}`,
            primary: true,
          },
        ],
      });
    }
  }
}

// Email sending functions
export async function sendEcoWithdrawalConfirmationEmail(
  user: any,
  transaction: any,
  wallet: any,
  toAddress: string,
  chain: string
) {
  const emailType = "EcoWithdrawalConfirmation";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: transaction.amount.toString(),
    CURRENCY: wallet.currency,
    TO_ADDRESS: toAddress,
    TRANSACTION_ID: transaction.trxId || transaction.id,
    CHAIN: chain,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendEcoWithdrawalFailedEmail(
  user: any,
  transaction: any,
  wallet: any,
  toAddress: string,
  reason: string
) {
  const emailType = "EcoWithdrawalFailed";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: transaction.amount.toString(),
    CURRENCY: wallet.currency,
    TO_ADDRESS: toAddress,
    REASON: reason,
  };

  await emailQueue.add({ emailData, emailType });
}

export default WithdrawalQueue;
