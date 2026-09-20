"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const passwords_1 = require("@b/utils/passwords");
const utils_1 = require("./utils");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Creates a new user",
    operationId: "createUser",
    tags: ["Admin", "CRM", "User"],
    logModule: "ADMIN_CRM",
    logTitle: "Create user",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: utils_1.userCreateSchema,
            },
        },
    },
    responses: (0, query_1.storeRecordResponses)(utils_1.userStoreSchema, "Page"),
    requiresAuth: true,
    permission: "create.user",
};
exports.default = async (data) => {
    const { body, user, ctx } = data;
    const { firstName, lastName, email, roleId, avatar, phone, emailVerified, phoneVerified, status = "ACTIVE", profile, } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating user authorization");
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized access" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for existing user");
    const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : email;
    await (0, utils_1.assertEmailAvailable)(normalizedEmail);
    const initialPassword = (0, passwords_1.generateInitialPassword)();
    const password = await (0, passwords_1.hashPassword)(initialPassword);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating role assignment");
    const superAdminRole = await db_1.models.role.findOne({
        where: { name: "Super Admin" },
    });
    const requestedRoleId = Number(roleId);
    if (Number.isNaN(requestedRoleId))
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid role",
        });
    if (superAdminRole && requestedRoleId === Number(superAdminRole.id))
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "You cannot create a Super Admin",
        });
    await (0, utils_1.assertCanAssignRole)(user.id, requestedRoleId);
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating user");
    const trimmedPhone = typeof phone === "string" ? phone.trim() : phone;
    const normalizedPhone = trimmedPhone
        ? `+${String(trimmedPhone).replace(/\D/g, "").slice(0, 15)}`
        : (0, utils_1.blankToNull)(trimmedPhone);
    await db_1.models.user.create({
        firstName,
        lastName,
        email: normalizedEmail,
        roleId: requestedRoleId,
        password,
        avatar: (0, utils_1.blankToNull)(avatar),
        phone: normalizedPhone,
        emailVerified,
        phoneVerified,
        status,
        profile: (0, utils_1.normalizeProfile)(profile),
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success();
    return {
        message: `User created successfully. Temporary password: ${initialPassword} — share it with the user and have them change it on first sign-in.`,
    };
};
