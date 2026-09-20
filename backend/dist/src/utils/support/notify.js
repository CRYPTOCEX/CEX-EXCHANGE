"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toEmailPreview = toEmailPreview;
exports.notifySupportMessage = notifySupportMessage;
const emails_1 = require("@b/utils/emails");
const console_1 = require("@b/utils/console");
const PREVIEW_CHARS = 500;
function toEmailPreview(message, limit = PREVIEW_CHARS) {
    const plain = String(message !== null && message !== void 0 ? message : "")
        .replace(/<br\s*\/?>/gi, "\n")
        .replace(/<\/(p|div|li|h[1-6]|tr)>/gi, "\n")
        .replace(/<[^>]*>/g, "")
        .replace(/```[\s\S]*?```/g, " [code] ")
        .replace(/[*_`]{1,3}/g, "")
        .replace(/\r/g, "")
        .replace(/[ \t]+/g, " ")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
    const clipped = plain.length > limit ? `${plain.slice(0, limit).trimEnd()}…` : plain;
    return clipped
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;")
        .replace(/\n/g, "<br />");
}
function displayName(target) {
    const name = [target.firstName, target.lastName]
        .filter((part) => typeof part === "string" && part.trim())
        .join(" ")
        .trim();
    return name || "there";
}
async function notifySupportMessage(options) {
    var _a;
    var _b;
    const email = String((_b = (_a = options.recipient) === null || _a === void 0 ? void 0 : _a.email) !== null && _b !== void 0 ? _b : "").trim();
    if (!email) {
        return false;
    }
    const preview = toEmailPreview(options.message);
    if (!preview)
        return false;
    try {
        await (0, emails_1.sendEmail)({
            TO: email,
            RECEIVER_NAME: displayName(options.recipient),
            SENDER_NAME: options.senderName || "Support",
            TICKET_ID: options.ticketId,
            MESSAGE: preview,
        }, "SupportMessage", options.ctx);
        return true;
    }
    catch (error) {
        console_1.logger.error("SUPPORT", `SupportMessage email failed for ticket ${options.ticketId}`, error);
        return false;
    }
}
