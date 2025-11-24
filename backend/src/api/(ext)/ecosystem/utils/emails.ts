import { emailQueue } from "../../../../utils/emails";

export async function sendWithdrawalStatusEmail(
  user: any,
  status: string,
  reason: string,
  transactionId: string,
  amount: number,
  currency: string
) {
  const emailType = "WithdrawalStatus";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    STATUS: status,
    REASON: reason,
    TRANSACTION_ID: transactionId,
    AMOUNT: amount,
    CURRENCY: currency,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendDepositConfirmationEmail(
  user: any,
  transactionId: string,
  amount: number,
  currency: string
) {
  const emailType = "DepositConfirmation";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    TRANSACTION_ID: transactionId,
    AMOUNT: amount,
    CURRENCY: currency,
  };

  await emailQueue.add({ emailData, emailType });
}

export async function sendTransferConfirmationEmail(
  user: any,
  recipient: any,
  transactionId: string,
  amount: number,
  currency: string
) {
  const emailType = "TransferConfirmation";
  const emailData = {
    TO: user.email,
    FIRSTNAME: user.first_name,
    TRANSACTION_ID: transactionId,
    AMOUNT: amount,
    CURRENCY: currency,
    RECIPIENT_NAME: `${recipient.first_name} ${recipient.last_name}`,
  };

  await emailQueue.add({ emailData, emailType });
}
