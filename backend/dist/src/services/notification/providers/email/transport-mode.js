"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolveMailTransportMode = resolveMailTransportMode;
function resolveMailTransportMode(emailer = process.env.APP_EMAILER) {
    const value = (emailer || "").trim().toLowerCase();
    switch (value) {
        case "local":
            return "sendmail";
        case "nodemailer-smtp":
            return "smtp";
        case "nodemailer-service":
        case "nodemailer-gmail":
            return "service";
        default:
            return process.env.APP_NODEMAILER_SERVICE ? "service" : "smtp";
    }
}
