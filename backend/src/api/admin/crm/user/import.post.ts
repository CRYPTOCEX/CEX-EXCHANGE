import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { parse } from "csv-parse/sync";
import * as bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export const metadata: OperationObject = {
  summary: "Import users from CSV file",
  operationId: "importUsersFromCSV",
  tags: ["Admin", "CRM", "User"],
  requestBody: {
    required: true,
    content: {
      "multipart/form-data": {
        schema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              format: "binary",
              description: "CSV file containing user data",
            },
            defaultPassword: {
              type: "string",
              description: "Default password for imported users (optional)",
            },
            sendWelcomeEmail: {
              type: "boolean",
              description: "Send welcome email to imported users",
              default: false,
            },
          },
          required: ["file"],
        },
      },
    },
  },
  responses: {
    200: {
      description: "Users imported successfully",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              message: { type: "string" },
              imported: { type: "number" },
              failed: { type: "number" },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    row: { type: "number" },
                    email: { type: "string" },
                    error: { type: "string" },
                  },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Invalid CSV file or data",
    },
    401: {
      description: "Unauthorized access",
    },
  },
  requiresAuth: true,
  permission: "import.user",
};

interface CSVRecord {
  email: string;
  firstName: string;
  lastName: string;
  password?: string;
  emailVerified?: boolean;
  phone?: string;
  status?: string;
  roleId?: string;
  twoFactor?: boolean;
  avatar?: string;
  bio?: string;
  address?: string;
  city?: string;
  country?: string;
  zip?: string;
  facebook?: string;
  twitter?: string;
  instagram?: string;
  github?: string;
  dribbble?: string;
  gitlab?: string;
}

export default async (data: Handler) => {
  const { user, body } = data;

  if (!user?.id) {
    throw createError({ statusCode: 401, message: "Unauthorized access" });
  }

  // Check if file exists in body
  if (!body?.file) {
    throw createError({ statusCode: 400, message: "No CSV file uploaded" });
  }

  const fileData = body.file;
  const defaultPassword = body?.defaultPassword || "Welcome123!";
  const sendWelcomeEmail = body?.sendWelcomeEmail === "true";

  try {
    // Decode base64 file data if needed
    let csvContent: string;
    if (typeof fileData === 'string' && fileData.startsWith('data:')) {
      // Handle base64 encoded file
      const base64Data = fileData.split(',')[1];
      if (!base64Data) {
        throw createError({ statusCode: 400, message: "Invalid file format" });
      }
      csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
    } else if (typeof fileData === 'string') {
      // Direct string content
      csvContent = fileData;
    } else {
      throw createError({ statusCode: 400, message: "Invalid file format" });
    }
    
    // Parse CSV with headers
    const records: CSVRecord[] = parse(csvContent, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
      cast: (value, context) => {
        // Handle boolean values
        if (context.column === "emailVerified" || context.column === "twoFactor") {
          return value.toLowerCase() === "true" || value === "1" || value.toLowerCase() === "yes";
        }
        return value;
      },
    });

    // Get default role
    const defaultRole = await models.role.findOne({
      where: { name: "User" },
    });

    if (!defaultRole) {
      throw createError({ statusCode: 500, message: "Default role not found" });
    }

    const imported: any[] = [];
    const errors: any[] = [];
    let importedCount = 0;
    let failedCount = 0;

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record: CSVRecord = records[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Validate required fields
        if (!record.email || !record.firstName || !record.lastName) {
          errors.push({
            row: rowNumber,
            email: record.email || "N/A",
            error: "Missing required fields (email, firstName, lastName)",
          });
          failedCount++;
          continue;
        }

        // Check if user already exists
        const existingUser = await models.user.findOne({
          where: { email: record.email },
        });

        if (existingUser) {
          errors.push({
            row: rowNumber,
            email: record.email,
            error: "User with this email already exists",
          });
          failedCount++;
          continue;
        }

        // Prepare user data
        const userData: any = {
          id: uuidv4(),
          email: record.email.toLowerCase(),
          firstName: record.firstName,
          lastName: record.lastName,
          password: await bcrypt.hash(record.password || defaultPassword, 10),
          emailVerified: record.emailVerified || false,
          phone: record.phone || null,
          status: record.status || "ACTIVE",
          roleId: record.roleId || defaultRole.id,
          twoFactor: record.twoFactor || false,
          avatar: record.avatar || null,
        };

        // Handle profile data if present
        if (record.bio || record.address || record.city || record.country || record.zip) {
          userData.profile = {
            bio: record.bio || null,
            location: {
              address: record.address || null,
              city: record.city || null,
              country: record.country || null,
              zip: record.zip || null,
            },
            social: {
              facebook: record.facebook || null,
              twitter: record.twitter || null,
              instagram: record.instagram || null,
              github: record.github || null,
              dribbble: record.dribbble || null,
              gitlab: record.gitlab || null,
            },
          };
        }

        // Create user
        const newUser = await models.user.create(userData);
        imported.push({
          email: newUser.email,
          name: `${newUser.firstName} ${newUser.lastName}`,
        });
        importedCount++;

        // Send welcome email if requested (you would implement this based on your email service)
        if (sendWelcomeEmail && newUser.email) {
          // TODO: Implement email sending logic here
          // await sendWelcomeEmail(newUser);
        }

      } catch (error: any) {
        errors.push({
          row: rowNumber,
          email: record.email || "N/A",
          error: error.message || "Failed to create user",
        });
        failedCount++;
      }
    }

    return {
      message: `Import completed. ${importedCount} users imported successfully.`,
      imported: importedCount,
      failed: failedCount,
      errors: errors.length > 0 ? errors : undefined,
      details: imported,
    };

  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: `Failed to parse CSV file: ${error.message}`,
    });
  }
};