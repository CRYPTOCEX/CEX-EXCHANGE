"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserByWalletAddress = exports.verifyResetTokenQuery = exports.sendEmailVerificationToken = exports.userInclude = exports.returnUserWithTokens = exports.userRegisterSchema = exports.userRegisterResponseSchema = void 0;
exports.verifySignature = verifySignature;
exports.validateEmail = validateEmail;
exports.getOrCreateUserRole = getOrCreateUserRole;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.createSessionAndReturnResponse = createSessionAndReturnResponse;
exports.generateNewPassword = generateNewPassword;
exports.addOneTimeToken = addOneTimeToken;
exports.getAddressFromMessage = getAddressFromMessage;
exports.getChainIdFromMessage = getChainIdFromMessage;
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const generate_password_1 = __importDefault(require("generate-password"));
const emails_1 = require("@b/utils/emails");
const viem_1 = require("viem");
const console_1 = require("@b/utils/console");
async function verifySignature({ address, message, signature, chainId, projectId, }) {
    try {
        const publicClient = (0, viem_1.createPublicClient)({
            transport: (0, viem_1.http)(`https://rpc.walletconnect.org/v1/?chainId=${chainId}&projectId=${projectId}`),
        });
        const isValid = await publicClient.verifyMessage({
            message,
            address: address,
            signature: signature,
        });
        return isValid;
    }
    catch (e) {
        console_1.logger.error("AUTH", "Signature verification error", e);
        return false;
    }
}
exports.userRegisterResponseSchema = {
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
            sessionId: {
                type: "string",
                description: "Session ID",
            },
            csrfToken: {
                type: "string",
                description: "CSRF token",
            },
        },
    },
};
exports.userRegisterSchema = {
    type: "object",
    properties: {
        token: {
            type: "string",
            description: "Google OAuth token",
        },
        ref: {
            type: "string",
            description: "Referral code",
        },
    },
    required: ["token"],
};
const returnUserWithTokens = async ({ user, message }) => {
    const publicUser = {
        id: user.id,
        role: user.roleId,
    };
    const { accessToken, refreshToken, csrfToken, sessionId } = await (0, token_1.generateTokens)(publicUser);
    await (0, token_1.createSession)(publicUser.id, publicUser.role, accessToken, csrfToken, refreshToken);
    return {
        message,
        cookies: {
            accessToken: accessToken,
            sessionId: sessionId,
            csrfToken: csrfToken,
        },
    };
};
exports.returnUserWithTokens = returnUserWithTokens;
exports.userInclude = {
    include: [
        {
            model: db_1.models.role,
            as: "role",
            attributes: ["id", "name"],
            include: [
                {
                    model: db_1.models.permission,
                    as: "permissions",
                    through: { attributes: [] },
                },
            ],
        },
        {
            model: db_1.models.twoFactor,
            attributes: ["type", "enabled"],
        },
        {
            model: db_1.models.kycApplication,
            as: "kycApplications",
            attributes: ["id", "status", "levelId", "createdAt"],
            include: [
                {
                    model: db_1.models.kycLevel,
                    as: "level",
                    attributes: ["id", "name", "level", "features"],
                },
            ],
            required: false,
        },
        {
            model: db_1.models.author,
            attributes: ["status"],
        },
    ],
};
const sendEmailVerificationToken = async (userId, email) => {
    const user = await db_1.models.user.findOne({
        where: { email, id: userId },
    });
    if (!user) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    const token = await (0, token_1.generateEmailCode)(user.id);
    try {
        await emails_1.emailQueue.add({
            emailData: {
                TO: user.email,
                FIRSTNAME: user.firstName,
                CREATED_AT: user.createdAt,
                TOKEN: token,
            },
            emailType: "EmailVerification",
        });
        return {
            message: "Email with verification code sent successfully",
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            message: error.message,
            statusCode: 500,
        });
    }
};
exports.sendEmailVerificationToken = sendEmailVerificationToken;
const verifyResetTokenQuery = async (token) => {
    const decodedToken = await (0, token_1.verifyResetToken)(token);
    if (!decodedToken || !decodedToken.sub) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Invalid or malformed token",
        });
    }
    const jtiCheck = await addOneTimeToken(decodedToken.jti, new Date());
    if (decodedToken.jti !== jtiCheck) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Server error: Invalid JTI in the token",
        });
    }
    try {
        if (!decodedToken.sub.id) {
            throw (0, error_1.createError)({
                statusCode: 401,
                message: "Malformed token: Missing sub.id",
            });
        }
        await db_1.models.user.update({
            emailVerified: true,
        }, {
            where: {
                id: decodedToken.sub.id,
            },
        });
        return {
            message: "Token verified successfully",
        };
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: `Server error: ${error.message}`,
        });
    }
};
exports.verifyResetTokenQuery = verifyResetTokenQuery;
const getUserByWalletAddress = async (walletAddress) => {
    const user = (await db_1.models.user.findOne({
        where: { walletAddress: walletAddress },
        include: exports.userInclude,
    }));
    if (user) {
        const { password, ...userWithoutPassword } = user;
        return userWithoutPassword;
    }
    return null;
};
exports.getUserByWalletAddress = getUserByWalletAddress;
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
}
async function getOrCreateUserRole() {
    await db_1.models.role.upsert({
        name: "User",
    });
    return await db_1.models.role.findOne({
        where: {
            name: "User",
        },
    });
}
async function createUser(userData) {
    return await db_1.models.user.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.hashedPassword,
        emailVerified: true,
        roleId: userData.role.id,
        settings: {
            email: true,
            sms: false,
            push: false,
        },
    });
}
async function updateUser(userId, updateData) {
    await db_1.models.user.update({
        firstName: updateData.firstName,
        lastName: updateData.lastName,
        password: updateData.hashedPassword,
        emailVerified: true,
    }, {
        where: { id: userId },
    });
}
async function createSessionAndReturnResponse(user) {
    const publicUser = {
        id: user.id,
        role: user.roleId,
    };
    const accessToken = await (0, token_1.generateAccessToken)(publicUser);
    const refreshToken = await (0, token_1.generateRefreshToken)(publicUser);
    const csrfToken = (0, token_1.generateCsrfToken)();
    const session = await (0, token_1.createSession)(user.id, user.roleId, accessToken, csrfToken, refreshToken);
    return {
        message: "You have been logged in successfully",
        cookies: {
            accessToken: accessToken,
            refreshToken: refreshToken,
            sessionId: session.sid,
            csrfToken: csrfToken,
        },
    };
}
async function generateNewPassword(id) {
    const password = generate_password_1.default.generate({
        length: 20,
        numbers: true,
        symbols: true,
        strict: true,
    });
    const isValidPassword = (0, passwords_1.validatePassword)(password);
    if (!isValidPassword) {
        return (0, error_1.createError)({
            statusCode: 500,
            message: "Server error",
        });
    }
    const errorOrHashedPassword = await (0, passwords_1.hashPassword)(password);
    const hashedPassword = errorOrHashedPassword;
    try {
        await db_1.models.user.update({
            password: hashedPassword,
        }, {
            where: {
                id,
            },
        });
        return password;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Server error",
        });
    }
}
async function addOneTimeToken(tokenId, expiresAt) {
    try {
        await db_1.models.oneTimeToken.create({
            tokenId: tokenId,
            expiresAt: expiresAt,
        });
        return tokenId;
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Server error",
        });
    }
}
const ETH_ADDRESS_PATTERN = /0x[a-fA-F0-9]{40}/u;
const ETH_CHAIN_ID_IN_SIWE_PATTERN = /Chain ID: (?<temp1>\d+)/u;
function getAddressFromMessage(message) {
    var _a;
    return ((_a = message.match(ETH_ADDRESS_PATTERN)) === null || _a === void 0 ? void 0 : _a[0]) || "";
}
function getChainIdFromMessage(message) {
    var _a;
    return `eip155:${((_a = message.match(ETH_CHAIN_ID_IN_SIWE_PATTERN)) === null || _a === void 0 ? void 0 : _a[1]) || 1}`;
}
