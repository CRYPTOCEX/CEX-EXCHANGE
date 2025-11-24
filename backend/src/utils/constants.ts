import path from "path";
export const appName = process.env.NEXT_PUBLIC_SITE_NAME || "Platform";
export const isProduction = process.env.NODE_ENV === "production";
export const baseUrl = path.join(process.cwd(), isProduction ? "dist" : "");
export const AUTH_PAGES = ["/api/auth", "/api/profile"];
export const isDemo = process.env.NEXT_PUBLIC_DEMO_STATUS === "true" || false;

// Mail
export const APP_EMAILER = process.env.APP_EMAILER || "nodemailer-service";
export const APP_NODEMAILER_SERVICE = process.env.APP_NODEMAILER_SERVICE || "";
export const APP_NODEMAILER_SERVICE_SENDER =
  process.env.APP_NODEMAILER_SERVICE_SENDER || "";
export const APP_NODEMAILER_SERVICE_PASSWORD =
  process.env.APP_NODEMAILER_SERVICE_PASSWORD || "";
export const APP_NODEMAILER_SMTP_SENDER =
  process.env.APP_NODEMAILER_SMTP_SENDER || "";
export const APP_NODEMAILER_SMTP_PASSWORD =
  process.env.APP_NODEMAILER_SMTP_PASSWORD || "";
export const APP_NODEMAILER_SMTP_HOST =
  process.env.APP_NODEMAILER_SMTP_HOST || "smtp.gmail.com";
export const APP_NODEMAILER_SMTP_PORT =
  process.env.APP_NODEMAILER_SMTP_PORT || "465";
export const APP_NODEMAILER_SMTP_ENCRYPTION =
  process.env.APP_NODEMAILER_SMTP_ENCRYPTION || "ssl";
export const APP_SENDGRID_API_KEY = process.env.APP_SENDGRID_API_KEY || "";
export const APP_SENDGRID_SENDER = process.env.APP_SENDGRID_SENDER || "";
export const NEXT_PUBLIC_SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || "";
export const NEXT_PUBLIC_SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME || "";
export const APP_SENDMAIL_PATH =
  process.env.APP_SENDMAIL_PATH || "/usr/sbin/sendmail";
export const NEXT_PUBLIC_APP_EMAIL = process.env.NEXT_PUBLIC_APP_EMAIL || "";

export const APP_TWILIO_ACCOUNT_SID = process.env.APP_TWILIO_ACCOUNT_SID;
export const APP_TWILIO_AUTH_TOKEN = process.env.APP_TWILIO_AUTH_TOKEN;
export const APP_TWILIO_PHONE_NUMBER = process.env.APP_TWILIO_PHONE_NUMBER;

export const apiNotFoundResponse = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>404 Not Found</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 40px;
    }
  </style>
</head>
<body>
  <h1>404 Not Found</h1>
  <p>The resource you are looking for is not available.</p>
</body>
</html>`;

export const structureSchema = {
  "application/json": {
    schema: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "object",
            properties: {
              type: {
                type: "string",
                enum: ["input", "select", "switch", "file"],
              },
              label: { type: "string" },
              name: { type: "string" },
              placeholder: { type: "string", nullable: true },
              options: {
                type: "array",
                items: { type: "string" },
                nullable: true,
              },
              fileType: { type: "string", nullable: true },
              width: { type: "integer", nullable: true },
              height: { type: "integer", nullable: true },
              maxSize: { type: "number", nullable: true },
              notNull: { type: "boolean", nullable: true },
              ts: { type: "string" },
            },
            required: ["type", "label", "name"],
          },
          {
            type: "array",
            items: {
              type: "object",
              properties: {
                type: {
                  type: "string",
                  enum: ["input", "select", "switch", "file"],
                },
                label: { type: "string" },
                name: { type: "string" },
                placeholder: { type: "string", nullable: true },
                options: {
                  type: "array",
                  items: { type: "string" },
                  nullable: true,
                },
                fileType: { type: "string", nullable: true },
                width: { type: "integer", nullable: true },
                height: { type: "integer", nullable: true },
                maxSize: { type: "number", nullable: true },
                notNull: { type: "boolean", nullable: true },
                ts: { type: "string" },
              },
              required: ["type", "label", "name"],
            },
          },
        ],
      },
    },
  },
};

export const paginationSchema = {
  type: "object",
  properties: {
    totalItems: {
      type: "integer",
      description: "Total number of users",
    },
    currentPage: {
      type: "integer",
      description: "Current page number",
    },
    perPage: {
      type: "integer",
      description: "Number of users per page",
    },
    totalPages: {
      type: "integer",
      description: "Total number of pages",
    },
  },
};

export const crudParameters: ParameterObject[] = [
  {
    name: "filter",
    in: "query",
    description: "Filter criteria for records.",
    required: false,
    schema: { type: "string" },
  },
  {
    name: "perPage",
    in: "query",
    description: "Number of records per page. Default: 10.",
    required: false,
    schema: { type: "number" },
  },
  {
    name: "page",
    in: "query",
    description: "Page number. Default: 1.",
    required: false,
    schema: { type: "number" },
  },
  {
    name: "sortField",
    in: "query",
    description: "Field name to sort by.",
    required: false,
    schema: { type: "string" },
  },
  {
    name: "sortOrder",
    in: "query",
    description: "Order of sorting: asc or desc.",
    required: false,
    schema: { type: "string", enum: ["asc", "desc"] },
  },
  {
    name: "showDeleted",
    in: "query",
    description: "Show deleted records. Default: false.",
    required: false,
    schema: { type: "boolean" },
  },
];
