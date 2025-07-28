import fs from "fs";
import path from "path";
import { createError } from "../utils/error";

export interface EmailTemplateOptions {
  templateName: string;
  variables: Record<string, string | number | undefined>;
}

/**
 * Get the correct email templates directory path with multiple fallbacks
 */
function getEmailTemplatesPath(): string {
  // Try multiple paths for email templates directory - similar to .env file loading
  const templatePaths = [
    path.resolve(process.cwd(), "backend", "email", "templates"),    // Production path (PRIORITY)
    path.resolve(__dirname, "../../../email", "templates"),         // Development relative path from src/utils
    path.resolve(process.cwd(), "email", "templates"),              // Legacy fallback
    path.resolve(__dirname, "../../email", "templates"),           // Another relative fallback
  ];

  for (const templatePath of templatePaths) {
    if (fs.existsSync(templatePath)) {
      console.log(`\x1b[32mEmail templates directory found at: ${templatePath}\x1b[0m`);
      return templatePath;
    }
  }

  console.warn(`\x1b[33mWarning: No email templates directory found. Tried paths: ${templatePaths.join(", ")}\x1b[0m`);
  // Return the first path as fallback (production path)
  return templatePaths[0];
}

/**
 * Load an email template from the templates directory
 */
export function loadEmailTemplate(templateName: string): string {
  const templatesDir = getEmailTemplatesPath();
  const templatePath = path.join(templatesDir, `${templateName}.html`);

  try {
    return fs.readFileSync(templatePath, "utf-8");
  } catch (error) {
    throw createError({
      statusCode: 500,
      message: `Email template '${templateName}' not found at ${templatePath}`,
    });
  }
}

/**
 * Replace variables in a template string
 */
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

/**
 * Process a standalone email template (not wrapped in general template)
 */
export function processStandaloneTemplate(
  templateName: string,
  variables: Record<string, string | number | undefined>
): string {
  const template = loadEmailTemplate(templateName);
  return replaceTemplateVariables(template, variables);
}

/**
 * Get list of available email templates
 */
export function getAvailableTemplates(): string[] {
  const templatesDir = getEmailTemplatesPath();

  try {
    return fs
      .readdirSync(templatesDir)
      .filter((file) => file.endsWith(".html"))
      .map((file) => file.replace(".html", ""));
  } catch (error) {
    console.error("Error reading templates directory:", error);
    return [];
  }
}

/**
 * Validate that all required variables are provided
 */
export function validateTemplateVariables(
  template: string,
  providedVariables: Record<string, any>
): { isValid: boolean; missingVariables: string[] } {
  const variablePattern = /%([A-Z_]+)%/g;
  const requiredVariables = new Set<string>();
  let match;

  while ((match = variablePattern.exec(template)) !== null) {
    requiredVariables.add(match[1]);
  }

  const missingVariables = Array.from(requiredVariables).filter(
    (variable) => !(variable in providedVariables) || providedVariables[variable] === undefined
  );

  return {
    isValid: missingVariables.length === 0,
    missingVariables,
  };
}

/**
 * Email template types for better type safety
 */
export const EMAIL_TEMPLATES = {
  GENERAL: "generalTemplate",
  WELCOME: "welcome",
  NOTIFICATION: "notification",
} as const;

export type EmailTemplateType = typeof EMAIL_TEMPLATES[keyof typeof EMAIL_TEMPLATES]; 