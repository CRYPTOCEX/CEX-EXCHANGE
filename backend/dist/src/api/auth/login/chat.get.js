"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loginUserChat = exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Logs in a user to the chat service",
    description: "Logs in a user to the chat service and returns a session token",
    operationId: "loginUserChat",
    tags: ["Auth"],
    requiresAuth: false,
    parameters: [
        {
            in: "query",
            name: "email",
            required: true,
            schema: {
                type: "string",
                format: "email",
            },
            description: "Email of the user",
        },
        {
            in: "query",
            name: "password",
            required: true,
            schema: {
                type: "string",
            },
            description: "Password of the user",
        },
        {
            in: "query",
            name: "firstName",
            required: true,
            schema: {
                type: "string",
            },
            description: "First name of the user",
        },
        {
            in: "query",
            name: "lastName",
            required: true,
            schema: {
                type: "string",
            },
            description: "Last name of the user",
        },
    ],
    responses: {
        200: {
            description: "User logged into chat successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: {
                                type: "string",
                                description: "Success message",
                            },
                            cookies: {
                                type: "object",
                                properties: {
                                    accessToken: {
                                        type: "string",
                                        description: "Access token",
                                    },
                                },
                            },
                        },
                    },
                },
            },
        },
        400: {
            description: "Invalid request (e.g., missing or invalid email/password)",
        },
        401: {
            description: "Unauthorized (incorrect credentials)",
        },
    },
};
exports.default = (data) => {
    const { query } = data;
    const { email, password, firstName, lastName } = query;
    return (0, exports.loginUserChat)(email, password, firstName, lastName);
};
const loginUserChat = async (email, password, firstName, lastName) => {
    if (!(0, utils_1.validateEmail)(email) || !(0, passwords_1.validatePassword)(password)) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid email or password",
        });
    }
    const errorOrHashedPassword = await (0, passwords_1.hashPassword)(password);
    const hashedPassword = errorOrHashedPassword;
    const existingUser = await db_1.models.user.findOne({
        where: { email },
        include: { model: db_1.models.twoFactor, as: "twoFactor" },
    });
    if (!existingUser) {
        const role = await (0, utils_1.getOrCreateUserRole)();
        const newUser = await (0, utils_1.createUser)({
            firstName,
            lastName,
            email,
            hashedPassword,
            role,
        });
        return await (0, utils_1.createSessionAndReturnResponse)(newUser);
    }
    else {
        if (existingUser.status === "BANNED") {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account has been banned. Please contact support.",
            });
        }
        if (existingUser.status === "SUSPENDED") {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is suspended. Please contact support.",
            });
        }
        if (existingUser.status === "INACTIVE") {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: "Your account is inactive. Please verify your email or contact support.",
            });
        }
        await (0, utils_1.updateUser)(existingUser.id, {
            firstName,
            lastName,
            hashedPassword,
        });
        return await (0, utils_1.createSessionAndReturnResponse)(existingUser);
    }
};
exports.loginUserChat = loginUserChat;
