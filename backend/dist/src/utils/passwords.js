"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.makeRandomString32 = makeRandomString32;
exports.hashPassword = hashPassword;
exports.makeUuid = makeUuid;
exports.generateNewPassword = generateNewPassword;
exports.verifyPassword = verifyPassword;
exports.validatePassword = validatePassword;
const argon2_1 = __importDefault(require("argon2"));
const crypto_1 = __importDefault(require("crypto"));
const generate_password_1 = __importDefault(require("generate-password"));
const uuid_1 = require("uuid");
const error_1 = require("./error");
const db_1 = require("@b/db");
const console_1 = require("./console");
function makeRandomString32() {
    return crypto_1.default.randomBytes(32).toString("hex");
}
async function hashPassword(password) {
    try {
        return await argon2_1.default.hash(password);
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: err.message,
        });
    }
}
function makeUuid() {
    return (0, uuid_1.v4)();
}
async function generateNewPassword(id) {
    const password = generate_password_1.default.generate({
        length: 20,
        numbers: true,
        symbols: true,
        strict: true,
    });
    try {
        validatePassword(password);
    }
    catch (error) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: error.message,
        });
    }
    try {
        const errorOrHashedPassword = await hashPassword(password);
        const hashedPassword = errorOrHashedPassword;
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
        console_1.logger.error("AUTH", "Error generating new password", error);
        throw (0, error_1.createError)({
            statusCode: 500,
            message: error.message,
        });
    }
}
async function verifyPassword(hash, password) {
    return !!(await argon2_1.default.verify(hash, password));
}
function validatePassword(password) {
    if (password.length < 8)
        return false;
    if (!/[A-Z]/.test(password))
        return false;
    if (!/[a-z]/.test(password))
        return false;
    if (!/\d/.test(password))
        return false;
    return !!/\W/.test(password);
}
