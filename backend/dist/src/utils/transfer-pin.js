"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TRANSFER_PIN_LOCKOUT_LADDER_MINUTES = exports.TRANSFER_PIN_MAX_ATTEMPTS = exports.TRANSFER_PIN_LENGTH = void 0;
exports.lockoutMinutesFor = lockoutMinutesFor;
exports.isValidPinFormat = isValidPinFormat;
exports.isTrivialPin = isTrivialPin;
exports.getTransferPinRecord = getTransferPinRecord;
exports.hasTransferPin = hasTransferPin;
exports.getTransferPinState = getTransferPinState;
exports.setTransferPin = setTransferPin;
exports.clearTransferPin = clearTransferPin;
exports.unlockTransferPin = unlockTransferPin;
exports.verifyTransferPin = verifyTransferPin;
const db_1 = require("@b/db");
const passwords_1 = require("@b/utils/passwords");
const console_1 = require("@b/utils/console");
const user_activity_1 = require("@b/utils/user-activity");
exports.TRANSFER_PIN_LENGTH = 4;
exports.TRANSFER_PIN_MAX_ATTEMPTS = 5;
exports.TRANSFER_PIN_LOCKOUT_LADDER_MINUTES = [15, 60, 360, 1440];
function lockoutMinutesFor(lockoutCount) {
    const ladder = exports.TRANSFER_PIN_LOCKOUT_LADDER_MINUTES;
    return ladder[Math.min(Math.max(lockoutCount, 0), ladder.length - 1)];
}
const COMMON_PINS = new Set([
    "1004", "2000", "2001", "2002", "2020", "2021", "2022", "2023", "2024",
    "2025", "1010", "1122", "1212", "1313", "6969", "4200", "1379", "2580",
    "0852", "1998", "1999", "1990", "1991", "1992", "1995", "1996", "0007",
    "2468", "1357",
]);
function isValidPinFormat(pin) {
    return typeof pin === "string" && /^[0-9]{4}$/.test(pin);
}
function isTrivialPin(pin) {
    if (COMMON_PINS.has(pin))
        return true;
    const digits = pin.split("").map(Number);
    if (digits.every((d) => d === digits[0]))
        return true;
    const ascending = digits.every((d, i) => i === 0 || d === digits[i - 1] + 1);
    const descending = digits.every((d, i) => i === 0 || d === digits[i - 1] - 1);
    return ascending || descending;
}
async function getTransferPinRecord(userId) {
    return db_1.models.transferPin.findOne({ where: { userId } });
}
async function hasTransferPin(userId) {
    const record = await getTransferPinRecord(userId);
    return Boolean(record === null || record === void 0 ? void 0 : record.enabled);
}
async function getTransferPinState(userId) {
    const record = await getTransferPinRecord(userId);
    const hasPin = Boolean(record === null || record === void 0 ? void 0 : record.enabled);
    const lockedUntil = (record === null || record === void 0 ? void 0 : record.lockedUntil) && record.lockedUntil > new Date()
        ? record.lockedUntil
        : null;
    return { hasPin, locked: hasPin && Boolean(lockedUntil), lockedUntil };
}
async function setTransferPin(userId, pin) {
    const pinHash = await (0, passwords_1.hashPassword)(pin);
    const now = new Date();
    const existing = await getTransferPinRecord(userId);
    if (existing) {
        await existing.update({
            pinHash,
            enabled: true,
            failedAttempts: 0,
            lockoutCount: 0,
            lockedUntil: null,
            lastChangedAt: now,
        }, { hooks: false });
        return;
    }
    await db_1.models.transferPin.create({
        userId,
        pinHash,
        enabled: true,
        failedAttempts: 0,
        lockoutCount: 0,
        lockedUntil: null,
        lastChangedAt: now,
    });
}
async function clearTransferPin(userId) {
    const existing = await getTransferPinRecord(userId);
    if (!existing)
        return;
    await existing.update({
        enabled: false,
        failedAttempts: 0,
        lockoutCount: 0,
        lockedUntil: null,
    }, { hooks: false });
}
async function unlockTransferPin(userId) {
    var _a;
    const record = await getTransferPinRecord(userId);
    if (!(record === null || record === void 0 ? void 0 : record.enabled))
        return false;
    const wasLocked = record.lockedUntil !== null || ((_a = record.failedAttempts) !== null && _a !== void 0 ? _a : 0) > 0;
    await record.update({
        failedAttempts: 0,
        lockoutCount: 0,
        lockedUntil: null,
    }, { hooks: false });
    return wasLocked;
}
async function verifyTransferPin(userId, pin, req) {
    const record = await getTransferPinRecord(userId);
    if (!record || !record.enabled)
        return { ok: false, reason: "NOT_SET" };
    const now = new Date();
    if (record.lockedUntil && record.lockedUntil > now) {
        return { ok: false, reason: "LOCKED", lockedUntil: record.lockedUntil };
    }
    if (record.lockedUntil) {
        await db_1.models.transferPin.update({ failedAttempts: 0, lockedUntil: null }, {
            where: { id: record.id, lockedUntil: record.lockedUntil },
            hooks: false,
        });
        await record.reload();
    }
    await record.increment("failedAttempts", { by: 1 });
    await record.reload();
    const attempt = record.failedAttempts;
    if (attempt > exports.TRANSFER_PIN_MAX_ATTEMPTS) {
        const lockedUntil = await applyLockout(record, userId, req);
        return { ok: false, reason: "LOCKED", lockedUntil };
    }
    const attemptsLeft = Math.max(0, exports.TRANSFER_PIN_MAX_ATTEMPTS - attempt);
    if (!isValidPinFormat(pin)) {
        if (attempt === exports.TRANSFER_PIN_MAX_ATTEMPTS) {
            const lockedUntil = await applyLockout(record, userId, req);
            return { ok: false, reason: "WRONG", attemptsLeft: 0, lockedUntil };
        }
        return { ok: false, reason: "INVALID", attemptsLeft };
    }
    let matches = false;
    try {
        matches = await (0, passwords_1.verifyPassword)(record.pinHash, pin);
    }
    catch (error) {
        console_1.logger.error("TRANSFER_PIN", `PIN verification failed for user ${userId}`, error);
        matches = false;
    }
    if (matches) {
        await record.update({
            failedAttempts: 0,
            lockoutCount: 0,
            lockedUntil: null,
            lastVerifiedAt: now,
        }, { hooks: false });
        return { ok: true };
    }
    if (attempt >= exports.TRANSFER_PIN_MAX_ATTEMPTS) {
        const lockedUntil = await applyLockout(record, userId, req);
        return { ok: false, reason: "WRONG", attemptsLeft: 0, lockedUntil };
    }
    return { ok: false, reason: "WRONG", attemptsLeft };
}
async function applyLockout(record, userId, req) {
    var _a, _b;
    const lockoutCount = ((_a = record.lockoutCount) !== null && _a !== void 0 ? _a : 0) + 1;
    const minutes = lockoutMinutesFor(lockoutCount - 1);
    const lockedUntil = new Date(Date.now() + minutes * 60000);
    const [applied] = await db_1.models.transferPin.update({ lockedUntil, lockoutCount }, { where: { id: record.id, lockedUntil: null }, hooks: false });
    await record.reload();
    if (applied !== 1) {
        return (_b = record.lockedUntil) !== null && _b !== void 0 ? _b : lockedUntil;
    }
    void (0, user_activity_1.recordUserActivity)({
        userId,
        type: "security.transfer_pin_locked",
        title: "Transfer PIN locked",
        description: `The Transfer PIN was locked for ${minutes} minutes after ${exports.TRANSFER_PIN_MAX_ATTEMPTS} incorrect attempts`,
        severity: "warning",
        req,
    });
    return lockedUntil;
}
