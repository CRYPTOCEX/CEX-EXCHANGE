"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEcoWithdrawalConfirmationEmail = sendEcoWithdrawalConfirmationEmail;
exports.sendEcoWithdrawalFailedEmail = sendEcoWithdrawalFailedEmail;
const db_1 = require("@b/db");
const utxo_1 = require("@b/api/(ext)/ecosystem/utils/utxo");
const notifications_1 = require("@b/utils/notifications");
const safe_imports_1 = require("@b/utils/safe-imports");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
const emails_1 = require("@b/utils/emails");
const withdraw_1 = require("./withdraw");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
class WithdrawalQueue {
    constructor() {
        this.queue = [];
        this.isProcessing = false;
        this.processingTransactions = new Set();
    }
    static getInstance() {
        if (!WithdrawalQueue.instance) {
            WithdrawalQueue.instance = new WithdrawalQueue();
        }
        return WithdrawalQueue.instance;
    }
    addTransaction(transactionId) {
        console_1.logger.info("WITHDRAW", `Adding transaction to queue: ${transactionId}`);
        if (this.processingTransactions.has(transactionId)) {
            console_1.logger.debug("WITHDRAW", `Transaction ${transactionId} already processing`);
            return;
        }
        if (!this.queue.includes(transactionId)) {
            this.queue.push(transactionId);
            console_1.logger.debug("WITHDRAW", `Queue size: ${this.queue.length}`);
            this.processNext();
        }
    }
    async processNext() {
        if (this.isProcessing || this.queue.length === 0) {
            if (this.isProcessing) {
                console_1.logger.debug("WITHDRAW", `Already processing, skipping`);
            }
            return;
        }
        this.isProcessing = true;
        const transactionId = this.queue.shift();
        console_1.logger.info("WITHDRAW", `Processing transaction: ${transactionId}`);
        if (transactionId) {
            try {
                this.processingTransactions.add(transactionId);
                const transaction = await db_1.models.transaction.findOne({
                    where: { id: transactionId },
                    include: [
                        {
                            model: db_1.models.wallet,
                            as: "wallet",
                            where: { type: "ECO" },
                        },
                    ],
                });
                if (!transaction) {
                    console_1.logger.error("WITHDRAW", `Transaction ${transactionId} not found`);
                    throw (0, error_1.createError)({ statusCode: 404, message: "Transaction not found" });
                }
                console_1.logger.debug("WITHDRAW", `Transaction found: id=${transaction.id}, type=${transaction.type}, status=${transaction.status}, amount=${transaction.amount}`);
                if (!transaction.wallet) {
                    console_1.logger.error("WITHDRAW", `Wallet not found for transaction ${transactionId}`);
                    throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found for transaction" });
                }
                console_1.logger.debug("WITHDRAW", `Updating transaction status to PROCESSING`);
                const [updatedCount] = await db_1.models.transaction.update({ status: "PROCESSING" }, { where: { id: transactionId, status: "PENDING" } });
                if (updatedCount === 0) {
                    console_1.logger.warn("WITHDRAW", `Transaction ${transactionId} already processed or in process`);
                    throw (0, error_1.createError)({ statusCode: 409, message: "Transaction already processed or in process" });
                }
                const metadata = typeof transaction.metadata === "string"
                    ? JSON.parse(transaction.metadata)
                    : transaction.metadata;
                console_1.logger.debug("WITHDRAW", `Transaction metadata: chain=${metadata === null || metadata === void 0 ? void 0 : metadata.chain}, toAddress=${metadata === null || metadata === void 0 ? void 0 : metadata.toAddress}`);
                if (!metadata || !metadata.chain) {
                    console_1.logger.error("WITHDRAW", `Invalid metadata: ${JSON.stringify(metadata)}`);
                    throw (0, error_1.createError)({ statusCode: 400, message: "Invalid or missing chain in transaction metadata" });
                }
                console_1.logger.info("WITHDRAW", `Processing withdrawal for chain: ${metadata.chain}`);
                await this.processWithdrawal(transaction, metadata);
                await this.sendWithdrawalConfirmationEmail(transaction, metadata);
                await this.recordAdminProfit(transaction, metadata);
            }
            catch (error) {
                console_1.logger.error("WITHDRAW", `Failed to process transaction ${transactionId}: ${error.message}`);
                console_1.logger.info("WITHDRAW", `Marking transaction as failed`);
                await this.markTransactionFailed(transactionId, error.message);
                await new Promise((resolve) => setTimeout(resolve, 1000));
            }
            finally {
                this.processingTransactions.delete(transactionId);
                this.isProcessing = false;
                setImmediate(() => this.processNext());
            }
        }
        else {
            this.isProcessing = false;
        }
    }
    async processWithdrawal(transaction, metadata) {
        console_1.logger.info("WITHDRAW", `processWithdrawal started for chain ${metadata.chain}`);
        if (["BTC", "LTC", "DOGE", "DASH"].includes(metadata.chain)) {
            await (0, utxo_1.handleUTXOWithdrawal)(transaction);
        }
        else if (metadata.chain === "SOL") {
            const SolanaService = await (0, safe_imports_1.getSolanaService)();
            const solanaService = await SolanaService.getInstance();
            if (metadata.contractType === "PERMIT") {
                await solanaService.handleSplTokenWithdrawal(transaction.id, transaction.walletId, metadata.contract, transaction.amount, metadata.toAddress, metadata.decimals);
            }
            else {
                await solanaService.handleSolanaWithdrawal(transaction.id, transaction.walletId, transaction.amount, metadata.toAddress);
            }
        }
        else if (metadata.chain === "TRON") {
            const TronService = await (0, safe_imports_1.getTronService)();
            const tronService = await TronService.getInstance();
            await tronService.handleTronWithdrawal(transaction.id, transaction.walletId, transaction.amount, metadata.toAddress);
        }
        else if (metadata.chain === "XMR") {
            const MoneroService = await (0, safe_imports_1.getMoneroService)();
            const moneroService = await MoneroService.getInstance();
            await moneroService.handleMoneroWithdrawal(transaction.id, transaction.walletId, transaction.amount, metadata.toAddress);
        }
        else if (metadata.chain === "TON") {
            const TonService = await (0, safe_imports_1.getTonService)();
            const tonService = await TonService.getInstance();
            await tonService.handleTonWithdrawal(transaction.id, transaction.walletId, transaction.amount, metadata.toAddress);
        }
        else {
            await (0, withdraw_1.handleEvmWithdrawal)(transaction.id, transaction.walletId, metadata.chain, transaction.amount, metadata.toAddress);
        }
        if (!["XMR", "TRON"].includes(metadata.chain)) {
            await db_1.models.transaction.update({ status: "COMPLETED" }, { where: { id: transaction.id } });
        }
    }
    async sendWithdrawalConfirmationEmail(transaction, metadata) {
        const user = await db_1.models.user.findOne({
            where: { id: transaction.userId },
        });
        if (user) {
            const wallet = await db_1.models.wallet.findOne({
                where: {
                    userId: user.id,
                    currency: transaction.wallet.currency,
                    type: "ECO",
                },
            });
            if (wallet) {
                await sendEcoWithdrawalConfirmationEmail(user, transaction, wallet, metadata.toAddress, metadata.chain);
            }
        }
    }
    async recordAdminProfit(transaction, metadata) {
        if (metadata.chain === "XMR") {
            return;
        }
        if (transaction &&
            typeof transaction.fee === "number" &&
            transaction.fee > 0) {
            await db_1.models.adminProfit.create({
                amount: transaction.fee,
                currency: transaction.wallet.currency,
                chain: metadata.chain,
                type: "WITHDRAW",
                transactionId: transaction.id,
                description: `Admin profit from withdrawal fee of ${transaction.fee} ${transaction.wallet.currency} for transaction (${transaction.id})`,
            });
        }
    }
    async markTransactionFailed(transactionId, errorMessage) {
        await db_1.models.transaction.update({
            status: "FAILED",
            description: `Transaction failed: ${errorMessage}`,
        }, { where: { id: transactionId } });
        const transaction = await db_1.models.transaction.findByPk(transactionId, {
            include: [{ model: db_1.models.wallet, as: "wallet", where: { type: "ECO" } }],
        });
        if (transaction && transaction.wallet) {
            await (0, wallet_1.refundUser)(transaction);
            const user = await db_1.models.user.findOne({
                where: { id: transaction.userId },
            });
            if (user) {
                const metadata = typeof transaction.metadata === "string"
                    ? JSON.parse(transaction.metadata)
                    : transaction.metadata;
                await sendEcoWithdrawalFailedEmail(user, transaction, transaction.wallet, metadata.toAddress, errorMessage);
            }
            await (0, notifications_1.createNotification)({
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
async function sendEcoWithdrawalConfirmationEmail(user, transaction, wallet, toAddress, chain) {
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
    await emails_1.emailQueue.add({ emailData, emailType });
}
async function sendEcoWithdrawalFailedEmail(user, transaction, wallet, toAddress, reason) {
    const emailType = "EcoWithdrawalFailed";
    const emailData = {
        TO: user.email,
        FIRSTNAME: user.firstName,
        AMOUNT: transaction.amount.toString(),
        CURRENCY: wallet.currency,
        TO_ADDRESS: toAddress,
        REASON: reason,
    };
    await emails_1.emailQueue.add({ emailData, emailType });
}
exports.default = WithdrawalQueue;
