import { emailQueue } from "@b/utils/emails";

/**
 * Send P2P offer-related emails
 */
export async function sendP2POfferEmail(
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

/**
 * Send offer approval email
 */
export async function sendOfferApprovalEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendP2POfferEmail(
    "P2POfferApproved",
    recipientEmail,
    replacements
  );
}

/**
 * Send offer rejection email
 */
export async function sendOfferRejectionEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendP2POfferEmail(
    "P2POfferRejected",
    recipientEmail,
    replacements
  );
}

/**
 * Send offer flagged email
 */
export async function sendOfferFlaggedEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendP2POfferEmail(
    "P2POfferFlagged",
    recipientEmail,
    replacements
  );
}

/**
 * Send offer disabled email
 */
export async function sendOfferDisabledEmail(
  recipientEmail: string,
  replacements: Record<string, string>
): Promise<void> {
  await sendP2POfferEmail(
    "P2POfferDisabled",
    recipientEmail,
    replacements
  );
}