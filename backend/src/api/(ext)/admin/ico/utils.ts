import { emailQueue } from "@b/utils/emails";

export async function sendIcoEmail(
  emailType: string,
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  // Construct the email data
  const emailData = {
    TO: recipientEmail,
    ...replacements,
  };

  // Queue the email for sending
  await emailQueue.add({ emailData, emailType });
}

export async function sendIcoBuyerEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendIcoEmail(
    "IcoInvestmentOccurredBuyer",
    recipientEmail,
    replacements
  );
}

export async function sendIcoSellerEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendIcoEmail(
    "IcoInvestmentOccurredSeller",
    recipientEmail,
    replacements
  );
}
