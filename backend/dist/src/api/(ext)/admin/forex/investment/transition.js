"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FOREX_INVESTMENT_STATUSES = void 0;
exports.transitionForexInvestment = transitionForexInvestment;
exports.transitionForexInvestments = transitionForexInvestments;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const console_1 = require("@b/utils/console");
const utils_1 = require("../utils");
exports.FOREX_INVESTMENT_STATUSES = [
    "ACTIVE",
    "COMPLETED",
    "CANCELLED",
    "REJECTED",
];
const REFUND_STATUSES = new Set(["CANCELLED", "REJECTED"]);
async function transitionForexInvestment(id, status, ctx) {
    return await db_1.sequelize.transaction(async (t) => {
        var _a;
        var _b;
        const investment = await db_1.models.forexInvestment.findByPk(id, {
            lock: t.LOCK.UPDATE,
            transaction: t,
        });
        if (!investment) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Forex investment not found" });
        }
        const previousStatus = investment.status;
        if (previousStatus === status) {
            return { id, changed: false, refunded: 0, reason: "already in that status" };
        }
        const owesRefund = REFUND_STATUSES.has(status) && previousStatus === "ACTIVE";
        let refunded = 0;
        if (owesRefund) {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Refunding the principal of ${status.toLowerCase()} investment ${id}`);
            const account = await db_1.models.forexAccount.findOne({
                where: { userId: investment.userId, type: "LIVE" },
                lock: t.LOCK.UPDATE,
                transaction: t,
            });
            if (!account) {
                throw (0, error_1.createError)({
                    statusCode: 404,
                    message: `Investment ${id} cannot be ${status.toLowerCase()}: the user has no LIVE forex account ` +
                        `to return the ${investment.amount} principal to.`,
                });
            }
            refunded = Number((_b = investment.amount) !== null && _b !== void 0 ? _b : 0);
            if (refunded > 0) {
                await (0, utils_1.updateForexAccountBalance)(account, refunded, true, t);
            }
            console_1.logger.info("FOREX_INVESTMENT_REFUND", `Refunded ${refunded} principal to forex account ${account.id} for ` +
                `${status.toLowerCase()} investment ${id} (user ${investment.userId})`);
        }
        const existingMetadata = (() => {
            const raw = investment.metadata;
            if (!raw)
                return {};
            if (typeof raw === "object")
                return raw;
            try {
                const parsed = JSON.parse(String(raw));
                return parsed && typeof parsed === "object" ? parsed : {};
            }
            catch (_a) {
                return {};
            }
        })();
        const statusUpdate = { status };
        if (owesRefund && refunded > 0) {
            statusUpdate.metadata = JSON.stringify({
                ...existingMetadata,
                principalRefunded: refunded,
                principalRefundedAt: new Date().toISOString(),
                principalRefundedBy: "ADMIN_STATUS_TRANSITION",
            });
        }
        const [affected] = await db_1.models.forexInvestment.update(statusUpdate, { where: { id, status: previousStatus }, transaction: t });
        if (affected === 0) {
            throw (0, error_1.createError)({
                statusCode: 409,
                message: `Investment ${id} changed status concurrently; nothing was updated.`,
            });
        }
        return { id, changed: true, refunded };
    });
}
async function transitionForexInvestments(ids, status, ctx) {
    const outcomes = [];
    const failures = [];
    for (const id of ids) {
        try {
            outcomes.push(await transitionForexInvestment(id, status, ctx));
        }
        catch (error) {
            failures.push({ id, error: (error === null || error === void 0 ? void 0 : error.message) || String(error) });
        }
    }
    return { outcomes, failures };
}
