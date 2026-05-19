"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sync_1 = require("csv-parse/sync");
const passwords_1 = require("@b/utils/passwords");
const uuid_1 = require("uuid");
const console_1 = require("@b/utils/console");
const notification_1 = require("@b/services/notification");
exports.metadata = {
    summary: "Import users from CSV file",
    operationId: "importUsersFromCSV",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Import users",
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
exports.default = async (data) => {
    const { user, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized access" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating CSV file upload");
    if (!(body === null || body === void 0 ? void 0 : body.file)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "No CSV file uploaded" });
    }
    const fileData = body.file;
    const defaultPassword = (body === null || body === void 0 ? void 0 : body.defaultPassword) || "Welcome123!";
    const sendWelcomeEmail = (body === null || body === void 0 ? void 0 : body.sendWelcomeEmail) === "true";
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing CSV file");
        let csvContent;
        if (Buffer.isBuffer(fileData)) {
            csvContent = fileData.toString('utf-8');
        }
        else if (typeof fileData === 'object' && fileData.data) {
            csvContent = Buffer.isBuffer(fileData.data)
                ? fileData.data.toString('utf-8')
                : fileData.data;
        }
        else if (typeof fileData === 'string' && fileData.startsWith('data:')) {
            const base64Data = fileData.split(',')[1];
            if (!base64Data) {
                throw (0, error_1.createError)({ statusCode: 400, message: "Invalid file format" });
            }
            csvContent = Buffer.from(base64Data, 'base64').toString('utf-8');
        }
        else if (typeof fileData === 'string') {
            csvContent = fileData;
        }
        else {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Invalid file format. Received type: ${typeof fileData}`
            });
        }
        if (csvContent.charCodeAt(0) === 0xFEFF) {
            csvContent = csvContent.slice(1);
        }
        csvContent = csvContent.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        let rawRecords = [];
        try {
            rawRecords = (0, sync_1.parse)(csvContent, {
                columns: true,
                skip_empty_lines: true,
                trim: true,
                relax_column_count: true,
                relax_quotes: true,
                skip_records_with_error: true,
                cast: (value, context) => {
                    const normalizedColumn = typeof context.column === 'string' ? context.column.toLowerCase() : '';
                    if (normalizedColumn === "emailverified" || normalizedColumn === "twofactor") {
                        if (typeof value === 'string') {
                            const lowerValue = value.toLowerCase();
                            return lowerValue === "true" || value === "1" || lowerValue === "yes";
                        }
                        return Boolean(value);
                    }
                    return value === '' ? null : value;
                },
                on_record: (record, context) => {
                    if (!record || Object.keys(record).length === 0) {
                        return null;
                    }
                    return record;
                },
            });
        }
        catch (parseError) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Failed to parse CSV file: ${parseError.message}. Please ensure the file is a valid CSV format.`,
            });
        }
        rawRecords = rawRecords.filter(record => record !== null);
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
        const records = rawRecords.map((record, index) => {
            try {
                const normalizedRecord = {};
                if (!record || typeof record !== 'object') {
                    return null;
                }
                const keyMapping = {};
                Object.keys(record).forEach(key => {
                    if (key && typeof key === 'string') {
                        const normalizedKey = key.toLowerCase().trim();
                        keyMapping[normalizedKey] = key;
                    }
                });
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
                Object.entries(columnMappings).forEach(([targetKey, possibleKeys]) => {
                    for (const possibleKey of possibleKeys) {
                        const actualKey = keyMapping[possibleKey];
                        if (actualKey && record[actualKey] !== undefined) {
                            normalizedRecord[targetKey] = record[actualKey];
                            break;
                        }
                    }
                });
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
            }
            catch (mappingError) {
                console_1.logger.error("USER_IMPORT", `Error mapping record at index ${index}: ${mappingError.message}`);
                return null;
            }
        }).filter(record => record !== null);
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching default role");
        const defaultRole = await db_1.models.role.findOne({
            where: { name: "User" },
        });
        if (!defaultRole) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Default role not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Importing ${records.length} users`);
        const imported = [];
        const errors = [];
        let importedCount = 0;
        let failedCount = 0;
        const skippedDuringParsing = rawRecords.length - records.length;
        if (skippedDuringParsing > 0) {
            errors.push({
                row: "N/A",
                email: "N/A",
                error: `${skippedDuringParsing} record(s) were skipped due to invalid CSV format or mapping errors`,
            });
        }
        for (let i = 0; i < records.length; i++) {
            const record = records[i];
            const rowNumber = i + 2;
            try {
                const missingFields = [];
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
                const existingUser = await db_1.models.user.findOne({
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
                const userData = {
                    id: (0, uuid_1.v4)(),
                    email: record.email.toLowerCase().trim(),
                    firstName: record.firstName.trim(),
                    lastName: record.lastName.trim(),
                    password: await (0, passwords_1.hashPassword)(record.password || defaultPassword),
                    emailVerified: record.emailVerified === true,
                    phone: record.phone || null,
                    status: record.status || "ACTIVE",
                    roleId: record.roleId || defaultRole.id,
                    twoFactor: record.twoFactor === true,
                    avatar: record.avatar || null,
                };
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
                const newUser = await db_1.models.user.create(userData);
                imported.push({
                    email: newUser.email,
                    name: `${newUser.firstName} ${newUser.lastName}`,
                });
                importedCount++;
                if (sendWelcomeEmail && newUser.email) {
                    try {
                        await notification_1.notificationService.send({
                            userId: newUser.id,
                            type: "ALERT",
                            channels: ["IN_APP"],
                            idempotencyKey: `user_import_welcome_${newUser.id}_${Date.now()}`,
                            data: {
                                title: "Welcome to the Platform",
                                message: `Welcome ${newUser.firstName}! Your account has been created successfully. Please complete your profile and explore our features.`,
                                link: "/user/profile",
                            },
                            priority: "NORMAL"
                        });
                        console_1.logger.debug("USER_IMPORT", `Welcome notification queued for imported user: ${newUser.email}`);
                    }
                    catch (notifError) {
                        console_1.logger.error("USER_IMPORT", `Failed to send welcome notification to ${newUser.email}`, notifError);
                    }
                }
            }
            catch (error) {
                let errorMessage = "Failed to create user";
                if (error.message) {
                    if (error.message.includes("duplicate") || error.message.includes("unique")) {
                        errorMessage = "Duplicate entry found in database";
                    }
                    else if (error.message.includes("validation")) {
                        errorMessage = `Validation error: ${error.message}`;
                    }
                    else if (error.message.includes("role")) {
                        errorMessage = "Invalid role specified";
                    }
                    else {
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
        let summaryMessage = "";
        if (importedCount > 0 && failedCount === 0) {
            summaryMessage = `Success! All ${importedCount} user(s) imported successfully.`;
        }
        else if (importedCount === 0 && failedCount > 0) {
            summaryMessage = `Import failed. No users were imported due to errors.`;
        }
        else {
            summaryMessage = `Import completed with partial success. ${importedCount} user(s) imported, ${failedCount} failed.`;
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success();
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
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Failed to parse CSV file: ${error.message}`,
        });
    }
};
