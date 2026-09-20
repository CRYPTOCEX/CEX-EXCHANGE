"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.describePinFailure = describePinFailure;
exports.assertTransferPinProof = assertTransferPinProof;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const passwords_1 = require("@b/utils/passwords");
const utils_1 = require("@b/api/auth/otp/utils");
const transfer_pin_1 = require("@b/utils/transfer-pin");
function describePinFailure(result) {
    switch (result.reason) {
        case "NOT_SET":
            return {
                statusCode: 400,
                message: "No Transfer PIN is set on this account.",
            };
        case "LOCKED":
            return {
                statusCode: 429,
                message: `Too many incorrect PIN attempts. Try again after ${result.lockedUntil.toISOString()}.`,
            };
        case "INVALID":
            return {
                statusCode: 400,
                message: `A Transfer PIN is four digits. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.`,
            };
        case "WRONG":
            return {
                statusCode: 401,
                message: result.lockedUntil
                    ? "Incorrect PIN. Your Transfer PIN is now locked — try again later, or reset it with your password."
                    : `Incorrect PIN. ${result.attemptsLeft} attempt${result.attemptsLeft === 1 ? "" : "s"} remaining.`,
            };
    }
}
async function assertTransferPinProof(userId, proof, ctx) {
    const { currentPin, password, otp } = proof;
    const [record, account, twoFactor] = await Promise.all([
        (0, transfer_pin_1.getTransferPinRecord)(userId),
        db_1.models.user.findByPk(userId),
        db_1.models.twoFactor.findOne({ where: { userId } }),
    ]);
    const hasPin = Boolean(record === null || record === void 0 ? void 0 : record.enabled);
    const hasPassword = Boolean(account === null || account === void 0 ? void 0 : account.password);
    const hasTwoFactor = Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled);
    if (!hasPin && !hasPassword && !hasTwoFactor) {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Binding first Transfer PIN (account holds no other credential)");
        return;
    }
    if (otp && hasTwoFactor && twoFactor) {
        let secret = null;
        try {
            secret = (0, utils_1.resolveTwoFactorSecret)(twoFactor);
        }
        catch (_a) {
            secret = null;
        }
        if (secret !== null &&
            (await (0, utils_1.consumeEnrolledOtp)(userId, secret, String(otp), twoFactor.type))) {
            return;
        }
        await (0, utils_1.consumeRecoveryCode)({ id: twoFactor.id, recoveryCodes: twoFactor.recoveryCodes }, String(otp));
        return;
    }
    if (currentPin !== undefined && currentPin !== "" && hasPin && !password) {
        const result = await (0, transfer_pin_1.verifyTransferPin)(userId, currentPin);
        if (result.ok)
            return;
        const { statusCode, message } = describePinFailure(result);
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer PIN proof failed: current PIN rejected");
        throw (0, error_1.createError)({ statusCode, message });
    }
    if (password) {
        if (!hasPassword || !(account === null || account === void 0 ? void 0 : account.password)) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer PIN proof failed: account has no password");
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "This account has no password set. Enter a code from your two-factor method instead.",
            });
        }
        if (await (0, passwords_1.verifyPassword)(account.password, String(password)))
            return;
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer PIN proof failed: incorrect password");
        throw (0, error_1.createError)({ statusCode: 401, message: "Incorrect password" });
    }
    const options = [];
    if (hasPin)
        options.push("your current Transfer PIN");
    if (hasPassword)
        options.push("your account password");
    if (hasTwoFactor)
        options.push("a code from your two-factor method");
    const list = options.length > 1
        ? `${options.slice(0, -1).join(", ")} or ${options[options.length - 1]}`
        : options[0];
    ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer PIN proof failed: no credential supplied");
    throw (0, error_1.createError)({
        statusCode: 400,
        message: `Changing your Transfer PIN requires ${list}.`,
    });
}
