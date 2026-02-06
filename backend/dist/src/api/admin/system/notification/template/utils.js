"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationTemplateUpdateSchema = exports.NotificationTemplateSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the notification template");
const name = (0, schema_1.baseStringSchema)("Name of the notification template");
const subject = (0, schema_1.baseStringSchema)("Subject line used in the notification template");
const emailBody = (0, schema_1.baseStringSchema)("Body content for email notifications", 5000);
const smsBody = (0, schema_1.baseStringSchema)("Body content for SMS notifications", 5000);
const pushBody = (0, schema_1.baseStringSchema)("Body content for push notifications", 5000);
const shortCodes = (0, schema_1.baseObjectSchema)("Short codes used within the template for dynamic content", true);
const email = (0, schema_1.baseBooleanSchema)("Whether this template is used for emails");
const sms = (0, schema_1.baseBooleanSchema)("Whether this template is used for SMS");
const push = (0, schema_1.baseBooleanSchema)("Whether this template is used for push notifications");
exports.NotificationTemplateSchema = {
    id,
    name,
    subject,
    emailBody,
    smsBody,
    pushBody,
    shortCodes,
    email,
    sms,
    push,
};
exports.notificationTemplateUpdateSchema = {
    type: "object",
    properties: {
        subject,
        emailBody,
        smsBody,
        pushBody,
        email,
        sms,
        push,
    },
    required: [
        "subject",
        "emailBody",
        "smsBody",
        "pushBody",
        "email",
        "sms",
        "push",
    ],
};
