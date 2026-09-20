"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const ledger_1 = require("@b/utils/pool-backing/ledger");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
exports.metadata = {
    summary: "Waives a pool-backing obligation as a recognised loss",
    description: "Marks an OPEN obligation WAIVED with a mandatory reason. The row stays in the console as recognised loss and keeps explaining the gap; it is never netted or settled. Two-person rule: the admin who caused an admin obligation cannot waive it. Step-up: the admin must confirm with a fresh two-factor code — the token from `waive/verification/verify` is sent as `twoFactorToken`; without it the answer is 409, and an admin with no second factor enrolled is refused (403).",
    operationId: "waivePoolBackingObligation",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "manage.pool.backing",
    logModule: "ADMIN_FIN",
    logTitle: "Waive pool-backing obligation",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Obligation id" },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        reason: { type: "string", description: "Why this is recognised as a loss rather than settled (at least 10 characters)" },
                        twoFactorToken: {
                            type: "string",
                            description: "Single-use step-up token from POST obligation/{id}/waive/verification/verify. Required: writing off money always needs a second factor.",
                        },
                    },
                    required: ["reason"],
                },
            },
        },
    },
    responses: {
        200: { description: "Waived" },
        400: { description: "Not waivable" },
        401: query_1.unauthorizedResponse,
        403: { description: "The two-person rule, or no second factor enrolled" },
        404: (0, query_1.notFoundMetadataResponse)("Obligation"),
        409: { description: "Two-factor verification required, expired or already used; or the row changed" },
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const reason = typeof (body === null || body === void 0 ? void 0 : body.reason) === "string" ? body.reason.trim() : "";
    if (reason.length < 10) {
        throw (0, error_1.createError)({ statusCode: 400, message: "A reason of at least 10 characters is required to waive an obligation" });
    }
    const existing = await db_1.models.poolBackingObligation.findByPk(id);
    if (!existing)
        throw (0, error_1.createError)({ statusCode: 404, message: "Obligation not found" });
    if (existing.status !== "OPEN") {
        throw (0, error_1.createError)({ statusCode: 400, message: `Only an OPEN obligation can be waived; this one is ${existing.status}` });
    }
    if (existing.createdBy && String(existing.createdBy) === String(user.id)) {
        throw (0, error_1.createError)({
            statusCode: 403,
            message: "The admin who created this obligation cannot waive it; ask another admin with the waive permission",
        });
    }
    const twoFactorToken = typeof (body === null || body === void 0 ? void 0 : body.twoFactorToken) === "string" ? body.twoFactorToken.trim() : "";
    await assertWaiveStepUp(String(user.id), id, twoFactorToken, ctx);
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Waiving obligation ${id}`);
    await db_1.sequelize.transaction(async (t) => {
        await (0, ledger_1.withCurrencyAnchor)(existing.currency, t);
        const [flipped] = await db_1.models.poolBackingObligation.update({ status: "WAIVED", waivedBy: user.id, waivedAt: new Date(), waiveReason: reason }, { where: { id, status: "OPEN" }, transaction: t });
        if (flipped === 0) {
            throw (0, error_1.createError)({ statusCode: 409, message: "The obligation changed while it was being waived; reload and try again" });
        }
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Obligation ${id} waived`);
    return { message: "Obligation waived and recorded as recognised loss" };
};
async function assertWaiveStepUp(userId, obligationId, token, ctx) {
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking the waive's two-factor requirement");
    const policy = await (0, step_up_2fa_1.getStepUpPolicy)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP);
    const twoFactor = await (0, step_up_2fa_1.getUserTwoFactor)(userId);
    if (!(0, step_up_2fa_1.satisfiesPolicy)(policy, twoFactor)) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Waive refused: no accepted second factor on the admin's account");
        if (policy.blockedReason) {
            throw (0, error_1.createError)({
                statusCode: 403,
                message: `Writing off money requires a second factor, and none can be verified on this platform right now: ` +
                    `${policy.blockedReason}. Enable two-factor authentication in Security settings, then waive again.`,
            });
        }
        const accepted = (0, step_up_2fa_1.describeAcceptedTypes)(policy.acceptedTypes);
        throw (0, error_1.createError)({
            statusCode: 403,
            message: (twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled)
                ? `Writing off money requires ${accepted} two-factor authentication. Your account uses ${step_up_2fa_1.TYPE_LABELS[twoFactor.type]} 2FA — switch method in your profile security settings, then waive again.`
                : `Writing off money requires a second factor. Enable ${accepted} two-factor authentication on your own account in your profile security settings, then waive again.`,
        });
    }
    if (!token) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Waive blocked: missing two-factor verification");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "This waive must be confirmed with a two-factor code. Request a verification code and submit it with the waive.",
        });
    }
    const consumed = await (0, step_up_2fa_1.consumeStepUpToken)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP, userId, token, (0, step_up_2fa_1.poolBackingWaiveBinding)(obligationId));
    if (!consumed) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Waive blocked: invalid, expired, already-used, or differently-bound 2FA verification");
        throw (0, error_1.createError)({
            statusCode: 409,
            message: "Your two-factor verification has expired or was already used. Please verify again to continue.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Two-factor verification accepted");
}
