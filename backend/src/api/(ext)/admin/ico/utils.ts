import { emailQueue } from "@b/utils/emails";

interface LogContext {
  step?: (message: string) => void;
  success?: (message: string) => void;
  fail?: (message: string) => void;
}

export async function sendIcoEmail(
  emailType: string,
  recipientEmail: string,
  replacements: Record<string, string>,
  ctx?: LogContext
): Promise<void> {
  try {
    ctx?.step?.(`Sending ${emailType} email to ${recipientEmail}`);

    // Construct the email data
    const emailData = {
      TO: recipientEmail,
      ...replacements,
    };

    // Queue the email for sending
    await emailQueue.add({ emailData, emailType });

    ctx?.success?.(`Email ${emailType} queued successfully`);
  } catch (error: any) {
    ctx?.fail?.(error.message || `Failed to send ${emailType} email`);
    throw error;
  }
}

export async function sendIcoBuyerEmail(
  recipientEmail: string,
  replacements: Record<string, string>,
  ctx?: LogContext
): Promise<void> {
  await sendIcoEmail(
    "IcoInvestmentOccurredBuyer",
    recipientEmail,
    replacements,
    ctx
  );
}

export async function sendIcoSellerEmail(
  recipientEmail: string,
  replacements: Record<string, string>,
  ctx?: LogContext
): Promise<void> {
  await sendIcoEmail(
    "IcoInvestmentOccurredSeller",
    recipientEmail,
    replacements,
    ctx
  );
}
