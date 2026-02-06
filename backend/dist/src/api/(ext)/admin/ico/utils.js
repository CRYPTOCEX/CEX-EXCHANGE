"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendIcoEmail = sendIcoEmail;
exports.sendIcoBuyerEmail = sendIcoBuyerEmail;
exports.sendIcoSellerEmail = sendIcoSellerEmail;
const emails_1 = require("@b/utils/emails");
async function sendIcoEmail(emailType, recipientEmail, replacements, ctx) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Sending ${emailType} email to ${recipientEmail}`);
        const emailData = {
            TO: recipientEmail,
            ...replacements,
        };
        await emails_1.emailQueue.add({ emailData, emailType });
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _b === void 0 ? void 0 : _b.call(ctx, `Email ${emailType} queued successfully`);
    }
    catch (error) {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _c === void 0 ? void 0 : _c.call(ctx, error.message || `Failed to send ${emailType} email`);
        throw error;
    }
}
async function sendIcoBuyerEmail(recipientEmail, replacements, ctx) {
    await sendIcoEmail("IcoInvestmentOccurredBuyer", recipientEmail, replacements, ctx);
}
async function sendIcoSellerEmail(recipientEmail, replacements, ctx) {
    await sendIcoEmail("IcoInvestmentOccurredSeller", recipientEmail, replacements, ctx);
}
