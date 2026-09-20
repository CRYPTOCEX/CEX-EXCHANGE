"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userStoreSchema = exports.userCreateSchema = exports.userUpdateSchema = exports.userSchema = void 0;
exports.assertCanAccessUser = assertCanAccessUser;
exports.assertCanAssignRole = assertCanAssignRole;
exports.assertEmailAvailable = assertEmailAvailable;
exports.getUserCountsPerDay = getUserCountsPerDay;
exports.blankToNull = blankToNull;
exports.normalizeProfile = normalizeProfile;
const utils_1 = require("@b/utils");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const system_accounts_1 = require("@b/utils/system-accounts");
async function assertCanAccessUser(callerId, targetId) {
    var _a, _b;
    const target = await db_1.models.user.findByPk(targetId, {
        include: [{ model: db_1.models.role, as: "role", attributes: ["name"] }],
    });
    if (!target) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    if (((_a = target.role) === null || _a === void 0 ? void 0 : _a.name) !== "Super Admin")
        return target;
    if (callerId && callerId === targetId)
        return target;
    const caller = callerId
        ? await db_1.models.user.findByPk(callerId, {
            include: [{ model: db_1.models.role, as: "role", attributes: ["name"] }],
        })
        : null;
    if (((_b = caller === null || caller === void 0 ? void 0 : caller.role) === null || _b === void 0 ? void 0 : _b.name) !== "Super Admin") {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    return target;
}
async function assertCanAssignRole(callerId, targetRoleId) {
    const caller = callerId
        ? await db_1.models.user.findByPk(String(callerId), {
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    include: [
                        {
                            model: db_1.models.permission,
                            as: "permissions",
                            through: { attributes: [] },
                            attributes: ["name"],
                        },
                    ],
                },
            ],
        })
        : null;
    if (!(caller === null || caller === void 0 ? void 0 : caller.role)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    if (caller.role.name === "Super Admin")
        return;
    const targetRole = await db_1.models.role.findByPk(targetRoleId, {
        include: [
            {
                model: db_1.models.permission,
                as: "permissions",
                through: { attributes: [] },
                attributes: ["name"],
            },
        ],
    });
    if (!targetRole) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Invalid role" });
    }
    if (targetRole.name === "Super Admin") {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "You cannot create a Super Admin",
        });
    }
    const held = new Set((caller.role.permissions || []).map((p) => p.name));
    const escalating = (targetRole.permissions || [])
        .map((p) => p.name)
        .filter((name) => !held.has(name));
    if (escalating.length) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: `You cannot create an account in the "${targetRole.name}" role: it holds ` +
                `permissions your own role does not (${escalating.slice(0, 3).join(", ")}` +
                `${escalating.length > 3 ? `, +${escalating.length - 3} more` : ""}). ` +
                `Ask a Super Admin to create it.`,
        });
    }
}
async function assertEmailAvailable(email) {
    if (!email)
        return;
    if ((0, system_accounts_1.isReservedEmail)(email)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "User already exists" });
    }
    const existing = await db_1.models.user.findOne({
        where: { email },
        paranoid: false,
        attributes: ["id", "deletedAt"],
    });
    if (!existing)
        return;
    if (existing.deletedAt) {
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "A deleted account still holds this email address. Restore that account, " +
                "or delete it permanently, before reusing the address.",
        });
    }
    throw (0, error_1.createError)({ statusCode: 400, message: "User already exists" });
}
async function getUserCountsPerDay(ctx) {
    var _a, _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching user counts for the last 30 days");
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    const users = await db_1.models.user.findAll({
        where: {
            createdAt: {
                [sequelize_1.Op.gte]: startDate,
            },
        },
        attributes: ["createdAt", "status", "emailVerified"],
    });
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Processing user count statistics");
    const counts = {
        registrations: {},
        activeUsers: {},
        bannedUsers: {},
        verifiedEmails: {},
    };
    users.forEach((user) => {
        if (!user.createdAt)
            return;
        const date = user.createdAt.toISOString().split("T")[0];
        counts.registrations[date] = (counts.registrations[date] || 0) + 1;
        if (user.status === "ACTIVE") {
            counts.activeUsers[date] = (counts.activeUsers[date] || 0) + 1;
        }
        if (user.status === "BANNED") {
            counts.bannedUsers[date] = (counts.bannedUsers[date] || 0) + 1;
        }
        if (user.emailVerified) {
            counts.verifiedEmails[date] = (counts.verifiedEmails[date] || 0) + 1;
        }
    });
    (_c = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _c === void 0 ? void 0 : _c.call(ctx, "User counts calculated successfully");
    return {
        registrations: (0, utils_1.convertAndSortCounts)(counts.registrations),
        activeUsers: (0, utils_1.convertAndSortCounts)(counts.activeUsers),
        bannedUsers: (0, utils_1.convertAndSortCounts)(counts.bannedUsers),
        verifiedEmails: (0, utils_1.convertAndSortCounts)(counts.verifiedEmails),
    };
}
const schema_1 = require("@b/utils/schema");
const optionalPatterned = (description, maxLength, pattern, expectedFormat) => (0, schema_1.baseStringSchema)(description, maxLength, 0, true, `^$|${pattern}`, expectedFormat);
const optionalText = (description, maxLength = 255) => (0, schema_1.baseStringSchema)(description, maxLength, 0, true);
const id = (0, schema_1.baseStringSchema)("ID of the user");
const email = (0, schema_1.baseStringSchema)("Email of the user", 100, 1, false, "^[^@]+@[^@]+\\.[^@]+$", "example@site.com");
const avatar = optionalText("Avatar of the user");
const firstName = (0, schema_1.baseStringSchema)("First name of the user", 50, 1);
const lastName = (0, schema_1.baseStringSchema)("Last name of the user", 50, 1);
const emailVerified = (0, schema_1.baseBooleanSchema)("Email verification status");
const phoneVerified = (0, schema_1.baseBooleanSchema)("Phone verification status");
const phone = optionalPatterned("User's phone number in E.164 format", 16, "^\\+[0-9]{7,15}$", "+254711972926");
const status = (0, schema_1.baseEnumSchema)("Status of the user", [
    "ACTIVE",
    "INACTIVE",
    "BANNED",
    "SUSPENDED",
]);
const roleId = (0, schema_1.baseStringSchema)("Role ID associated with the user");
const twoFactor = (0, schema_1.baseBooleanSchema)("Whether two-factor authentication is enabled");
const currentPassword = (0, schema_1.baseStringSchema)("The calling admin's own password, required to change another user's email or 2FA", 128, 0, true);
const URL_PATTERN = "^https?:\\/\\/[\\w.-]+(?:\\.[\\w\\.-]+)+[\\w\\-._~:/?#[\\]@!$&'()*+,;=]+$";
const socialUrl = (network) => optionalPatterned(`${network} URL`, 255, URL_PATTERN, `http://${network.toLowerCase()}.com/yourusername`);
const profile = {
    type: "object",
    nullable: true,
    properties: {
        bio: optionalText("Bio", 500),
        location: {
            type: "object",
            nullable: true,
            properties: {
                address: optionalText("Detailed address of the user"),
                city: optionalText("City"),
                country: optionalText("Country"),
                zip: optionalText("Zip code", 10),
            },
        },
        social: {
            type: "object",
            nullable: true,
            properties: {
                facebook: socialUrl("Facebook"),
                twitter: socialUrl("Twitter"),
                dribbble: socialUrl("Dribbble"),
                instagram: socialUrl("Instagram"),
                github: socialUrl("Github"),
                gitlab: socialUrl("Gitlab"),
            },
        },
    },
};
const lastLogin = (0, schema_1.baseDateTimeSchema)("Last login date");
const lastFailedLogin = (0, schema_1.baseDateTimeSchema)("Last failed login date");
const failedLoginAttempts = (0, schema_1.baseIntegerSchema)("Number of failed login attempts");
const walletAddress = (0, schema_1.baseStringSchema)("Wallet address of the user");
const walletProvider = (0, schema_1.baseStringSchema)("Wallet provider of the user");
exports.userSchema = {
    id,
    email,
    avatar,
    firstName,
    lastName,
    emailVerified,
    phone,
    status,
    roleId,
    twoFactor,
    profile,
    lastLogin,
    lastFailedLogin,
    failedLoginAttempts,
    walletAddress,
    walletProvider,
};
const userProperties = {
    avatar,
    firstName,
    lastName,
    email,
    phone,
    status,
    emailVerified,
    phoneVerified,
    twoFactor,
    profile,
    roleId,
    currentPassword,
};
exports.userUpdateSchema = {
    type: "object",
    properties: userProperties,
    required: ["email", "firstName", "lastName"],
};
exports.userCreateSchema = {
    type: "object",
    properties: userProperties,
    required: ["email", "firstName", "lastName", "roleId"],
};
function blankToNull(value) {
    if (value === undefined)
        return value;
    if (value === null)
        return null;
    if (typeof value === "string" && value.trim() === "")
        return null;
    return value;
}
function normalizeProfile(profileInput) {
    if (profileInput === undefined)
        return undefined;
    if (profileInput === null)
        return null;
    if (typeof profileInput !== "object" || Array.isArray(profileInput)) {
        return profileInput;
    }
    const walk = (node) => {
        if (node === null || typeof node !== "object" || Array.isArray(node)) {
            return blankToNull(node);
        }
        const out = {};
        for (const [key, value] of Object.entries(node)) {
            out[key] = walk(value);
        }
        return out;
    };
    return walk(profileInput);
}
exports.userStoreSchema = {
    description: `User created or updated successfully`,
    content: {
        "application/json": {
            schema: {
                type: "object",
                properties: exports.userSchema,
            },
        },
    },
};
