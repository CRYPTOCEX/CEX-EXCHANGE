import { createError } from "@b/utils/error";
import { models } from "@b/db";
import { parse } from "csv-parse/sync";
import { hashPassword } from "@b/utils/passwords";
import { v4 as uuidv4 } from "uuid";

export const metadata: OperationObject = {
  summary: "Import users from CSV file",
  operationId: "importUsersFromCSV",
  tags: ["Admin", "CRM", "User"],
  requestBody: {
    required: true,
    content: {
      "application/json": {
        schema: {
          type: "object",
          properties: {
            file: {
              type: "string",
              description: "Base64 encoded CSV file containing user data",
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

  // Get data from body
  if (!body?.file) {
    throw createError({ statusCode: 400, message: "No CSV file uploaded" });
  }

  const fileData = body.file;
  const defaultPassword = body?.defaultPassword || "Welcome123!";
  const sendWelcomeEmail = body?.sendWelcomeEmail === "true";

  try {
    // Handle different file data types
    let csvContent: string;
    
    // Check if fileData is a Buffer (common with multipart uploads)
    if (Buffer.isBuffer(fileData)) {
      csvContent = fileData.toString('utf-8');
    } else if (typeof fileData === 'object' && fileData.data) {
      // Handle file object with data property
      csvContent = Buffer.isBuffer(fileData.data) 
        ? fileData.data.toString('utf-8') 
        : fileData.data;
    } else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
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
      throw createError({ 
        statusCode: 400, 
        message: `Invalid file format. Received type: ${typeof fileData}` 
      });
    }

    // Remove BOM (Byte Order Mark) if present
    if (csvContent.charCodeAt(0) === 0xFEFF) {
      csvContent = csvContent.slice(1);
    }

    // Normalize CSV content - ensure proper line endings
    csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Debug: Log the first few lines of CSV content (comment out in production)
    // console.log('CSV Content Preview:', csvContent.split('\n').slice(0, 3).join('\n'));
    
    // Parse CSV with headers and normalize column names
    let rawRecords: any[] = [];
    try {
      rawRecords = parse(csvContent, {
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true, // Allow inconsistent column counts
        relax_quotes: true, // Allow quotes to be relaxed
        skip_records_with_error: true, // Skip malformed records
        cast: (value, context) => {
          // Handle boolean values - normalize column names for comparison
          const normalizedColumn = typeof context.column === 'string' ? context.column.toLowerCase() : '';
          if (normalizedColumn === "emailverified" || normalizedColumn === "twofactor") {
            if (typeof value === 'string') {
              const lowerValue = value.toLowerCase();
              return lowerValue === "true" || value === "1" || lowerValue === "yes";
            }
            return Boolean(value);
          }
          return value === '' ? null : value; // Convert empty strings to null
        },
        on_record: (record, context) => {
          // Additional validation for each record during parsing
          if (!record || Object.keys(record).length === 0) {
            return null; // Skip empty records
          }
          return record;
        },
      });
    } catch (parseError: any) {
      // If CSV is completely unparseable, return error
      throw createError({
        statusCode: 400,
        message: `Failed to parse CSV file: ${parseError.message}. Please ensure the file is a valid CSV format.`,
      });
    }
    
    // Filter out null records
    rawRecords = rawRecords.filter(record => record !== null);
    
    // Check if we have any valid records to process
    if (rawRecords.length === 0) {
      return {
        message: "No valid records found in the CSV file. Please check the file format and ensure it contains valid user data.",
        imported: 0,
        failed: 0,
        errors: [{
          row: "N/A",
          email: "N/A",
          error: "CSV file contains no valid records. Ensure the file has proper headers (email, firstName, lastName) and data rows.",
        }],
      };
    }

    // Debug: Show available columns in the CSV (comment out in production)
    // if (rawRecords.length > 0) {
    //   console.log('Available CSV columns:', Object.keys(rawRecords[0] as object));
    // }

    // Normalize column names to handle case sensitivity
    const records: CSVRecord[] = rawRecords.map((record: any, index: number) => {
      try {
        const normalizedRecord: any = {};
        
        // Ensure record is an object
        if (!record || typeof record !== 'object') {
          return null; // Mark invalid record for filtering
        }
        
        // Create a mapping of normalized keys to actual keys
        const keyMapping: { [key: string]: string } = {};
        Object.keys(record).forEach(key => {
          if (key && typeof key === 'string') {
            const normalizedKey = key.toLowerCase().trim();
            keyMapping[normalizedKey] = key;
          }
        });
      
      // Debug: Log key mapping for first record (comment out in production)
      // if (index === 0) {
      //   console.log('Key mapping:', keyMapping);
      // }
      
      // Map known columns with case-insensitive matching
      const columnMappings = {
        'email': ['email'],
        'firstname': ['firstname', 'first_name'],
        'lastname': ['lastname', 'last_name'],
        'password': ['password'],
        'phone': ['phone'],
        'status': ['status'],
        'emailverified': ['emailverified', 'email_verified'],
        'twofactor': ['twofactor', 'two_factor'],
        'roleid': ['roleid', 'role_id'],
        'avatar': ['avatar'],
        'bio': ['bio'],
        'address': ['address'],
        'city': ['city'],
        'country': ['country'],
        'zip': ['zip'],
        'facebook': ['facebook'],
        'twitter': ['twitter'],
        'instagram': ['instagram'],
        'github': ['github'],
        'dribbble': ['dribbble'],
        'gitlab': ['gitlab']
      };
      
      // Map each column
      Object.entries(columnMappings).forEach(([targetKey, possibleKeys]) => {
        for (const possibleKey of possibleKeys) {
          const actualKey = keyMapping[possibleKey];
          if (actualKey && record[actualKey] !== undefined) {
            normalizedRecord[targetKey] = record[actualKey];
            break;
          }
        }
      });
      
      // Convert normalized keys back to camelCase for consistency
      return {
        email: normalizedRecord.email,
        firstName: normalizedRecord.firstname,
        lastName: normalizedRecord.lastname,
        password: normalizedRecord.password,
        phone: normalizedRecord.phone,
        status: normalizedRecord.status,
        emailVerified: normalizedRecord.emailverified,
        twoFactor: normalizedRecord.twofactor,
        roleId: normalizedRecord.roleid,
        avatar: normalizedRecord.avatar,
        bio: normalizedRecord.bio,
        address: normalizedRecord.address,
        city: normalizedRecord.city,
        country: normalizedRecord.country,
        zip: normalizedRecord.zip,
        facebook: normalizedRecord.facebook,
        twitter: normalizedRecord.twitter,
        instagram: normalizedRecord.instagram,
        github: normalizedRecord.github,
        dribbble: normalizedRecord.dribbble,
        gitlab: normalizedRecord.gitlab
      };
      } catch (mappingError: any) {
        // If there's an error mapping this record, skip it
        console.error(`Error mapping record at index ${index}:`, mappingError.message);
        return null;
      }
    }).filter(record => record !== null); // Filter out null (invalid) records

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
    const skippedDuringParsing = rawRecords.length - records.length;

    // Add info about records skipped during parsing
    if (skippedDuringParsing > 0) {
      errors.push({
        row: "N/A",
        email: "N/A",
        error: `${skippedDuringParsing} record(s) were skipped due to invalid CSV format or mapping errors`,
      });
    }

    // Process each record
    for (let i = 0; i < records.length; i++) {
      const record: CSVRecord = records[i];
      const rowNumber = i + 2; // Account for header row

      try {
        // Debug logging for troubleshooting (comment out in production)
        // console.log(`Processing row ${rowNumber}:`, {
        //   email: record.email,
        //   firstName: record.firstName,
        //   lastName: record.lastName,
        //   originalRecord: record
        // });

        // Validate required fields with more specific error messages
        const missingFields: string[] = [];
        if (!record.email || record.email === null || record.email.trim() === '') {
          missingFields.push('email');
        }
        if (!record.firstName || record.firstName === null || record.firstName.trim() === '') {
          missingFields.push('firstName');
        }
        if (!record.lastName || record.lastName === null || record.lastName.trim() === '') {
          missingFields.push('lastName');
        }

        if (missingFields.length > 0) {
          errors.push({
            row: rowNumber,
            email: record.email || "N/A",
            error: `Missing required fields: ${missingFields.join(', ')}. Received: firstName="${record.firstName}", lastName="${record.lastName}", email="${record.email}"`,
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

        // Prepare user data with proper null handling
        const userData: any = {
          id: uuidv4(),
          email: record.email.toLowerCase().trim(),
          firstName: record.firstName.trim(),
          lastName: record.lastName.trim(),
          password: await hashPassword(record.password || defaultPassword),
          emailVerified: record.emailVerified === true,
          phone: record.phone || null,
          status: record.status || "ACTIVE",
          roleId: record.roleId || defaultRole.id,
          twoFactor: record.twoFactor === true,
          avatar: record.avatar || null,
        };

        // Debug logging for user data creation (comment out in production)
        // console.log(`Creating user data for row ${rowNumber}:`, {
        //   firstName: userData.firstName,
        //   lastName: userData.lastName,
        //   email: userData.email
        // });

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
        // Provide more detailed error messages
        let errorMessage = "Failed to create user";
        
        if (error.message) {
          // Check for specific database errors
          if (error.message.includes("duplicate") || error.message.includes("unique")) {
            errorMessage = "Duplicate entry found in database";
          } else if (error.message.includes("validation")) {
            errorMessage = `Validation error: ${error.message}`;
          } else if (error.message.includes("role")) {
            errorMessage = "Invalid role specified";
          } else {
            errorMessage = error.message;
          }
        }
        
        errors.push({
          row: rowNumber,
          email: record.email || "N/A",
          error: errorMessage,
        });
        failedCount++;
      }
    }

    // Prepare summary message
    let summaryMessage = "";
    if (importedCount > 0 && failedCount === 0) {
      summaryMessage = `Success! All ${importedCount} user(s) imported successfully.`;
    } else if (importedCount === 0 && failedCount > 0) {
      summaryMessage = `Import failed. No users were imported due to errors.`;
    } else {
      summaryMessage = `Import completed with partial success. ${importedCount} user(s) imported, ${failedCount} failed.`;
    }

    return {
      message: summaryMessage,
      imported: importedCount,
      failed: failedCount + skippedDuringParsing,
      errors: errors.length > 0 ? errors : undefined,
      details: imported,
      summary: {
        total_processed: records.length + skippedDuringParsing,
        successful: importedCount,
        failed: failedCount,
        skipped_invalid: skippedDuringParsing,
      },
    };

  } catch (error: any) {
    throw createError({
      statusCode: 400,
      message: `Failed to parse CSV file: ${error.message}`,
    });
  }
};