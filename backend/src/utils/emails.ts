import Bull from "bull";
import type { EmailOptions } from "./mailer";
import {
  fetchAndProcessEmailTemplate,
  prepareEmailTemplate,
  sendEmailWithProvider,
} from "./mailer";
import { format } from "date-fns";
import { models } from "@b/db";
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
    console.log("Email sent successfully");
  } catch (error) {
    console.error("Failed to send email:", error);
    // Optionally: Re-queue or handle the job based on the error
    throw error;
  }
});

export async function sendEmail(
  specificVariables: any,
  templateName: string
): Promise<void> {
  let processedTemplate: string;
  let processedSubject: string;

  try {
    const result = await fetchAndProcessEmailTemplate(
      specificVariables,
      templateName
    );
    processedTemplate = result.processedTemplate;
    processedSubject = result.processedSubject;
  } catch (error) {
    console.error("Error processing email template:", error);
    throw error;
  }

  let finalEmailHtml: string;
  try {
    finalEmailHtml = await prepareEmailTemplate(
      processedTemplate,
      processedSubject
    );
  } catch (error) {
    console.error("Error preparing email template:", error);
    throw error;
  }

  const options: EmailOptions = {
    to: specificVariables["TO"] as string,
    subject: processedSubject,
    html: finalEmailHtml,
  };
  const emailer = APP_EMAILER;

  try {
    await sendEmailWithProvider(emailer, options);
  } catch (error) {
    console.error("Error sending email with provider:", error);
    throw error;
  }
}

export async function sendChatEmail(
  sender: any,
  receiver: any,
  chat: any,
  message: any,
  emailType: string
) {
  const emailData = {
    TO: receiver.email,
    SENDER_NAME: sender.firstName,
    RECEIVER_NAME: receiver.firstName,
    MESSAGE: message.text,
    TICKET_ID: chat.id,
  };

  await emailQueue.add({
    emailData,
    emailType,
  });
}

export async function sendFiatTransactionEmail(
  user: any,
  transaction: any,
  currency,
  newBalance: number
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "FiatWalletTransaction";

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
  await emailQueue.add({ emailData, emailType });
}

export async function sendBinaryOrderEmail(user: any, order: any) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "BinaryOrderResult";

  let profit = 0;
  let sign;
  switch (order.status) {
    case "WIN":
      profit = order.amount + order.amount * (order.profit / 100);
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
  await emailQueue.add({ emailData, emailType });
}

export async function sendWalletBalanceUpdateEmail(
  user: any,
  wallet: any,
  action: "added" | "subtracted",
  amount: number,
  newBalance: number
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "WalletBalanceUpdate";

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
  await emailQueue.add({ emailData, emailType });
}

export async function sendTransactionStatusUpdateEmail(
  user: any,
  transaction: any,
  wallet: any,
  newBalance: number,
  note?: string | null
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "TransactionStatusUpdate";

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
  await emailQueue.add({ emailData, emailType });
}

export async function sendAuthorStatusUpdateEmail(user: any, author: any) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "AuthorStatusUpdate";

  // Prepare the email data
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AUTHOR_STATUS: author.status,
    APPLICATION_ID: author.id,
  };

  // Send the email
  await emailQueue.add({ emailData, emailType });
}

export async function sendOutgoingTransferEmail(
  user: any,
  toUser: any,
  wallet: any,
  amount: number,
  transactionId: string
) {
  const emailType = "OutgoingWalletTransfer";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    RECIPIENT_NAME: `${toUser.firstName} ${toUser.lastName}`,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendIncomingTransferEmail(
  user: any,
  fromUser: any,
  wallet: any,
  amount: number,
  transactionId: string
) {
  const emailType = "IncomingWalletTransfer";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.firstName,
    AMOUNT: amount,
    CURRENCY: wallet.currency,
    NEW_BALANCE: wallet.balance,
    TRANSACTION_ID: transactionId,
    SENDER_NAME: `${fromUser.firstName} ${fromUser.lastName}`,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendSpotWalletWithdrawalConfirmationEmail(
  user: userAttributes,
  transaction: transactionAttributes,
  wallet: walletAttributes
) {
  // Define the type of email template to use, which matches the SQL record
  const emailType = "SpotWalletWithdrawalConfirmation";

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
  await emailQueue.add({ emailData, emailType });
}

export async function sendSpotWalletDepositConfirmationEmail(
  user: userAttributes,
  transaction: transactionAttributes,
  wallet: walletAttributes,
  chain: string
) {
  // Define the type of email template to use, which should match the SQL record
  const emailType = "SpotWalletDepositConfirmation";

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
  await emailQueue.add({ emailData, emailType });
}

export async function sendAiInvestmentEmail(
  user: any,
  plan: any,
  duration: any,
  investment: any,
  emailType:
    | "NewAiInvestmentCreated"
    | "AiInvestmentCompleted"
    | "AiInvestmentCanceled"
) {
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

  await emailQueue.add({ emailData, emailType });
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
    | "ForexInvestmentCanceled"
) {
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

  await emailQueue.add({ emailData, emailType });
}

export async function sendIcoContributionEmail(
  user: any,
  contribution: any,
  token: any,
  phase: any,
  emailType: "IcoNewContribution" | "IcoContributionPaid",
  transactionId?: string
) {
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

  await emailQueue.add({ emailData, emailType });
}

// Function to send an email when a user initiates a stake
export async function sendStakingInitiationEmail(user, stake, pool, reward) {
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

  await emailQueue.add({
    emailData,
    emailType: "StakingInitiationConfirmation",
  });
}

export async function sendStakingRewardEmail(user, stake, pool, reward) {
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

  await emailQueue.add({ emailData, emailType: "StakingRewardDistribution" });
}
export async function sendOrderConfirmationEmail(user, order, product) {
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

  await emailQueue.add({ emailData, emailType: "OrderConfirmation" });
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
  html: string
): Promise<void> {
  // Options for the email.
  const options: EmailOptions = {
    to,
    subject,
    html,
  };

  // Select the email provider.
  const emailer = APP_EMAILER;

  await sendEmailWithProvider(emailer, options);
}

export async function sendKycEmail(user: any, kyc: any, type: string) {
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
  await emailQueue.add({ emailData, emailType: type });
}

export async function sendForexTransactionEmail(
  user: any,
  transaction: any,
  account: any,
  currency: any,
  transactionType: "FOREX_DEPOSIT" | "FOREX_WITHDRAW"
) {
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

  await emailQueue.add({ emailData, emailType });
}
