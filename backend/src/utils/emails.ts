import Bull from "bull";
import type { EmailOptions } from "./mailer";
import {
  fetchAndProcessEmailTemplate,
  prepareEmailTemplate,
  sendEmailWithProvider,
} from "./mailer";
import { format } from "date-fns";
import { models } from "@b/db";
import { logger } from "@b/utils/console";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

const APP_EMAILER = process.env.APP_EMAILER || "nodemailer-service";

export const emailQueue = new Bull("emailQueue", {
  redis: {
    host: "127.0.0.1",
    port: 6379,
  },
});

emailQueue.process(async (job) => {
  const { emailData, emailType } = job.data;

  try {
    await sendEmail(emailData, emailType);
    logger.debug("EMAIL", `Email sent: ${emailType}`);
  } catch (error) {
    logger.error("EMAIL", `Failed to send email: ${emailType}`, error);
    throw error;
  }
});

export async function sendEmail(
  specificVariables: any,
  templateName: string,
  ctx?: LogContext
): Promise<void> {
  let processedTemplate: string;
  let processedSubject: string;

  try {
    ctx?.step?.(`Processing email template: ${templateName}`);
    const result = await fetchAndProcessEmailTemplate(
      specificVariables,
      templateName
    );
    processedTemplate = result.processedTemplate;
    processedSubject = result.processedSubject;
  } catch (error) {
    logger.error("EMAIL", "Error processing email template", error);
    ctx?.fail?.((error as Error).message);
    throw error;
  }

  let finalEmailHtml: string;
  try {
    ctx?.step?.("Preparing email template");
    finalEmailHtml = await prepareEmailTemplate(
      processedTemplate,
      processedSubject
    );
  } catch (error) {
    logger.error("EMAIL", "Error preparing email template", error);
    ctx?.fail?.((error as Error).message);
    throw error;
  }

  const options: EmailOptions = {
    to: specificVariables["TO"] as string,
    subject: processedSubject,
    html: finalEmailHtml,
  };
  const emailer = APP_EMAILER;

  try {
    ctx?.step?.(`Sending email to ${specificVariables["TO"]}`);
    await sendEmailWithProvider(emailer, options);
    ctx?.success?.(`Email sent successfully to ${specificVariables["TO"]}`);
  } catch (error) {
    logger.error("EMAIL", "Error sending email with provider", error);
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendChatEmail(
  sender: any,
  receiver: any,
  chat: any,
  message: any,
  emailType: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing chat email to ${receiver.email}`);
  const emailData = {
    TO: receiver.email,
    SENDER_NAME: sender.firstName,
    RECEIVER_NAME: receiver.firstName,
    MESSAGE: message.text,
    TICKET_ID: chat.id,
  };

  try {
    await emailQueue.add({
      emailData,
      emailType,
    });
    ctx?.success?.(`Chat email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendFiatTransactionEmail(
  user: any,
  transaction: any,
  currency,
  newBalance: number,
  ctx?: LogContext
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "FiatWalletTransaction";

  ctx?.step?.(`Queueing fiat transaction email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    TRANSACTION_TYPE: transaction.type,
    TRANSACTION_ID: transaction.id,
    AMOUNT: transaction.amount,
    CURRENCY: currency,
    TRANSACTION_STATUS: transaction.status,
    NEW_BALANCE: newBalance,
    DESCRIPTION: transaction.description || "N/A",
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Fiat transaction email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendBinaryOrderEmail(user: any, order: any, ctx?: LogContext) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "BinaryOrderResult";

  ctx?.step?.(`Queueing binary order email to ${user.email}`);

  let profit = 0;
  let sign;
  switch (order.status) {
    case "WIN":
      profit = order.profit; // order.profit is already the calculated profit amount
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

  // Prepare the email data
  const emailData = {
    TO: user.email,
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

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Binary order email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendWalletBalanceUpdateEmail(
  user: any,
  wallet: any,
  action: "added" | "subtracted",
  amount: number,
  newBalance: number,
  ctx?: LogContext
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "WalletBalanceUpdate";

  ctx?.step?.(`Queueing wallet balance update email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    ACTION: action,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: newBalance,
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Wallet balance update email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendTransactionStatusUpdateEmail(
  user: any,
  transaction: any,
  wallet: any,
  newBalance: number,
  note?: string | null,
  ctx?: LogContext
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "TransactionStatusUpdate";

  ctx?.step?.(`Queueing transaction status update email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    TRANSACTION_TYPE: transaction.type,
    TRANSACTION_ID: transaction.id,
    TRANSACTION_STATUS: transaction.status,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: newBalance,
    NOTE: note || "N/A",
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Transaction status update email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendAuthorStatusUpdateEmail(user: any, author: any, ctx?: LogContext) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "AuthorStatusUpdate";

  ctx?.step?.(`Queueing author status update email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AUTHOR_STATUS: author.status,
    APPLICATION_ID: author.id,
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Author status update email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendOutgoingTransferEmail(
  user: any,
  toUser: any,
  wallet: any,
  amount: number,
  transactionId: string,
  ctx?: LogContext
) {
  const emailType = "OutgoingWalletTransfer";

  ctx?.step?.(`Queueing outgoing transfer email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    RECIPIENT_NAME: `${toUser.firstName} ${toUser.lastName}`,
  };

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Outgoing transfer email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendIncomingTransferEmail(
  user: any,
  fromUser: any,
  wallet: any,
  amount: number,
  transactionId: string,
  ctx?: LogContext
) {
  const emailType = "IncomingWalletTransfer";

  ctx?.step?.(`Queueing incoming transfer email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    SENDER_NAME: `${fromUser.firstName} ${fromUser.lastName}`,
  };

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Incoming transfer email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendSpotWalletWithdrawalConfirmationEmail(
  user: userAttributes,
  transaction: transactionAttributes,
  wallet: walletAttributes,
  ctx?: LogContext
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "SpotWalletWithdrawalConfirmation";

  ctx?.step?.(`Queueing spot wallet withdrawal confirmation email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    ADDRESS: transaction.metadata.address,
    FEE: transaction.fee,
    CHAIN: transaction.metadata.chain,
    MEMO: transaction.metadata.memo || "N/A",
    STATUS: transaction.status,
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Spot wallet withdrawal confirmation email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendSpotWalletDepositConfirmationEmail(
  user: userAttributes,
  transaction: transactionAttributes,
  wallet: walletAttributes,
  chain: string,
  ctx?: LogContext
) {
  // Define the type of email template to use, which should match the SQL record
  const emailType = "SpotWalletDepositConfirmation";

  ctx?.step?.(`Queueing spot wallet deposit confirmation email to ${user.email}`);

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    TRANSACTION_ID: transaction.referenceId,
    AMOUNT: transaction.amount,
    CURRENCY: wallet.currency,
    CHAIN: chain,
    FEE: transaction.fee,
  };

  // Send the email
  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Spot wallet deposit confirmation email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendAiInvestmentEmail(
  user: any,
  plan: any,
  duration: any,
  investment: any,
  emailType:
    | "NewAiInvestmentCreated"
    | "AiInvestmentCompleted"
    | "AiInvestmentCanceled",
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing AI investment email to ${user.email}`);

  const resultSign =
    investment.result === "WIN" ? "+" : investment.result === "LOSS" ? "-" : "";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    PLAN_NAME: plan.title,
    AMOUNT: investment.amount.toString(),
    CURRENCY: investment.symbol.split("/")[1],
    DURATION: duration.duration.toString(),
    TIMEFRAME: duration.timeframe,
    STATUS: investment.status,
    PROFIT:
      investment.profit !== undefined
        ? `${resultSign}${investment.profit}`
        : "N/A",
  };

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`AI investment email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendInvestmentEmail(
  user: any,
  plan: any,
  duration: any,
  investment: any,
  emailType:
    | "NewInvestmentCreated"
    | "InvestmentCompleted"
    | "InvestmentCanceled"
    | "InvestmentUpdated"
    | "NewForexInvestmentCreated"
    | "ForexInvestmentCompleted"
    | "ForexInvestmentCanceled",
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing investment email to ${user.email}`);

  const resultSign =
    investment.result === "WIN" ? "+" : investment.result === "LOSS" ? "-" : "";

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    PLAN_NAME: plan.title,
    AMOUNT: investment.amount.toString(),
    DURATION: duration.duration.toString(),
    TIMEFRAME: duration.timeframe,
    STATUS: investment.status,
    PROFIT: `${resultSign}${investment.profit}` || "N/A",
  };

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Investment email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendIcoContributionEmail(
  user: any,
  contribution: any,
  token: any,
  phase: any,
  emailType: "IcoNewContribution" | "IcoContributionPaid",
  transactionId?: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing ICO contribution email to ${user.email}`);

  const contributionDate = new Date(contribution.createdAt).toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );

  // Common email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    TOKEN_NAME: token.name,
    PHASE_NAME: phase.name,
    AMOUNT: contribution.amount.toString(),
    CURRENCY: token.purchaseCurrency,
    DATE: contributionDate,
  };

  // Customize email data based on the type
  if (emailType === "IcoContributionPaid") {
    emailData["TRANSACTION_ID"] = transactionId || "N/A";
  } else if (emailType === "IcoNewContribution") {
    emailData["CONTRIBUTION_STATUS"] = contribution.status;
  }

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`ICO contribution email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

// Function to send an email when a user initiates a stake
export async function sendStakingInitiationEmail(user, stake, pool, reward, ctx?: LogContext) {
  ctx?.step?.(`Queueing staking initiation email to ${user.email}`);

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
    FIRSTNAME: user.firstName,
    TOKEN_NAME: pool.name,
    STAKE_AMOUNT: stake.amount.toString(),
    TOKEN_SYMBOL: pool.currency,
    STAKE_DATE: stakeDate,
    RELEASE_DATE: releaseDate,
    EXPECTED_REWARD: reward,
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "StakingInitiationConfirmation",
    });
    ctx?.success?.(`Staking initiation email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendStakingRewardEmail(user, stake, pool, reward, ctx?: LogContext) {
  ctx?.step?.(`Queueing staking reward email to ${user.email}`);

  const distributionDate = format(
    new Date(stake.releaseDate),
    "MMMM do, yyyy 'at' hh:mm a"
  );

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    TOKEN_NAME: pool.name,
    REWARD_AMOUNT: reward.toString(),
    TOKEN_SYMBOL: pool.currency,
    DISTRIBUTION_DATE: distributionDate,
  };

  try {
    await emailQueue.add({ emailData, emailType: "StakingRewardDistribution" });
    ctx?.success?.(`Staking reward email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}
export async function sendOrderConfirmationEmail(user, order, product, ctx?: LogContext) {
  ctx?.step?.(`Queueing order confirmation email to ${user.email}`);

  const orderDate = new Date(order.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  // Get the order with items to calculate proper totals
  const fullOrder = await models.ecommerceOrder.findByPk(order.id, {
    include: [
      {
        model: models.ecommerceOrderItem,
        as: "orderItems",
        include: [
          {
            model: models.ecommerceProduct,
            as: "product",
          },
        ],
      },
    ],
  });

  // Calculate order totals
  const subtotal = fullOrder?.orderItems?.reduce((total, item) => {
    return total + (item.product.price * item.quantity);
  }, 0) || product.price;

  // Get system settings for shipping and tax
  const systemSettings = await models.settings.findAll();
  const settings = systemSettings.reduce((acc, setting) => {
    acc[setting.key] = setting.value;
    return acc;
  }, {} as Record<string, any>);

  // Calculate shipping and tax
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
    QUANTITY: fullOrder?.orderItems?.[0]?.quantity || 1,
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
    await emailQueue.add({ emailData, emailType: "OrderConfirmation" });
    ctx?.success?.(`Order confirmation email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

/**
 * Send an email to a specific target with a provided HTML template.
 *
 * @param {string} to - The email address of the target recipient.
 * @param {string} subject - The subject of the email.
 * @param {string} html - The HTML content to be sent.
 * @returns {Promise<void>} - The result of the email sending operation.
 */
export async function sendEmailToTargetWithTemplate(
  to: string,
  subject: string,
  html: string,
  ctx?: LogContext
): Promise<void> {
  ctx?.step?.(`Sending email to ${to}`);

  // Options for the email.
  const options: EmailOptions = {
    to,
    subject,
    html,
  };

  // Select the email provider.
  const emailer = APP_EMAILER;

  try {
    await sendEmailWithProvider(emailer, options);
    ctx?.success?.(`Email sent successfully to ${to}`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendKycEmail(user: any, kyc: any, type: string, ctx?: LogContext) {
  ctx?.step?.(`Queueing KYC email to ${user.email}`);

  // For submission emails, use CREATED_AT; otherwise (updates) use UPDATED_AT.
  const timestampLabel = type === "KycSubmission" ? "CREATED_AT" : "UPDATED_AT";
  const timestampDate =
    type === "KycSubmission"
      ? new Date(kyc.createdAt).toISOString()
      : new Date(kyc.updatedAt).toISOString();

  // Prepare email data using the correct fields.
  // Note: kyc.level now holds the level number (or "N/A" if not found).
  const emailData: Record<string, string | number> = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    [timestampLabel]: timestampDate,
    LEVEL: kyc.level,
    STATUS: kyc.status,
  };

  // For a rejected application, include the rejection message from adminNotes.
  if (type === "KycRejected" && kyc.adminNotes) {
    emailData["MESSAGE"] = kyc.adminNotes;
  }

  // Add the email to the queue using your emailQueue system.
  try {
    await emailQueue.add({ emailData, emailType: type });
    ctx?.success?.(`KYC email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

export async function sendForexTransactionEmail(
  user: any,
  transaction: any,
  account: any,
  currency: any,
  transactionType: "FOREX_DEPOSIT" | "FOREX_WITHDRAW",
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing forex transaction email to ${user.email}`);

  const emailData = {
    TO: user.email,
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
  } else if (transactionType === "FOREX_WITHDRAW") {
    emailType = "ForexWithdrawalConfirmation";
  }

  try {
    await emailQueue.add({ emailData, emailType });
    ctx?.success?.(`Forex transaction email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    throw error;
  }
}

// ============================================
// COPY TRADING EMAIL FUNCTIONS
// ============================================

/**
 * Send email when a user applies to become a copy trading leader
 */
export async function sendCopyTradingLeaderApplicationEmail(
  user: any,
  leader: any,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing copy trading leader application email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    DISPLAY_NAME: leader.displayName,
    CREATED_AT: format(new Date(leader.createdAt), "MMMM do, yyyy 'at' hh:mm a"),
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderApplicationSubmitted",
    });
    ctx?.success?.(`Copy trading leader application email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue copy trading leader application email", error);
  }
}

/**
 * Send email when a leader application is approved
 */
export async function sendCopyTradingLeaderApprovedEmail(
  user: any,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing copy trading leader approval email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderApplicationApproved",
    });
    ctx?.success?.(`Copy trading leader approval email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue copy trading leader approval email", error);
  }
}

/**
 * Send email when a leader application is rejected
 */
export async function sendCopyTradingLeaderRejectedEmail(
  user: any,
  rejectionReason: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing copy trading leader rejection email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    REJECTION_REASON: rejectionReason,
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderApplicationRejected",
    });
    ctx?.success?.(`Copy trading leader rejection email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue copy trading leader rejection email", error);
  }
}

/**
 * Send email when a leader is suspended
 */
export async function sendCopyTradingLeaderSuspendedEmail(
  user: any,
  suspensionReason: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing copy trading leader suspension email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    SUSPENSION_REASON: suspensionReason,
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderSuspended",
    });
    ctx?.success?.(`Copy trading leader suspension email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue copy trading leader suspension email", error);
  }
}

/**
 * Send email when a leader gets a new follower
 */
export async function sendCopyTradingNewFollowerEmail(
  user: any,
  follower: any,
  followerUser: any,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing new follower email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    FOLLOWER_NAME: `${followerUser.firstName} ${followerUser.lastName}`,
    COPY_MODE: follower.copyMode,
    STARTED_AT: format(new Date(follower.createdAt), "MMMM do, yyyy 'at' hh:mm a"),
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderNewFollower",
    });
    ctx?.success?.(`New follower email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue new follower email", error);
  }
}

/**
 * Send email when a follower stops copying
 */
export async function sendCopyTradingFollowerStoppedEmail(
  user: any,
  follower: any,
  followerUser: any,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing follower stopped email to ${user.email}`);

  // Calculate days followed
  const startDate = new Date(follower.createdAt);
  const endDate = new Date();
  const daysFollowed = Math.floor((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    FOLLOWER_NAME: `${followerUser.firstName} ${followerUser.lastName}`,
    STOPPED_AT: format(endDate, "MMMM do, yyyy 'at' hh:mm a"),
    DAYS_FOLLOWED: daysFollowed.toString(),
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingLeaderFollowerStopped",
    });
    ctx?.success?.(`Follower stopped email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue follower stopped email", error);
  }
}

/**
 * Send email when a follower starts copying a leader
 */
export async function sendCopyTradingSubscriptionStartedEmail(
  user: any,
  follower: any,
  leader: any,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing subscription started email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leader.displayName,
    RISK_LEVEL: leader.riskLevel || "Medium",
    TRADING_STYLE: leader.tradingStyle || "Balanced",
    WIN_RATE: leader.winRate?.toString() || "N/A",
    COPY_MODE: follower.copyMode,
    MAX_DAILY_LOSS: follower.maxDailyLoss?.toString() || "Not Set",
    MAX_POSITION_SIZE: follower.maxPositionSize?.toString() || "Not Set",
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingFollowerSubscriptionStarted",
    });
    ctx?.success?.(`Subscription started email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue subscription started email", error);
  }
}

/**
 * Send email when a follower's subscription is paused
 */
export async function sendCopyTradingSubscriptionPausedEmail(
  user: any,
  leaderName: string,
  pauseReason: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing subscription paused email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leaderName,
    PAUSE_REASON: pauseReason,
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingFollowerSubscriptionPaused",
    });
    ctx?.success?.(`Subscription paused email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue subscription paused email", error);
  }
}

/**
 * Send email when a follower's subscription is resumed
 */
export async function sendCopyTradingSubscriptionResumedEmail(
  user: any,
  leaderName: string,
  copyMode: string,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing subscription resumed email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leaderName,
    COPY_MODE: copyMode,
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingFollowerSubscriptionResumed",
    });
    ctx?.success?.(`Subscription resumed email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue subscription resumed email", error);
  }
}

/**
 * Send email when a follower's subscription is stopped
 */
export async function sendCopyTradingSubscriptionStoppedEmail(
  user: any,
  leaderName: string,
  stats: {
    totalTrades: number;
    winRate: number;
    totalProfit: number;
    roi: number;
  },
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing subscription stopped email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leaderName,
    TOTAL_TRADES: stats.totalTrades.toString(),
    WIN_RATE: stats.winRate.toFixed(2),
    TOTAL_PROFIT: stats.totalProfit.toFixed(2),
    ROI: stats.roi.toFixed(2),
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingFollowerSubscriptionStopped",
    });
    ctx?.success?.(`Subscription stopped email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue subscription stopped email", error);
  }
}

/**
 * Send email when a copy trade closes with profit
 */
export async function sendCopyTradingTradeProfitEmail(
  user: any,
  leaderName: string,
  trade: {
    symbol: string;
    side: string;
    entryPrice: number;
    exitPrice: number;
    profit: number;
    yourProfit: number;
    profitSharePercent: number;
    leaderProfitShare: number;
  },
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing trade profit email to ${user.email}`);

  const emailData = {
    TO: user.email,
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
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingTradeProfit",
    });
    ctx?.success?.(`Trade profit email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue trade profit email", error);
  }
}

/**
 * Send email when a copy trade closes with loss
 */
export async function sendCopyTradingTradeLossEmail(
  user: any,
  leaderName: string,
  subscriptionId: string,
  trade: {
    symbol: string;
    side: string;
    entryPrice: number;
    exitPrice: number;
    loss: number;
  },
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing trade loss email to ${user.email}`);

  const emailData = {
    TO: user.email,
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
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingTradeLoss",
    });
    ctx?.success?.(`Trade loss email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue trade loss email", error);
  }
}

/**
 * Send email when daily loss limit is reached
 */
export async function sendCopyTradingDailyLossLimitEmail(
  user: any,
  leaderName: string,
  dailyLossLimit: number,
  currentLoss: number,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing daily loss limit email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leaderName,
    DAILY_LOSS_LIMIT: dailyLossLimit.toFixed(2),
    CURRENT_LOSS: currentLoss.toFixed(2),
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingDailyLossLimitReached",
    });
    ctx?.success?.(`Daily loss limit email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue daily loss limit email", error);
  }
}

/**
 * Send email when there's insufficient balance to copy a trade
 */
export async function sendCopyTradingInsufficientBalanceEmail(
  user: any,
  leaderName: string,
  subscriptionId: string,
  symbol: string,
  requiredAmount: number,
  availableBalance: number,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing insufficient balance email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    LEADER_NAME: leaderName,
    SYMBOL: symbol,
    REQUIRED_AMOUNT: requiredAmount.toFixed(2),
    AVAILABLE_BALANCE: availableBalance.toFixed(2),
    SUBSCRIPTION_ID: subscriptionId,
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingInsufficientBalance",
    });
    ctx?.success?.(`Insufficient balance email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue insufficient balance email", error);
  }
}

/**
 * Send email when a leader earns profit share
 */
export async function sendCopyTradingProfitShareEarnedEmail(
  user: any,
  followerName: string,
  symbol: string,
  followerProfit: number,
  profitSharePercent: number,
  profitShareAmount: number,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing profit share earned email to ${user.email}`);

  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    FOLLOWER_NAME: followerName,
    SYMBOL: symbol,
    FOLLOWER_PROFIT: followerProfit.toFixed(2),
    PROFIT_SHARE_PERCENT: profitSharePercent.toString(),
    PROFIT_SHARE_AMOUNT: profitShareAmount.toFixed(2),
    URL: process.env.NEXT_PUBLIC_SITE_URL || "https://yoursite.com",
  };

  try {
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingProfitShareEarned",
    });
    ctx?.success?.(`Profit share earned email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue profit share earned email", error);
  }
}

/**
 * Send email when a follower pays profit share
 */
export async function sendCopyTradingProfitSharePaidEmail(
  user: any,
  leaderName: string,
  symbol: string,
  yourProfit: number,
  profitSharePercent: number,
  profitShareAmount: number,
  netProfit: number,
  ctx?: LogContext
) {
  ctx?.step?.(`Queueing profit share paid email to ${user.email}`);

  const emailData = {
    TO: user.email,
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
    await emailQueue.add({
      emailData,
      emailType: "CopyTradingProfitSharePaid",
    });
    ctx?.success?.(`Profit share paid email queued successfully`);
  } catch (error) {
    ctx?.fail?.((error as Error).message);
    logger.error("EMAIL", "Failed to queue profit share paid email", error);
  }
}
