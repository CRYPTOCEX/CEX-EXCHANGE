"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendP2POfferEmail = sendP2POfferEmail;
exports.sendOfferApprovalEmail = sendOfferApprovalEmail;
exports.sendOfferRejectionEmail = sendOfferRejectionEmail;
exports.sendOfferFlaggedEmail = sendOfferFlaggedEmail;
exports.sendOfferDisabledEmail = sendOfferDisabledEmail;
const emails_1 = require("@b/utils/emails");
async function sendP2POfferEmail(emailType, recipientEmail, replacements) {
    const emailData = {
        TO: recipientEmail,
        ...replacements,
    };
    await emails_1.emailQueue.add({ emailData, emailType });
}
async function sendOfferApprovalEmail(recipientEmail, replacements) {
    await sendP2POfferEmail("P2POfferApproved", recipientEmail, replacements);
}
async function sendOfferRejectionEmail(recipientEmail, replacements) {
    await sendP2POfferEmail("P2POfferRejected", recipientEmail, replacements);
}
async function sendOfferFlaggedEmail(recipientEmail, replacements) {
    await sendP2POfferEmail("P2POfferFlagged", recipientEmail, replacements);
}
async function sendOfferDisabledEmail(recipientEmail, replacements) {
    await sendP2POfferEmail("P2POfferDisabled", recipientEmail, replacements);
}
