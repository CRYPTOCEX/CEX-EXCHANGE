"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const step_up_2fa_1 = require("@b/utils/step-up-2fa");
exports.metadata = {
    summary: "Returns the two-factor policy for waiving a pool-backing obligation",
    description: "Reports which second-factor methods are accepted for writing off this obligation, whether the current admin satisfies the requirement (it is always required), why nobody can when the platform's 2FA configuration makes it unsatisfiable, and whether the two-person rule already refuses this admin.",
    operationId: "getPoolBackingWaiveTwoFactorPolicy",
    tags: ["Admin", "Finance", "Pool Backing"],
    requiresAuth: true,
    permission: "manage.pool.backing",
    parameters: [
        { index: 0, name: "id", in: "path", required: true, schema: { type: "string" }, description: "Obligation id" },
    ],
    responses: {
        200: {
            description: "Policy retrieved",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            requireEnrollment: { type: "boolean" },
                            requireChallenge: { type: "boolean" },
                            acceptedTypes: { type: "array", items: { type: "string" } },
                            userType: { type: "string", nullable: true },
                            userEnabled: { type: "boolean" },
                            satisfied: { type: "boolean" },
                            blockedReason: { type: "string", nullable: true },
                            obligation: { type: "object" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Obligation"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { user, params } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id))
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    const id = String((params === null || params === void 0 ? void 0 : params.id) || "");
    const obligation = await db_1.models.poolBackingObligation.findByPk(id, {
        attributes: ["id", "status", "createdBy", "currency", "amount"],
    });
    if (!obligation)
        throw (0, error_1.createError)({ statusCode: 404, message: "Obligation not found" });
    const policy = await (0, step_up_2fa_1.getStepUpPolicy)(step_up_2fa_1.POOL_BACKING_WAIVE_STEP_UP);
    const twoFactor = await (0, step_up_2fa_1.getUserTwoFactor)(String(user.id));
    return {
        requireEnrollment: policy.requireEnrollment,
        requireChallenge: policy.requireChallenge,
        acceptedTypes: policy.acceptedTypes,
        userType: (_a = twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.type) !== null && _a !== void 0 ? _a : null,
        userEnabled: Boolean(twoFactor === null || twoFactor === void 0 ? void 0 : twoFactor.enabled),
        satisfied: (0, step_up_2fa_1.satisfiesPolicy)(policy, twoFactor),
        blockedReason: (_b = policy.blockedReason) !== null && _b !== void 0 ? _b : null,
        obligation: {
            id: String(obligation.id),
            status: String(obligation.status),
            currency: String(obligation.currency),
            amount: Number(obligation.amount),
            createdByYou: !!obligation.createdBy && String(obligation.createdBy) === String(user.id),
        },
    };
};
