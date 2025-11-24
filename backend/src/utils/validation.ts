import { ErrorObject } from "ajv";
import Ajv from "ajv";
import addFormats from "ajv-formats";
import path from "path";

/**
 * Sanitize a file path to prevent path traversal.
 * For route setup, we need to be less strict than for user input.
 */
export function sanitizePath(inputPath: string): string {
  const normalizedPath = path.normalize(inputPath);
  return normalizedPath;
}

/**
 * Sanitize user input path to prevent path traversal attacks.
 * This is stricter and used for user-provided paths.
 */
export function sanitizeUserPath(inputPath: string): string {
  if (!inputPath || typeof inputPath !== 'string') {
    throw new Error('Invalid path provided');
  }

  // Remove any null bytes (security risk)
  if (inputPath.includes('\0') || inputPath.includes('%00')) {
    throw new Error('Path contains null bytes');
  }

  // Block obvious directory traversal attempts
  /* eslint-disable no-control-regex */
  const dangerousPatterns = [
    /\.\./g,           // Parent directory
    /\.\\/g,           // Current directory with slash
    /\.\\+/g,          // Multiple dots with slash
    /\/\.+\//g,        // Dots between slashes
    /^\.+/,            // Starting with dots
    /\.+$/,            // Ending with dots
    /\/+/g,            // Multiple consecutive slashes
    /\\+/g,            // Multiple consecutive backslashes
    /[<>:"|?*]/g,      // Windows invalid characters
    /[\x00-\x1F]/g,    // Control characters
  ];
  /* eslint-enable no-control-regex */

  let sanitized = inputPath;

  // Remove dangerous patterns
  for (const pattern of dangerousPatterns) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Normalize slashes
  sanitized = sanitized.replace(/\\/g, '/');
  
  // Remove leading/trailing slashes
  sanitized = sanitized.replace(/^\/+|\/+$/g, '');
  
  // Ensure no empty path or just slashes
  if (!sanitized || sanitized === '.' || sanitized === '/') {
    sanitized = 'default';
  }

  // Additional security check: block system directories
  const blockedPaths = ['etc', 'bin', 'usr', 'var', 'proc', 'sys', 'dev', 'boot', 'root', 'home'];
  const pathParts = sanitized.toLowerCase().split('/');
  
  for (const part of pathParts) {
    if (blockedPaths.includes(part)) {
      throw new Error(`Access to system directory '${part}' is not allowed`);
    }
  }

  // Limit path length to prevent buffer overflow attacks
  if (sanitized.length > 200) {
    throw new Error('Path too long');
  }

  // Ensure path only contains safe characters
  if (!/^[a-zA-Z0-9_\-/]+$/.test(sanitized)) {
    throw new Error('Path contains invalid characters');
  }

  return sanitized;
}

/**
 * Validate that a resolved path is within the allowed base directory
 */
export function validatePathSecurity(resolvedPath: string, allowedBasePath: string): boolean {
  try {
    const normalizedPath = path.resolve(resolvedPath);
    const normalizedBase = path.resolve(allowedBasePath);
    
    // Check if the resolved path starts with the base path
    return normalizedPath.startsWith(normalizedBase + path.sep) || normalizedPath === normalizedBase;
  } catch (error) {
    console.error('Path validation error:', error);
    return false;
  }
}

/**
 * Recursively convert "true"/"false" strings into booleans.
 */
function convertBooleanStrings(value: any): any {
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  } else if (typeof value === "object" && value !== null) {
    for (const key in value) {
      value[key] = convertBooleanStrings(value[key]);
    }
  }
  return value;
}

/**
 * Traverse the given schema based on a dot-separated path.
 * If any property is missing, return an empty object.
 */
function getFieldSchema(pathStr: string, schema: any): any {
  return pathStr
    .split(".")
    .reduce(
      (acc, key) =>
        acc && acc.properties && acc.properties[key] ? acc.properties[key] : {},
      schema
    );
}

/**
 * Convert a dot-separated schema path into a friendly field name.
 */
function toFriendlyName(pathStr: string): string {
  const lastSegment = pathStr.split(".").pop() || pathStr;
  return lastSegment
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

/**
 * Format a single AJV error into a custom error message.
 */
function formatErrorMessage(
  pathStr: string,
  error: ErrorObject,
  schema: any
): string {
  const fieldName = toFriendlyName(pathStr);
  const fieldSchema = getFieldSchema(pathStr, schema);
  // Look for our custom extension keyword (set as "x-expectedFormat")
  const expectedFormat = fieldSchema["x-expectedFormat"];
  let message = error.message || "";
  switch (error.keyword) {
    case "required":
      message = `${fieldName} is required.`;
      break;
    case "minLength":
      message = `${fieldName} must be at least ${error.params.limit} characters long.`;
      break;
    case "maxLength":
      message = `${fieldName} must be no more than ${error.params.limit} characters long.`;
      break;
    case "minimum":
      message = `${fieldName} must be at least ${error.params.limit}.`;
      break;
    case "maximum":
      message = `${fieldName} must not exceed ${error.params.limit}.`;
      break;
    case "enum": {
      const allowedValues = error.params.allowedValues.join(", ");
      message = `${fieldName} must be one of the following: ${allowedValues}.`;
      break;
    }
    case "pattern":
      message = `${fieldName} is incorrectly formatted. Expected format: ${expectedFormat || error.params.pattern}.`;
      break;
    case "type":
      message = `${fieldName} must be a ${error.params.type}.`;
      break;
    default:
      message = `${fieldName} ${error.message}.`;
      break;
  }
  return message;
}

/**
 * Format the errors object into a record with arrays of error messages.
 */
function formatAjvErrors(
  errors: Record<string, string>
): Record<string, string[]> {
  const errorMessages: Record<string, string[]> = {};
  for (const key in errors) {
    errorMessages[key] = [errors[key]];
  }
  return errorMessages;
}

/**
 * Validate a value against a schema using AJV.
 * If validation fails, log detailed errors and throw an error with all details.
 */
export function validateSchema<T>(value: T, schema: object): T {
  // Create a new AJV instance with type coercion enabled.
  const ajv = new Ajv({ allErrors: true, coerceTypes: true, strict: false });
  // Add built-in formats (like "date-time")
  addFormats(ajv);
  // Register our custom keyword so it won't trigger strict mode errors.
  ajv.addKeyword({
    keyword: "x-expectedFormat",
    metaSchema: { type: "string" },
  });

  let validate;
  try {
    validate = ajv.compile(schema);
  } catch (error) {
    console.error("Schema compilation failed:", error);
    throw new Error("Schema compilation failed: " + error.message);
  }
  const transformedValue = convertBooleanStrings(value);

  if (!validate(transformedValue)) {
    const errorDetails = (validate.errors || []).map((error: ErrorObject) => {
      let pathStr = error.instancePath.replace(/^\//, "").replace(/\//g, ".");
      if (!pathStr && error.params && error.params.missingProperty) {
        pathStr = error.params.missingProperty;
      }
      const customMessage = formatErrorMessage(pathStr, error, schema);
      return { path: pathStr, message: customMessage };
    });
    
    // Log the detailed error messages to the console.
    console.error(
      "Schema validation failed with errors:",
      JSON.stringify(errorDetails, null, 2)
    );
    
    // Create a user-friendly error message
    const userFriendlyMessages = errorDetails.map(err => err.message);
    const friendlyMessage = userFriendlyMessages.length === 1 
      ? userFriendlyMessages[0]
      : userFriendlyMessages.join("; ");
    
    // Create a validation error with both user-friendly message and detailed info
    const validationError = new Error(friendlyMessage);
    (validationError as any).details = errorDetails;
    (validationError as any).isValidationError = true;
    throw validationError;
  }
  return transformedValue as T;
}

/**
 * Validate an upload file path and check if the file exists
 * @param filePath - The file path to validate (should start with /uploads/)
 * @returns Object with validation result and file info
 */
export function validateUploadFilePath(filePath: string): {
  isValid: boolean;
  exists: boolean;
  fullPath?: string;
  error?: string;
} {
  if (!filePath || typeof filePath !== 'string') {
    return { isValid: false, exists: false, error: 'Invalid file path' };
  }

  if (!filePath.startsWith('/uploads/')) {
    return { isValid: false, exists: false, error: 'File path must start with /uploads/' };
  }

  try {
    const fs = require('fs');
    const path = require('path');
    const isProduction = process.env.NODE_ENV === 'production';
    
    // Determine the correct base path
    const basePath = isProduction 
      ? path.join(process.cwd(), "frontend", "public")
      : path.join(process.cwd(), "..", "frontend", "public");
    
    const fullPath = path.join(basePath, filePath);
    const exists = fs.existsSync(fullPath);
    
    return {
      isValid: true,
      exists,
      fullPath,
      error: exists ? undefined : 'File does not exist'
    };
  } catch (error) {
    return {
      isValid: false,
      exists: false,
      error: `Error validating file: ${error.message}`
    };
  }
}
