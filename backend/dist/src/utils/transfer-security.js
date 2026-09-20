"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TYPE_LABELS = void 0;
exports.getTransferSecurityPolicy = getTransferSecurityPolicy;
exports.policyCoversTransfer = policyCoversTransfer;
exports.getTransferCredentialStatus = getTransferCredentialStatus;
exports.assertTransferSecurity = assertTransferSecurity;
const error_1 = require("@b/utils/error");
const cache_1 = require("@b/utils/cache");
const console_1 = require("@b/utils/console");
const transfer_2fa_1 = require("@b/utils/transfer-2fa");
Object.defineProperty(exports, "TYPE_LABELS", { enumerable: true, get: function () { return transfer_2fa_1.TYPE_LABELS; } });
const transfer_pin_1 = require("@b/utils/transfer-pin");
const INACTIVE_POLICY = {
    pinAccepted: false,
    twoFactorAccepted: false,
    scope: "client",
    twoFactor: { requireEnrollment: false, requireChallenge: false, acceptedTypes: [] },
    active: false,
};
function readScope(settings) {
    const raw = settings.get("transferSecurityScope");
    if (raw === undefined || raw === "" || raw === "client")
        return "client";
    if (raw === "all")
        return "all";
    console_1.logger.warn("TRANSFER_2FA", `transferSecurityScope is set to "${raw}", which is not a recognised scope. Falling back to "client" — transfers between a user's own wallets are NOT being verified. Set it to "client" or "all".`);
    return "client";
}
async function getTransferSecurityPolicy() {
    const settings = await cache_1.CacheManager.getInstance().getSettings();
    const pinAccepted = settings.get("transferPinRequired") === "true";
    const challengeRequested = settings.get("transferTwoFactorChallenge") === "true";
    if (!pinAccepted && !challengeRequested)
        return INACTIVE_POLICY;
    const twoFactor = await (0, transfer_2fa_1.getTransferTwoFactorPolicy)();
    const twoFactorAccepted = twoFactor.requireChallenge;
    if (challengeRequested && !twoFactorAccepted && !pinAccepted) {
        console_1.logger.warn("TRANSFER_2FA", "Transfer verification is switched on but cannot be enforced, so transfers are NOT being verified. Enable a deliverable 2FA method, or switch on Require Transfer PIN, which needs no platform configuration.");
    }
    return {
        pinAccepted,
        twoFactorAccepted,
        scope: readScope(settings),
        twoFactor,
        active: pinAccepted || twoFactorAccepted,
    };
}
function policyCoversTransfer(policy, kind, alwaysInScope = false) {
    if (!policy.active)
        return false;
    if (alwaysInScope)
        return true;
    return policy.scope === "all" || kind === "client";
}
async function getTransferCredentialStatus(userId, policy) {
    const [pinState, twoFactor] = await Promise.all([
        policy.pinAccepted
            ? (0, transfer_pin_1.getTransferPinState)(userId)
            : Promise.resolve({ hasPin: false, locked: false, lockedUntil: null }),
        policy.twoFactorAccepted
            ? (0, transfer_2fa_1.getUserTransferTwoFactor)(userId)
            : Promise.resolve(null),
    ]);
    const hasTwoFactor = policy.twoFactorAccepted && (0, transfer_2fa_1.satisfiesPolicy)(policy.twoFactor, twoFactor);
    return {
        hasPin: pinState.hasPin,
        pinLocked: pinState.locked,
        pinLockedUntil: pinState.lockedUntil,
        hasTwoFactor,
        satisfiable: (policy.pinAccepted && pinState.hasPin && !pinState.locked) ||
            (policy.twoFactorAccepted && hasTwoFactor),
    };
}
function setupInstruction(policy, status) {
    var _a;
    if (policy.pinAccepted && status.hasPin && status.pinLocked && !status.hasTwoFactor) {
        return `Your Transfer PIN is locked after too many incorrect attempts. It unlocks automatically${status.pinLockedUntil ? ` at ${status.pinLockedUntil.toISOString()}` : ""}. To restore it sooner, set a new PIN from your profile security settings — that needs your account password or a two-factor code.`;
    }
    const routes = [];
    if (policy.pinAccepted && !status.hasPin) {
        routes.push("set a Transfer PIN");
    }
    if (policy.twoFactorAccepted && !status.hasTwoFactor) {
        const accepted = (0, transfer_2fa_1.describeAcceptedTypes)(policy.twoFactor.acceptedTypes);
        routes.push(accepted ? `enable ${accepted} two-factor authentication` : "enable two-factor authentication");
    }
    const list = routes.length > 1
        ? `${routes.slice(0, -1).join(", ")} or ${routes[routes.length - 1]}`
        : (_a = routes[0]) !== null && _a !== void 0 ? _a : "set up transfer verification";
    return `Transfers must be confirmed. Please ${list} in your profile security settings, then try again.`;
}
async function assertTransferSecurity(userId, kind, recipientId, transferToken, ctx, alwaysInScope = false, bindingOverride, noTokenMessage) {
    const policy = await getTransferSecurityPolicy();
    if (!policyCoversTransfer(policy, kind, alwaysInScope))
        return;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking transfer verification requirements");
    if (!transferToken) {
        const status = await getTransferCredentialStatus(userId, policy);
        if (!status.satisfiable) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer blocked: no verification credential set up");
            throw (0, error_1.createError)({
                statusCode: 403,
                message: setupInstruction(policy, status),
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer blocked: missing verification");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: noTokenMessage !== null && noTokenMessage !== void 0 ? noTokenMessage : "This transfer must be confirmed. Verify with your Transfer PIN or a one-time code and submit it with the transfer.",
        });
    }
    const consumed = await (0, transfer_2fa_1.consumeTransferStepUpToken)(userId, transferToken, bindingOverride !== null && bindingOverride !== void 0 ? bindingOverride : (0, transfer_2fa_1.transferBinding)(kind, recipientId));
    if (!consumed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Transfer blocked: invalid, already-used, or mis-bound verification");
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "Your transfer verification has expired, was already used, or was for a different recipient. Please verify again to continue.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Transfer verification accepted");
}
