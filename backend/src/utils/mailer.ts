import sgMail from "@sendgrid/mail";
import fs from "fs";
import nodemailer from "nodemailer";
import {
  APP_NODEMAILER_SERVICE,
  APP_NODEMAILER_SERVICE_PASSWORD,
  APP_NODEMAILER_SERVICE_SENDER,
  APP_NODEMAILER_SMTP_ENCRYPTION,
  APP_NODEMAILER_SMTP_HOST,
  APP_NODEMAILER_SMTP_PASSWORD,
  APP_NODEMAILER_SMTP_PORT,
  APP_NODEMAILER_SMTP_SENDER,
  NEXT_PUBLIC_SITE_NAME,
  NEXT_PUBLIC_SITE_URL,
  APP_SENDGRID_API_KEY,
  APP_SENDGRID_SENDER,
  APP_SENDMAIL_PATH,
} from "./constants";
import { createError } from "./error";
import { models } from "@b/db";
import { logError } from "@b/utils/logger";
import { CacheManager } from "@b/utils/cache";
import { loadEmailTemplate } from "./emailTemplates";

export interface EmailOptions {
  to: string;
  from?: string;
  subject: string;
  html?: string;
  text?: string;
}

export async function sendEmailWithProvider(
  provider: string,
  options: EmailOptions
) {
  console.log(`[EMAIL DEBUG] Starting email send with provider: ${provider}`);
  console.log(`[EMAIL DEBUG] Recipient: ${options.to}`);
  console.log(`[EMAIL DEBUG] Subject: ${options.subject}`);
  
  try {
    switch (provider) {
      case "local":
        const localSenderName = process.env.APP_EMAIL_SENDER_NAME || NEXT_PUBLIC_SITE_NAME || "Support";
        const localSenderEmail = process.env.NEXT_PUBLIC_APP_EMAIL || "no-reply@localhost";
        options.from = `"${localSenderName}" <${localSenderEmail}>`;
        console.log(`[EMAIL DEBUG] Local SMTP - From: ${options.from}`);
        await emailWithLocalSMTP(options);
        break;

      case "nodemailer-service":
        const serviceSenderName = process.env.APP_EMAIL_SENDER_NAME || NEXT_PUBLIC_SITE_NAME || "Support";
        options.from = `"${serviceSenderName}" <${APP_NODEMAILER_SERVICE_SENDER}>`;
        console.log(`[EMAIL DEBUG] Nodemailer Service - From: ${options.from}`);
        console.log(`[EMAIL DEBUG] Service: ${APP_NODEMAILER_SERVICE}`);
        await emailWithNodemailerService(
          APP_NODEMAILER_SERVICE_SENDER,
          APP_NODEMAILER_SERVICE_PASSWORD,
          APP_NODEMAILER_SERVICE,
          options
        );
        break;

      case "nodemailer-smtp":
        const senderEmail = process.env.NEXT_PUBLIC_APP_EMAIL &&
          process.env.NEXT_PUBLIC_APP_EMAIL !== ""
            ? process.env.NEXT_PUBLIC_APP_EMAIL
            : APP_NODEMAILER_SMTP_SENDER;
        const senderName = process.env.APP_EMAIL_SENDER_NAME || NEXT_PUBLIC_SITE_NAME || "Support";
        options.from = `"${senderName}" <${senderEmail}>`;
        console.log(`[EMAIL DEBUG] SMTP - From: ${options.from}`);
        console.log(`[EMAIL DEBUG] SMTP Host: ${APP_NODEMAILER_SMTP_HOST}:${APP_NODEMAILER_SMTP_PORT}`);
        console.log(`[EMAIL DEBUG] SMTP Encryption: ${APP_NODEMAILER_SMTP_ENCRYPTION}`);
        
        // Determine secure setting based on port and encryption setting
        const isSecure = APP_NODEMAILER_SMTP_PORT === "465" || APP_NODEMAILER_SMTP_ENCRYPTION === "ssl";
        
        await emailWithNodemailerSmtp(
          APP_NODEMAILER_SMTP_SENDER,
          APP_NODEMAILER_SMTP_PASSWORD,
          APP_NODEMAILER_SMTP_HOST,
          APP_NODEMAILER_SMTP_PORT,
          isSecure,
          options
        );
        break;

      case "nodemailer-sendgrid":
        const sendgridSenderName = process.env.APP_EMAIL_SENDER_NAME || NEXT_PUBLIC_SITE_NAME || "Support";
        options.from = `"${sendgridSenderName}" <${APP_SENDGRID_SENDER}>`;
        console.log(`[EMAIL DEBUG] SendGrid - From: ${options.from}`);
        await emailWithSendgrid(options);
        break;

      default:
        console.error(`[EMAIL DEBUG] Unsupported provider: ${provider}`);
        throw new Error("Unsupported email provider");
    }
    console.log(`[EMAIL DEBUG] Email sent successfully to ${options.to}`);
  } catch (error) {
    console.error(`[EMAIL DEBUG] Error sending email:`, error);
    logError("email", error, __filename);
    throw error;
  }
}

async function emailWithLocalSMTP(options: EmailOptions): Promise<void> {
  try {
    const transporterOptions: {
      sendmail?: boolean;
      newline?: string;
      path?: string;
      dkim?: {
        privateKey: string;
        domainName: string;
        keySelector: string;
      };
    } = {
      sendmail: true,
      newline: "unix",
      path: APP_SENDMAIL_PATH,
    };

    const APP_NODEMAILER_DKIM_PRIVATE_KEY =
      process.env.APP_NODEMAILER_DKIM_PRIVATE_KEY || "";
    const APP_NODEMAILER_DKIM_DOMAIN =
      process.env.APP_NODEMAILER_DKIM_DOMAIN || "";
    const APP_NODEMAILER_DKIM_SELECTOR =
      process.env.APP_NODEMAILER_DKIM_SELECTOR || "default";

    if (
      APP_NODEMAILER_DKIM_PRIVATE_KEY &&
      APP_NODEMAILER_DKIM_DOMAIN &&
      APP_NODEMAILER_DKIM_SELECTOR
    ) {
      transporterOptions.dkim = {
        privateKey: fs.readFileSync(APP_NODEMAILER_DKIM_PRIVATE_KEY, "utf8"),
        domainName: APP_NODEMAILER_DKIM_DOMAIN,
        keySelector: APP_NODEMAILER_DKIM_SELECTOR,
      };
    }

    const transporter = nodemailer.createTransport(transporterOptions);

    const mailOptions = {
      from: options.from,
      to: options.to,
      subject: options.subject,
      html: options.html,
      text: options.text,
    };

    await transporter.sendMail(mailOptions);
  } catch (error) {
    logError("email", error, __filename);
    throw error;
  }
}

export async function emailWithSendgrid(options: EmailOptions): Promise<void> {
  const apiKey = APP_SENDGRID_API_KEY;

  if (!apiKey)
    throw createError({
      statusCode: 500,
      message: "Sendgrid Api key not found. Cannot send email. Aborting.",
    });

  try {
    sgMail.setApiKey(apiKey);

    const msg: any = {
      to: options.to,
      from: options.from,
      subject: options.subject,
      html: options.html ? options.html : options.text,
    };

    await sgMail.send(msg);
  } catch (error) {
    logError("email", error, __filename);
    throw error;
  }
}

export async function emailWithNodemailerService(
  sender: string,
  password: string,
  service: string,
  options: EmailOptions
): Promise<void> {
  const emailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  console.log(`[EMAIL DEBUG] Nodemailer Service Config:`);
  console.log(`[EMAIL DEBUG] - Service: ${service}`);
  console.log(`[EMAIL DEBUG] - Sender: ${sender}`);
  console.log(`[EMAIL DEBUG] - Has Password: ${password ? 'Yes' : 'No'}`);

  if (!service)
    throw createError({
      statusCode: 500,
      message: "Email service not specified. Aborting email send.",
    });

  if (!sender)
    throw createError({
      statusCode: 500,
      message: "Email user not specified. Aborting email send.",
    });

  if (!password)
    throw createError({
      statusCode: 500,
      message: "Email password not specified. Aborting email send.",
    });

  try {
    console.log(`[EMAIL DEBUG] Creating transporter...`);
    const transporter = await nodemailer.createTransport({
      service: service,
      auth: {
        user: sender,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    
    console.log(`[EMAIL DEBUG] Verifying transporter...`);
    await transporter.verify();
    console.log(`[EMAIL DEBUG] Transporter verified successfully`);
    
    console.log(`[EMAIL DEBUG] Sending email...`);
    const info = await transporter.sendMail(emailOptions);
    console.log(`[EMAIL DEBUG] Email sent! Message ID: ${info.messageId}`);
    console.log(`[EMAIL DEBUG] Response: ${info.response}`);
  } catch (error) {
    console.error(`[EMAIL DEBUG] Service error:`, error);
    logError("email", error, __filename);
    throw error;
  }
}

export async function emailWithNodemailerSmtp(
  sender: string,
  password: string,
  host: string,
  port: string,
  smtpEncryption: boolean,
  options: EmailOptions
): Promise<void> {
  const emailOptions = {
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
  };

  console.log(`[EMAIL DEBUG] SMTP Config:`);
  console.log(`[EMAIL DEBUG] - Host: ${host}`);
  console.log(`[EMAIL DEBUG] - Port: ${port}`);
  console.log(`[EMAIL DEBUG] - Sender: ${sender}`);
  console.log(`[EMAIL DEBUG] - Has Password: ${password ? 'Yes' : 'No'}`);
  console.log(`[EMAIL DEBUG] - Encryption: ${smtpEncryption}`);

  if (!host)
    throw createError({
      statusCode: 500,
      message: "Email host not specified. Aborting email send.",
    });

  if (!sender)
    throw createError({
      statusCode: 500,
      message: "Email user not specified. Aborting email send.",
    });

  if (!password)
    throw createError({
      statusCode: 500,
      message: "Email password not specified. Aborting email send.",
    });

  try {
    console.log(`[EMAIL DEBUG] Creating SMTP transporter...`);
    const transportConfig = {
      host: host,
      port: parseInt(port),
      pool: true,
      secure: smtpEncryption,
      auth: {
        user: sender,
        pass: password,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true
    };
    
    console.log(`[EMAIL DEBUG] Transport config:`, JSON.stringify(transportConfig, null, 2));
    const transporter = await nodemailer.createTransport(transportConfig);
    
    console.log(`[EMAIL DEBUG] Verifying SMTP connection...`);
    await transporter.verify();
    console.log(`[EMAIL DEBUG] SMTP connection verified`);
    
    console.log(`[EMAIL DEBUG] Sending email via SMTP...`);
    const info = await transporter.sendMail(emailOptions);
    console.log(`[EMAIL DEBUG] Email sent! Message ID: ${info.messageId}`);
    console.log(`[EMAIL DEBUG] Accepted recipients:`, info.accepted);
    console.log(`[EMAIL DEBUG] Rejected recipients:`, info.rejected);
    console.log(`[EMAIL DEBUG] Response: ${info.response}`);
  } catch (error) {
    console.error(`[EMAIL DEBUG] SMTP error:`, error);
    logError("email", error, __filename);
    throw error;
  }
}

export async function prepareEmailTemplate(
  processedTemplate: string,
  processedSubject: string
): Promise<string> {
  const generalTemplate = loadEmailTemplate("generalTemplate");

  if (!generalTemplate) {
    throw createError({
      statusCode: 500,
      message: "General email template not found",
    });
  }

  // Use direct logo links instead of settings
  const logoUrl = `${NEXT_PUBLIC_SITE_URL}/img/logo/logo-text.webp`;
  const siteName = NEXT_PUBLIC_SITE_NAME || "Bicrypto";

  const replacements = {
    "%SITE_URL%": NEXT_PUBLIC_SITE_URL,
    "%SITE_NAME%": siteName,
    "%LOGO_URL%": logoUrl,
    "%HEADER%": processedSubject,
    "%MESSAGE%": processedTemplate,
    "%SUBJECT%": processedSubject,
    "%FOOTER%": siteName,
  };

  return Object.entries(replacements).reduce(
    (acc, [key, value]) => replaceAllOccurrences(acc, key, value),
    generalTemplate
  );
}

export async function fetchAndProcessEmailTemplate(
  specificVariables: any,
  templateName: string
): Promise<{
  processedTemplate: string;
  processedSubject: string;
  templateRecord: any;
}> {
  try {
    const templateRecord = await models.notificationTemplate.findOne({
      where: { name: templateName },
    });

    if (!templateRecord || !templateRecord.email || !templateRecord.emailBody)
      throw createError({
        statusCode: 404,
        message: "Email template not found or email not enabled",
      });

    const basicVariables = {
      URL: NEXT_PUBLIC_SITE_URL,
    };

    const variables = {
      ...basicVariables,
      ...specificVariables,
    };

    const processedTemplate = replaceTemplateVariables(
      templateRecord.emailBody,
      variables
    );

    const processedSubject = replaceTemplateVariables(
      templateRecord.subject,
      variables
    );

    return { processedTemplate, processedSubject, templateRecord };
  } catch (error) {
    logError("email", error, __filename);
    throw error;
  }
}

export function replaceTemplateVariables(
  template: string,
  variables: Record<string, string | number | undefined>
): string {
  if (typeof template !== "string") {
    console.error("Template is not a string");
    return "";
  }
  return Object.entries(variables).reduce((acc, [key, value]) => {
    if (value === undefined) {
      console.warn(`Variable ${key} is undefined`);
      return acc;
    }
    return acc.replace(new RegExp(`%${key}%`, "g"), String(value));
  }, template);
}

function replaceAllOccurrences(
  str: string,
  search: string | RegExp,
  replace: string
): string {
  if (str == null) {
    console.error("Input string is null or undefined");
    return "";
  }
  const regex = new RegExp(search, "g");
  return str.replace(regex, replace);
}
