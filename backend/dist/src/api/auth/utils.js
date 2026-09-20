"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseAndValidateSiwe = exports.expectedSiweDomain = exports.getUserByWalletAddress = exports.verifyResetTokenQuery = exports.sendEmailVerificationToken = exports.userInclude = exports.returnUserWithTokens = exports.userRegisterSchema = exports.userRegisterResponseSchema = void 0;
exports.ensureWalletConnectAvailable = ensureWalletConnectAvailable;
exports.verifySignature = verifySignature;
exports.validateEmail = validateEmail;
exports.resolveSignupRole = resolveSignupRole;
exports.createUser = createUser;
exports.updateUser = updateUser;
exports.createSessionAndReturnResponse = createSessionAndReturnResponse;
exports.generateNewPassword = generateNewPassword;
exports.addOneTimeToken = addOneTimeToken;
exports.getAddressFromMessage = getAddressFromMessage;
exports.getChainIdFromMessage = getChainIdFromMessage;
exports.getNonceFromMessage = getNonceFromMessage;
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const db_1 = require("@b/db");
const token_1 = require("@b/utils/token");
const generate_password_1 = __importDefault(require("generate-password"));
const session_1 = require("@b/utils/session");
const emails_1 = require("@b/utils/emails");
const viem_1 = require("viem");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const path_1 = __importDefault(require("path"));
const fs_1 = require("fs");
const system_accounts_1 = require("@b/utils/system-accounts");
async function ensureWalletConnectAvailable() {
    const extensions = await cache_1.CacheManager.getInstance().getExtensions();
    const walletConnect = extensions.get("wallet_connect");
    if (!walletConnect) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Wallet authentication is not enabled on this platform",
        });
    }
    const productId = walletConnect.productId;
    if (!productId) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Wallet Connect extension license is not activated",
        });
    }
    const cwd = process.cwd();
    const rootPath = cwd.endsWith("backend") || cwd.endsWith("backend/") || cwd.endsWith("backend\\")
        ? path_1.default.dirname(cwd)
        : cwd;
    try {
        await fs_1.promises.access(path_1.default.join(rootPath, "lic", `${productId}.lic`));
    }
    catch (_a) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Wallet Connect extension license is not activated",
        });
    }
}
const SUPPORTED_SIWE_CHAIN_IDS = new Set([
    "eip155:1",
    "eip155:10",
    "eip155:56",
    "eip155:137",
    "eip155:42161",
    "eip155:43114",
    "eip155:8453",
    "eip155:11155111",
]);
async function verifySignature({ address, message, signature, chainId, projectId, }) {
    try {
        if (!SUPPORTED_SIWE_CHAIN_IDS.has(chainId)) {
            console_1.logger.error("AUTH", `Unsupported SIWE chainId: ${chainId}`);
            return false;
        }
        const publicClient = (0, viem_1.createPublicClient)({
            transport: (0, viem_1.http)(`https://rpc.walletconnect.org/v1/?chainId=${encodeURIComponent(chainId)}&projectId=${encodeURIComponent(projectId)}`),
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
            description: "Google ID token (credential)",
        },
        access_token: {
            type: "string",
            description: "Google OAuth access token, used by the browser popup flow",
        },
        user_info: {
            type: "object",
            additionalProperties: true,
            description: "Profile echoed by the client. Ignored — the server re-fetches it from Google.",
        },
        ref: {
            type: "string",
            description: "Referral code",
        },
        captcha: {
            type: "object",
            additionalProperties: true,
            description: "Captcha submission envelope",
        },
        powSolution: {
            type: "object",
            additionalProperties: true,
            description: "Legacy proof-of-work solution",
        },
    },
    anyOf: [{ required: ["token"] }, { required: ["access_token"] }],
};
const returnUserWithTokens = async ({ user, message, req, }) => {
    if ((0, system_accounts_1.isSystemAccount)(user)) {
        console_1.logger.warn("AUTH", `Refused to sign in ${(0, system_accounts_1.describeSystemAccount)(user)} (${user === null || user === void 0 ? void 0 : user.id}); it holds platform money and cannot be operated by anyone`);
        throw (0, system_accounts_1.systemAccountSignInRefusal)();
    }
    const publicUser = {
        id: user.id,
        role: user.roleId,
    };
    const deviceMeta = req ? (0, session_1.buildSessionDeviceMeta)(req) : undefined;
    const { accessToken, csrfToken, sessionId } = await (0, token_1.generateTokens)(publicUser, deviceMeta);
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
            as: "twoFactor",
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
            as: "author",
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
    if ((0, system_accounts_1.isSystemAccount)(user) || (0, system_accounts_1.isReservedEmailDomain)(user.email)) {
        console_1.logger.debug("AUTH", `No verification code minted for ${user.email}: ${(0, system_accounts_1.isSystemAccount)(user) ? (0, system_accounts_1.describeSystemAccount)(user) : "reserved undeliverable domain"}`);
        return {
            message: "Email with verification code sent successfully",
        };
    }
    const token = await (0, token_1.generateEmailCode)(user.id);
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
    if (!walletAddress)
        return null;
    const link = await db_1.models.providerUser.findOne({
        where: { provider: "WALLET", providerUserId: walletAddress.toLowerCase() },
        attributes: ["userId"],
    });
    if (!link)
        return null;
    const row = await db_1.models.user.findOne({
        where: { id: link.userId },
        ...exports.userInclude,
    });
    if (!row)
        return null;
    const user = row.get({ plain: true });
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
};
exports.getUserByWalletAddress = getUserByWalletAddress;
function validateEmail(email) {
    const emailRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/;
    return emailRegex.test(email);
}
async function resolveSignupRole(roleName) {
    const existing = await db_1.models.role.findOne({ where: { name: roleName } });
    if (existing)
        return existing;
    const [role, created] = await db_1.models.role.findOrCreate({
        where: { name: roleName },
        defaults: { name: roleName },
    });
    if (created && roleName !== "User") {
        console_1.logger.warn("AUTH", `Created the "${roleName}" role (id ${role.id}) on demand. It holds NO ` +
            `permissions — every admin route will refuse accounts in it until a ` +
            `Super Admin grants some in Admin -> Roles.`);
    }
    return role;
}
async function createUser(userData) {
    return await db_1.models.user.create({
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.hashedPassword,
        emailVerified: true,
        phoneVerified: false,
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
    return (0, exports.returnUserWithTokens)({
        user,
        message: "You have been logged in successfully",
    });
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
var siwe_1 = require("@b/utils/siwe");
Object.defineProperty(exports, "expectedSiweDomain", { enumerable: true, get: function () { return siwe_1.expectedSiweDomain; } });
Object.defineProperty(exports, "parseAndValidateSiwe", { enumerable: true, get: function () { return siwe_1.parseAndValidateSiwe; } });
const ETH_ADDRESS_PATTERN = /^0x[a-fA-F0-9]{40}$/mu;
const ETH_CHAIN_ID_IN_SIWE_PATTERN = /Chain ID: (?<temp1>\d+)/u;
const SIWE_NONCE_PATTERN = /^Nonce: (?<nonce>[A-Za-z0-9]{8,128})$/mu;
function getAddressFromMessage(message) {
    var _a;
    return ((_a = message.match(ETH_ADDRESS_PATTERN)) === null || _a === void 0 ? void 0 : _a[0]) || "";
}
function getChainIdFromMessage(message) {
    var _a;
    return `eip155:${((_a = message.match(ETH_CHAIN_ID_IN_SIWE_PATTERN)) === null || _a === void 0 ? void 0 : _a[1]) || 1}`;
}
function getNonceFromMessage(message) {
    var _a, _b;
    return ((_b = (_a = message.match(SIWE_NONCE_PATTERN)) === null || _a === void 0 ? void 0 : _a.groups) === null || _b === void 0 ? void 0 : _b.nonce) || "";
}
