// Import your utility functions for schema definitions
import {
  baseStringSchema,
  baseBooleanSchema,
  baseObjectSchema,
} from "@b/utils/schema";

// Base schema components for notification templates
const id = baseStringSchema("ID of the notification template");
const name = baseStringSchema("Name of the notification template");
const subject = baseStringSchema(
  "Subject line used in the notification template"
);
const emailBody = baseStringSchema(
  "Body content for email notifications",
  5000
);
const smsBody = baseStringSchema("Body content for SMS notifications", 5000);
const pushBody = baseStringSchema("Body content for push notifications", 5000);
const shortCodes = baseObjectSchema(
  "Short codes used within the template for dynamic content",
  true
);
const email = baseBooleanSchema("Whether this template is used for emails");
const sms = baseBooleanSchema("Whether this template is used for SMS");
const push = baseBooleanSchema(
  "Whether this template is used for push notifications"
);

// Schema for defining a new notification template
export const NotificationTemplateSchema = {
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

// Schema for updating a notification template
export const notificationTemplateUpdateSchema = {
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
