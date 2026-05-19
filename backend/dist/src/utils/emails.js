"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.emailQueue = void 0;
exports.sendEmail = sendEmail;
exports.sendChatEmail = sendChatEmail;
exports.sendFiatTransactionEmail = sendFiatTransactionEmail;
exports.sendBinaryOrderEmail = sendBinaryOrderEmail;
exports.sendWalletBalanceUpdateEmail = sendWalletBalanceUpdateEmail;
exports.sendTransactionStatusUpdateEmail = sendTransactionStatusUpdateEmail;
exports.sendAuthorStatusUpdateEmail = sendAuthorStatusUpdateEmail;
exports.sendOutgoingTransferEmail = sendOutgoingTransferEmail;
exports.sendIncomingTransferEmail = sendIncomingTransferEmail;
exports.sendSpotWalletWithdrawalConfirmationEmail = sendSpotWalletWithdrawalConfirmationEmail;
exports.sendSpotWalletDepositConfirmationEmail = sendSpotWalletDepositConfirmationEmail;
exports.sendAiInvestmentEmail = sendAiInvestmentEmail;
exports.sendInvestmentEmail = sendInvestmentEmail;
exports.sendIcoContributionEmail = sendIcoContributionEmail;
exports.sendStakingInitiationEmail = sendStakingInitiationEmail;
exports.sendStakingRewardEmail = sendStakingRewardEmail;
exports.sendOrderConfirmationEmail = sendOrderConfirmationEmail;
exports.sendEmailToTargetWithTemplate = sendEmailToTargetWithTemplate;
exports.sendKycEmail = sendKycEmail;
exports.sendForexTransactionEmail = sendForexTransactionEmail;
exports.sendCopyTradingLeaderApplicationEmail = sendCopyTradingLeaderApplicationEmail;
exports.sendCopyTradingLeaderApprovedEmail = sendCopyTradingLeaderApprovedEmail;
exports.sendCopyTradingLeaderRejectedEmail = sendCopyTradingLeaderRejectedEmail;
exports.sendCopyTradingLeaderSuspendedEmail = sendCopyTradingLeaderSuspendedEmail;
exports.sendCopyTradingNewFollowerEmail = sendCopyTradingNewFollowerEmail;
exports.sendCopyTradingFollowerStoppedEmail = sendCopyTradingFollowerStoppedEmail;
exports.sendCopyTradingSubscriptionStartedEmail = sendCopyTradingSubscriptionStartedEmail;
exports.sendCopyTradingSubscriptionPausedEmail = sendCopyTradingSubscriptionPausedEmail;
exports.sendCopyTradingSubscriptionResumedEmail = sendCopyTradingSubscriptionResumedEmail;
exports.sendCopyTradingSubscriptionStoppedEmail = sendCopyTradingSubscriptionStoppedEmail;
exports.sendCopyTradingTradeProfitEmail = sendCopyTradingTradeProfitEmail;
exports.sendCopyTradingTradeLossEmail = sendCopyTradingTradeLossEmail;
exports.sendCopyTradingDailyLossLimitEmail = sendCopyTradingDailyLossLimitEmail;
exports.sendCopyTradingInsufficientBalanceEmail = sendCopyTradingInsufficientBalanceEmail;
exports.sendCopyTradingProfitShareEarnedEmail = sendCopyTradingProfitShareEarnedEmail;
exports.sendCopyTradingProfitSharePaidEmail = sendCopyTradingProfitSharePaidEmail;
const bull_1 = __importDefault(require("bull"));
const mailer_1 = require("./mailer");
const date_fns_1 = require("date-fns");
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const token_1 = require("@b/utils/token");
const APP_EMAILER = process.env.APP_EMAILER || "nodemailer-service";
exports.emailQueue = new bull_1.default("emailQueue", {
    redis: {
        host: process.env.REDIS_HOST || "127.0.0.1",
        port: parseInt(process.env.REDIS_PORT || "6379"),
        password: process.env.REDIS_PASSWORD || undefined,
    },
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: "exponential",
            delay: 3000,
        },
        removeOnComplete: 100,
        removeOnFail: 500,
    },
});
exports.emailQueue.process(async (job) => {
    var _a;
    const { emailData, emailType } = job.data;
    try {
        await sendEmail(emailData, emailType);
        console_1.logger.info("EMAIL", `Email sent: ${emailType} to ${emailData.TO}`);
    }
    catch (error) {
        console_1.logger.error("EMAIL", `Failed to send email: ${emailType} to ${emailData.TO} (attempt ${job.attemptsMade + 1}/${((_a = job.opts) === null || _a === void 0 ? void 0 : _a.attempts) || 1})`, error instanceof Error ? error : new Error(String(error)));
        throw error;
    }
});
exports.emailQueue.on("failed", (job, error) => {
    const { emailData, emailType } = job.data;
    console_1.logger.error("EMAIL", `Email job permanently failed: ${emailType} to ${emailData === null || emailData === void 0 ? void 0 : emailData.TO} after ${job.attemptsMade} attempts`, error instanceof Error ? error : new Error(String(error)));
});
exports.emailQueue.on("stalled", (jobId) => {
    console_1.logger.warn("EMAIL", `Email job stalled: ${jobId}`);
});
exports.emailQueue.on("error", (error) => {
    console_1.logger.error("EMAIL", "Email queue error (possible Redis connection issue)", error instanceof Error ? error : new Error(String(error)));
});
async function sendEmail(specificVariables, templateName, ctx) {
    var _a, _b, _c, _d, _e, _f, _g;
    let processedTemplate;
    let processedSubject;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Processing email template: ${templateName}`);
        const result = await (0, mailer_1.fetchAndProcessEmailTemplate)(specificVariables, templateName);
        processedTemplate = result.processedTemplate;
        processedSubject = result.processedSubject;
    }
    catch (error) {
        console_1.logger.error("EMAIL", "Error processing email template", error);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _b === void 0 ? void 0 : _b.call(ctx, error.message);
        throw error;
    }
    let prepareOptions = {};
    if (specificVariables["USER_ID"]) {
        try {
            const unsubscribeToken = await (0, token_1.generateUnsubscribeToken)(specificVariables["USER_ID"]);
            prepareOptions = {
                userId: specificVariables["USER_ID"],
                locale: specificVariables["LOCALE"] || "en",
                unsubscribeToken,
            };
        }
        catch (error) {
            console_1.logger.warn("EMAIL", "Failed to generate unsubscribe token", error);
        }
    }
    let finalEmailHtml;
    try {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Preparing email template");
        finalEmailHtml = await (0, mailer_1.prepareEmailTemplate)(processedTemplate, processedSubject, prepareOptions);
    }
    catch (error) {
        console_1.logger.error("EMAIL", "Error preparing email template", error);
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _d === void 0 ? void 0 : _d.call(ctx, error.message);
        throw error;
    }
    const options = {
        to: specificVariables["TO"],
        subject: processedSubject,
        html: finalEmailHtml,
    };
    const emailer = APP_EMAILER;
    try {
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Sending email to ${specificVariables["TO"]}`);
        await (0, mailer_1.sendEmailWithProvider)(emailer, options);
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, `Email sent successfully to ${specificVariables["TO"]}`);
    }
    catch (error) {
        console_1.logger.error("EMAIL", "Error sending email with provider", error);
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, error.message);
        throw error;
    }
}
async function sendChatEmail(sender, receiver, chat, message, emailType, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing chat email to ${receiver.email}`);
    const emailData = {
        TO: receiver.email,
        SENDER_NAME: sender.firstName,
        RECEIVER_NAME: receiver.firstName,
        MESSAGE: message.text,
        TICKET_ID: chat.id,
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType,
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Chat email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendFiatTransactionEmail(user, transaction, currency, newBalance, ctx) {
    var _a, _b, _c;
    const emailType = "FiatWalletTransaction";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing fiat transaction email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TRANSACTION_TYPE: transaction.type,
        TRANSACTION_ID: transaction.id,
        AMOUNT: transaction.amount,
        CURRENCY: currency,
        TRANSACTION_STATUS: transaction.status,
        NEW_BALANCE: newBalance,
        DESCRIPTION: transaction.description || "N/A",
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Fiat transaction email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
function getBinaryOrderEmailTemplate(orderType, status) {
    const typeToTemplate = {
        RISE_FALL: "BinaryRiseFall",
        HIGHER_LOWER: "BinaryHigherLower",
        TOUCH_NO_TOUCH: "BinaryTouchNoTouch",
        CALL_PUT: "BinaryCallPut",
        TURBO: "BinaryTurbo",
    };
    const templatePrefix = typeToTemplate[orderType] || "BinaryRiseFall";
    switch (status) {
        case "WIN":
            return `${templatePrefix}Win`;
        case "LOSS":
            return `${templatePrefix}Loss`;
        case "DRAW":
            return `${templatePrefix}Draw`;
        default:
            return "BinaryOrderResult";
    }
}
async function sendBinaryOrderEmail(user, order, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing binary order email to ${user.email}`);
    const emailType = getBinaryOrderEmailTemplate(order.type, order.status);
    let profit = 0;
    let sign = "";
    switch (order.status) {
        case "WIN":
            profit = order.profit;
            sign = "+";
            break;
        case "LOSS":
            profit = order.amount;
            sign = "-";
            break;
        case "DRAW":
            profit = 0;
            sign = "";
            break;
    }
    const currency = order.symbol.split("/")[1];
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        ORDER_ID: order.id,
        RESULT: order.status,
        MARKET: order.symbol,
        CURRENCY: currency,
        AMOUNT: order.amount,
        PROFIT: `${sign}${profit}`,
        ENTRY_PRICE: order.price,
        CLOSE_PRICE: order.closePrice,
        SIDE: order.side,
    };
    switch (order.type) {
        case "HIGHER_LOWER":
        case "TURBO":
            if (order.barrier) {
                emailData.BARRIER = order.barrier;
                emailData.BARRIER_LEVEL = order.barrierLevelId || "Custom";
            }
            break;
        case "TOUCH_NO_TOUCH":
            if (order.barrier) {
                emailData.BARRIER = order.barrier;
            }
            const isTouchSide = order.side === "TOUCH";
            const didTouch = order.status === "WIN" ? isTouchSide : !isTouchSide;
            if (order.status === "WIN") {
                emailData.TOUCH_RESULT = isTouchSide
                    ? "The price touched your barrier level!"
                    : "The price never touched your barrier level!";
                emailData.MULTIPLIER_INFO = isTouchSide
                    ? "Touch Multiplier Applied"
                    : "No Touch Multiplier Applied";
            }
            else {
                emailData.TOUCH_RESULT = isTouchSide
                    ? "The price did not touch your barrier level before expiry."
                    : "The price touched your barrier level before expiry.";
            }
            break;
        case "CALL_PUT":
            if (order.strikePrice) {
                emailData.STRIKE = order.strikePrice;
                emailData.STRIKE_LEVEL = order.strikeLevelId || "Custom";
            }
            break;
    }
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Binary order email queued successfully (${emailType})`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendWalletBalanceUpdateEmail(user, wallet, action, amount, newBalance, ctx) {
    var _a, _b, _c;
    const emailType = "WalletBalanceUpdate";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing wallet balance update email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        ACTION: action,
        AMOUNT: amount,
        CURRENCY: wallet.currency,
        NEW_BALANCE: newBalance,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Wallet balance update email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendTransactionStatusUpdateEmail(user, transaction, wallet, newBalance, note, ctx) {
    var _a, _b, _c;
    const emailType = "TransactionStatusUpdate";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing transaction status update email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TRANSACTION_TYPE: transaction.type,
        TRANSACTION_ID: transaction.id,
        TRANSACTION_STATUS: transaction.status,
        AMOUNT: transaction.amount,
        CURRENCY: wallet.currency,
        NEW_BALANCE: newBalance,
        NOTE: note || "N/A",
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Transaction status update email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendAuthorStatusUpdateEmail(user, author, ctx) {
    var _a, _b, _c;
    const emailType = "AuthorStatusUpdate";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing author status update email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        AUTHOR_STATUS: author.status,
        APPLICATION_ID: author.id,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Author status update email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendOutgoingTransferEmail(user, toUser, wallet, amount, transactionId, ctx) {
    var _a, _b, _c;
    const emailType = "OutgoingWalletTransfer";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing outgoing transfer email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        AMOUNT: amount,
        CURRENCY: wallet.currency,
        NEW_BALANCE: wallet.balance,
        TRANSACTION_ID: transactionId,
        RECIPIENT_NAME: `${toUser.firstName} ${toUser.lastName}`,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Outgoing transfer email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendIncomingTransferEmail(user, fromUser, wallet, amount, transactionId, ctx) {
    var _a, _b, _c;
    const emailType = "IncomingWalletTransfer";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing incoming transfer email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        AMOUNT: amount,
        CURRENCY: wallet.currency,
        NEW_BALANCE: wallet.balance,
        TRANSACTION_ID: transactionId,
        SENDER_NAME: `${fromUser.firstName} ${fromUser.lastName}`,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Incoming transfer email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendSpotWalletWithdrawalConfirmationEmail(user, transaction, wallet, ctx) {
    var _a, _b, _c;
    const emailType = "SpotWalletWithdrawalConfirmation";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing spot wallet withdrawal confirmation email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        AMOUNT: transaction.amount,
        CURRENCY: wallet.currency,
        ADDRESS: transaction.metadata.address,
        FEE: transaction.fee,
        CHAIN: transaction.metadata.chain,
        MEMO: transaction.metadata.memo || "N/A",
        STATUS: transaction.status,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Spot wallet withdrawal confirmation email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendSpotWalletDepositConfirmationEmail(user, transaction, wallet, chain, ctx) {
    var _a, _b, _c;
    const emailType = "SpotWalletDepositConfirmation";
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing spot wallet deposit confirmation email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TRANSACTION_ID: transaction.referenceId,
        AMOUNT: transaction.amount,
        CURRENCY: wallet.currency,
        CHAIN: chain,
        FEE: transaction.fee,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Spot wallet deposit confirmation email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendAiInvestmentEmail(user, plan, duration, investment, emailType, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing AI investment email to ${user.email}`);
    const resultSign = investment.result === "WIN" ? "+" : investment.result === "LOSS" ? "-" : "";
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        PLAN_NAME: plan.title,
        AMOUNT: investment.amount.toString(),
        CURRENCY: investment.symbol.split("/")[1],
        DURATION: duration.duration.toString(),
        TIMEFRAME: duration.timeframe,
        STATUS: investment.status,
        PROFIT: investment.profit !== undefined
            ? `${resultSign}${investment.profit}`
            : "N/A",
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `AI investment email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendInvestmentEmail(user, plan, duration, investment, emailType, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing investment email to ${user.email}`);
    const resultSign = investment.result === "WIN" ? "+" : investment.result === "LOSS" ? "-" : "";
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        PLAN_NAME: plan.title,
        AMOUNT: investment.amount.toString(),
        DURATION: duration.duration.toString(),
        TIMEFRAME: duration.timeframe,
        STATUS: investment.status,
        PROFIT: `${resultSign}${investment.profit}` || "N/A",
    };
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Investment email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendIcoContributionEmail(user, contribution, token, phase, emailType, transactionId, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing ICO contribution email to ${user.email}`);
    const contributionDate = new Date(contribution.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TOKEN_NAME: token.name,
        PHASE_NAME: phase.name,
        AMOUNT: contribution.amount.toString(),
        CURRENCY: token.purchaseCurrency,
        DATE: contributionDate,
    };
    if (emailType === "IcoContributionPaid") {
        emailData["TRANSACTION_ID"] = transactionId || "N/A";
    }
    else if (emailType === "IcoNewContribution") {
        emailData["CONTRIBUTION_STATUS"] = contribution.status;
    }
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `ICO contribution email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendStakingInitiationEmail(user, stake, pool, reward, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing staking initiation email to ${user.email}`);
    const stakeDate = new Date(stake.stakeDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const releaseDate = new Date(stake.releaseDate).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TOKEN_NAME: pool.name,
        STAKE_AMOUNT: stake.amount.toString(),
        TOKEN_SYMBOL: pool.currency,
        STAKE_DATE: stakeDate,
        RELEASE_DATE: releaseDate,
        EXPECTED_REWARD: reward,
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "StakingInitiationConfirmation",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Staking initiation email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendStakingRewardEmail(user, stake, pool, reward, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing staking reward email to ${user.email}`);
    const distributionDate = (0, date_fns_1.format)(new Date(stake.releaseDate), "MMMM do, yyyy 'at' hh:mm a");
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        TOKEN_NAME: pool.name,
        REWARD_AMOUNT: reward.toString(),
        TOKEN_SYMBOL: pool.currency,
        DISTRIBUTION_DATE: distributionDate,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType: "StakingRewardDistribution" });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Staking reward email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendOrderConfirmationEmail(user, order, product, ctx) {
    var _a, _b, _c, _d, _e, _f;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing order confirmation email to ${user.email}`);
    const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
    });
    const fullOrder = await db_1.models.ecommerceOrder.findByPk(order.id, {
        include: [
            {
                model: db_1.models.ecommerceOrderItem,
                as: "orderItems",
                include: [
                    {
                        model: db_1.models.ecommerceProduct,
                        as: "product",
                    },
                ],
            },
        ],
    });
    const subtotal = ((_b = fullOrder === null || fullOrder === void 0 ? void 0 : fullOrder.orderItems) === null || _b === void 0 ? void 0 : _b.reduce((total, item) => {
        var _a, _b;
        return total + (((_b = (_a = item.product) === null || _a === void 0 ? void 0 : _a.price) !== null && _b !== void 0 ? _b : 0) * item.quantity);
    }, 0)) || product.price;
    const systemSettings = await db_1.models.settings.findAll();
    const settings = systemSettings.reduce((acc, setting) => {
        acc[setting.key] = setting.value;
        return acc;
    }, {});
    let shippingCost = 0;
    if (product.type === "PHYSICAL" && settings.ecommerceShippingEnabled === "true") {
        shippingCost = parseFloat(settings.ecommerceDefaultShippingCost || "0");
    }
    let taxAmount = 0;
    if (settings.ecommerceTaxEnabled === "true") {
        const taxRate = parseFloat(settings.ecommerceDefaultTaxRate || "0") / 100;
        taxAmount = subtotal * taxRate;
    }
    const orderTotal = subtotal + shippingCost + taxAmount;
    const emailData = {
        TO: user.email,
        CUSTOMER_NAME: user.firstName,
        ORDER_NUMBER: order.id,
        ORDER_DATE: orderDate,
        PRODUCT_NAME: product.name,
        QUANTITY: ((_d = (_c = fullOrder === null || fullOrder === void 0 ? void 0 : fullOrder.orderItems) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.quantity) || 1,
        PRODUCT_PRICE: product.price.toString(),
        PRODUCT_CURRENCY: product.currency,
        SUBTOTAL: subtotal.toFixed(2),
        SHIPPING_COST: shippingCost.toFixed(2),
        TAX_AMOUNT: taxAmount.toFixed(2),
        ORDER_TOTAL: orderTotal.toFixed(2),
        ORDER_STATUS: order.status,
        PRODUCT_TYPE: product.type,
    };
    try {
        await exports.emailQueue.add({ emailData, emailType: "OrderConfirmation" });
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, `Order confirmation email queued successfully`);
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message);
        throw error;
    }
}
async function sendEmailToTargetWithTemplate(to, subject, html, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending email to ${to}`);
    const options = {
        to,
        subject,
        html,
    };
    const emailer = APP_EMAILER;
    try {
        await (0, mailer_1.sendEmailWithProvider)(emailer, options);
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Email sent successfully to ${to}`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendKycEmail(user, kyc, type, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing KYC email to ${user.email}`);
    const timestampLabel = type === "KycSubmission" ? "CREATED_AT" : "UPDATED_AT";
    const timestampDate = type === "KycSubmission"
        ? new Date(kyc.createdAt).toISOString()
        : new Date(kyc.updatedAt).toISOString();
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        [timestampLabel]: timestampDate,
        LEVEL: kyc.level,
        STATUS: kyc.status,
    };
    if (type === "KycRejected" && kyc.adminNotes) {
        emailData["MESSAGE"] = kyc.adminNotes;
    }
    try {
        await exports.emailQueue.add({ emailData, emailType: type });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `KYC email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendForexTransactionEmail(user, transaction, account, currency, transactionType, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing forex transaction email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        ACCOUNT_ID: account.accountId,
        TRANSACTION_ID: transaction.id,
        AMOUNT: transaction.amount.toString(),
        CURRENCY: currency,
        STATUS: transaction.status,
    };
    let emailType = "";
    if (transactionType === "FOREX_DEPOSIT") {
        emailType = "ForexDepositConfirmation";
    }
    else if (transactionType === "FOREX_WITHDRAW") {
        emailType = "ForexWithdrawalConfirmation";
    }
    try {
        await exports.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Forex transaction email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        throw error;
    }
}
async function sendCopyTradingLeaderApplicationEmail(user, leader, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing copy trading leader application email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        DISPLAY_NAME: leader.displayName,
        CREATED_AT: (0, date_fns_1.format)(new Date(leader.createdAt), "MMMM do, yyyy 'at' hh:mm a"),
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderApplicationSubmitted",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Copy trading leader application email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue copy trading leader application email", error);
    }
}
async function sendCopyTradingLeaderApprovedEmail(user, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing copy trading leader approval email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderApplicationApproved",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Copy trading leader approval email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue copy trading leader approval email", error);
    }
}
async function sendCopyTradingLeaderRejectedEmail(user, rejectionReason, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing copy trading leader rejection email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        REJECTION_REASON: rejectionReason,
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderApplicationRejected",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Copy trading leader rejection email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue copy trading leader rejection email", error);
    }
}
async function sendCopyTradingLeaderSuspendedEmail(user, suspensionReason, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing copy trading leader suspension email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        SUSPENSION_REASON: suspensionReason,
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderSuspended",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Copy trading leader suspension email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue copy trading leader suspension email", error);
    }
}
async function sendCopyTradingNewFollowerEmail(user, follower, followerUser, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing new follower email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        FOLLOWER_NAME: `${followerUser.firstName} ${followerUser.lastName}`,
        COPY_MODE: follower.copyMode,
        STARTED_AT: (0, date_fns_1.format)(new Date(follower.createdAt), "MMMM do, yyyy 'at' hh:mm a"),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderNewFollower",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `New follower email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue new follower email", error);
    }
}
async function sendCopyTradingFollowerStoppedEmail(user, follower, followerUser, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing follower stopped email to ${user.email}`);
    const startDate = new Date(follower.createdAt);
    const endDate = new Date();
    const daysFollowed = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        FOLLOWER_NAME: `${followerUser.firstName} ${followerUser.lastName}`,
        STOPPED_AT: (0, date_fns_1.format)(endDate, "MMMM do, yyyy 'at' hh:mm a"),
        DAYS_FOLLOWED: daysFollowed.toString(),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingLeaderFollowerStopped",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Follower stopped email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue follower stopped email", error);
    }
}
async function sendCopyTradingSubscriptionStartedEmail(user, follower, leader, ctx) {
    var _a, _b, _c, _d, _e, _f;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing subscription started email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leader.displayName,
        RISK_LEVEL: leader.riskLevel || "Medium",
        TRADING_STYLE: leader.tradingStyle || "Balanced",
        WIN_RATE: ((_b = leader.winRate) === null || _b === void 0 ? void 0 : _b.toString()) || "N/A",
        COPY_MODE: follower.copyMode,
        MAX_DAILY_LOSS: ((_c = follower.maxDailyLoss) === null || _c === void 0 ? void 0 : _c.toString()) || "Not Set",
        MAX_POSITION_SIZE: ((_d = follower.maxPositionSize) === null || _d === void 0 ? void 0 : _d.toString()) || "Not Set",
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingFollowerSubscriptionStarted",
        });
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, `Subscription started email queued successfully`);
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue subscription started email", error);
    }
}
async function sendCopyTradingSubscriptionPausedEmail(user, leaderName, pauseReason, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing subscription paused email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        PAUSE_REASON: pauseReason,
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingFollowerSubscriptionPaused",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Subscription paused email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue subscription paused email", error);
    }
}
async function sendCopyTradingSubscriptionResumedEmail(user, leaderName, copyMode, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing subscription resumed email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        COPY_MODE: copyMode,
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingFollowerSubscriptionResumed",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Subscription resumed email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue subscription resumed email", error);
    }
}
async function sendCopyTradingSubscriptionStoppedEmail(user, leaderName, stats, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing subscription stopped email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        TOTAL_TRADES: stats.totalTrades.toString(),
        WIN_RATE: stats.winRate.toFixed(2),
        TOTAL_PROFIT: stats.totalProfit.toFixed(2),
        ROI: stats.roi.toFixed(2),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingFollowerSubscriptionStopped",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Subscription stopped email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue subscription stopped email", error);
    }
}
async function sendCopyTradingTradeProfitEmail(user, leaderName, trade, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing trade profit email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        SYMBOL: trade.symbol,
        SIDE: trade.side,
        ENTRY_PRICE: trade.entryPrice.toString(),
        EXIT_PRICE: trade.exitPrice.toString(),
        PROFIT: trade.profit.toFixed(2),
        YOUR_PROFIT: trade.yourProfit.toFixed(2),
        PROFIT_SHARE_PERCENT: trade.profitSharePercent.toString(),
        LEADER_PROFIT_SHARE: trade.leaderProfitShare.toFixed(2),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingTradeProfit",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Trade profit email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue trade profit email", error);
    }
}
async function sendCopyTradingTradeLossEmail(user, leaderName, subscriptionId, trade, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing trade loss email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        SYMBOL: trade.symbol,
        SIDE: trade.side,
        ENTRY_PRICE: trade.entryPrice.toString(),
        EXIT_PRICE: trade.exitPrice.toString(),
        LOSS: trade.loss.toFixed(2),
        SUBSCRIPTION_ID: subscriptionId,
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingTradeLoss",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Trade loss email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue trade loss email", error);
    }
}
async function sendCopyTradingDailyLossLimitEmail(user, leaderName, dailyLossLimit, currentLoss, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing daily loss limit email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        DAILY_LOSS_LIMIT: dailyLossLimit.toFixed(2),
        CURRENT_LOSS: currentLoss.toFixed(2),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingDailyLossLimitReached",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Daily loss limit email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue daily loss limit email", error);
    }
}
async function sendCopyTradingInsufficientBalanceEmail(user, leaderName, subscriptionId, symbol, requiredAmount, availableBalance, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing insufficient balance email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        SYMBOL: symbol,
        REQUIRED_AMOUNT: requiredAmount.toFixed(2),
        AVAILABLE_BALANCE: availableBalance.toFixed(2),
        SUBSCRIPTION_ID: subscriptionId,
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingInsufficientBalance",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Insufficient balance email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue insufficient balance email", error);
    }
}
async function sendCopyTradingProfitShareEarnedEmail(user, followerName, symbol, followerProfit, profitSharePercent, profitShareAmount, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing profit share earned email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        FOLLOWER_NAME: followerName,
        SYMBOL: symbol,
        FOLLOWER_PROFIT: followerProfit.toFixed(2),
        PROFIT_SHARE_PERCENT: profitSharePercent.toString(),
        PROFIT_SHARE_AMOUNT: profitShareAmount.toFixed(2),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingProfitShareEarned",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Profit share earned email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue profit share earned email", error);
    }
}
async function sendCopyTradingProfitSharePaidEmail(user, leaderName, symbol, yourProfit, profitSharePercent, profitShareAmount, netProfit, ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Queueing profit share paid email to ${user.email}`);
    const emailData = {
        TO: user.email,
        USER_ID: user.id,
        FIRSTNAME: user.firstName,
        LEADER_NAME: leaderName,
        SYMBOL: symbol,
        YOUR_PROFIT: yourProfit.toFixed(2),
        PROFIT_SHARE_PERCENT: profitSharePercent.toString(),
        PROFIT_SHARE_AMOUNT: profitShareAmount.toFixed(2),
        NET_PROFIT: netProfit.toFixed(2),
        URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
    };
    try {
        await exports.emailQueue.add({
            emailData,
            emailType: "CopyTradingProfitSharePaid",
        });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Profit share paid email queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message);
        console_1.logger.error("EMAIL", "Failed to queue profit share paid email", error);
    }
}
