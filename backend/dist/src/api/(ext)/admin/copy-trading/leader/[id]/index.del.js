"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/copy-trading/utils");
const wallet_1 = require("@b/api/(ext)/ecosystem/utils/wallet");
exports.metadata = {
    summary: "Delete Leader (Admin)",
    description: "Deactivates a leader and optionally returns funds to followers from all their allocations.",
    operationId: "adminDeleteCopyTradingLeader",
    tags: ["Admin", "Copy Trading"],
    requiresAuth: true,
    permission: "access.copy_trading",
    middleware: ["copyTradingAdmin"],
    logModule: "ADMIN_COPY",
    logTitle: "Delete copy trading leader",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        refundFollowers: {
                            type: "boolean",
                            default: true,
                            description: "Return allocated funds to followers",
                        },
                        reason: {
                            type: "string",
                            description: "Reason for deletion",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: { description: "Leader deleted successfully" },
        400: { description: "Bad Request" },
        401: { description: "Unauthorized" },
        403: { description: "Forbidden" },
        404: { description: "Leader not found" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    const { params, body, user, ctx } = data;
    const { id } = params;
    const { refundFollowers = true, reason = "Admin deleted" } = body || {};
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching leader");
    const leader = await db_1.models.copyTradingLeader.findByPk(id);
    if (!leader) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Leader not found");
        throw (0, error_1.createError)({ statusCode: 404, message: "Leader not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Checking for open positions");
    const openTrades = await db_1.models.copyTradingTrade.count({
        where: {
            leaderId: id,
            status: { [sequelize_1.Op.in]: ["OPEN", "PENDING", "PARTIALLY_FILLED"] },
        },
    });
    if (openTrades > 0) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Cannot delete leader with ${openTrades} open positions. Please close all positions first.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching active followers");
    const followers = await db_1.models.copyTradingFollower.findAll({
        where: { leaderId: id, status: { [sequelize_1.Op.ne]: "STOPPED" } },
        include: [
            {
                model: db_1.models.copyTradingFollowerAllocation,
                as: "allocations",
                where: { isActive: true },
                required: false,
            },
        ],
    });
    let totalRefundedFollowers = 0;
    let totalRefundedAllocations = 0;
    await db_1.sequelize.transaction(async (transaction) => {
        if (refundFollowers) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step(`Processing ${followers.length} followers`);
            for (const follower of followers) {
                const followerData = follower;
                const allocations = followerData.allocations || [];
                if (allocations.length > 0) {
                    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Refunding ${allocations.length} allocations for follower ${followerData.userId}`);
                    for (const allocation of allocations) {
                        const alloc = allocation;
                        const [baseCurrency, quoteCurrency] = alloc.symbol.split("/");
                        const baseToRefund = Math.max(0, alloc.baseAmount - alloc.baseUsedAmount);
                        const quoteToRefund = Math.max(0, alloc.quoteAmount - alloc.quoteUsedAmount);
                        if (baseToRefund > 0) {
                            const baseWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(followerData.userId, baseCurrency);
                            if (baseWallet) {
                                const balanceBefore = parseFloat(baseWallet.balance.toString());
                                await (0, wallet_1.updateWalletBalance)(baseWallet, baseToRefund, "add", `ct_admin_leader_delete_base_${id}_${alloc.id}`, transaction);
                                await db_1.models.copyTradingTransaction.create({
                                    userId: followerData.userId,
                                    leaderId: id,
                                    followerId: followerData.id,
                                    type: "REFUND",
                                    amount: baseToRefund,
                                    currency: baseCurrency,
                                    balanceBefore,
                                    balanceAfter: balanceBefore + baseToRefund,
                                    description: `Refund: Leader deleted by admin - ${baseToRefund} ${baseCurrency} from ${alloc.symbol}`,
                                    metadata: JSON.stringify({
                                        allocationId: alloc.id,
                                        symbol: alloc.symbol,
                                        reason: "ADMIN_LEADER_DELETED",
                                    }),
                                }, { transaction });
                            }
                        }
                        if (quoteToRefund > 0) {
                            const quoteWallet = await (0, wallet_1.getWalletByUserIdAndCurrency)(followerData.userId, quoteCurrency);
                            if (quoteWallet) {
                                const balanceBefore = parseFloat(quoteWallet.balance.toString());
                                await (0, wallet_1.updateWalletBalance)(quoteWallet, quoteToRefund, "add", `ct_admin_leader_delete_quote_${id}_${alloc.id}`, transaction);
                                await db_1.models.copyTradingTransaction.create({
                                    userId: followerData.userId,
                                    leaderId: id,
                                    followerId: followerData.id,
                                    type: "REFUND",
                                    amount: quoteToRefund,
                                    currency: quoteCurrency,
                                    balanceBefore,
                                    balanceAfter: balanceBefore + quoteToRefund,
                                    description: `Refund: Leader deleted by admin - ${quoteToRefund} ${quoteCurrency} from ${alloc.symbol}`,
                                    metadata: JSON.stringify({
                                        allocationId: alloc.id,
                                        symbol: alloc.symbol,
                                        reason: "ADMIN_LEADER_DELETED",
                                    }),
                                }, { transaction });
                            }
                        }
                        if (baseToRefund > 0 || quoteToRefund > 0) {
                            await alloc.update({
                                isActive: false,
                                baseAmount: alloc.baseUsedAmount,
                                quoteAmount: alloc.quoteUsedAmount,
                            }, { transaction });
                            totalRefundedAllocations++;
                        }
                    }
                    totalRefundedFollowers++;
                }
                await follower.update({ status: "STOPPED" }, { transaction });
            }
        }
        else {
            for (const follower of followers) {
                await follower.update({ status: "STOPPED" }, { transaction });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Soft deleting leader");
        await leader.update({ status: "INACTIVE" }, { transaction });
        await leader.destroy({ transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating audit log");
        await (0, utils_1.createAuditLog)({
            entityType: "LEADER",
            entityId: id,
            action: "DELETE",
            oldValue: { status: leader.status },
            newValue: {
                status: "DELETED",
                refundedFollowers: totalRefundedFollowers,
                refundedAllocations: totalRefundedAllocations,
            },
            adminId: user === null || user === void 0 ? void 0 : user.id,
            reason,
        }, transaction);
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Leader deleted successfully. Processed ${followers.length} followers, refunded ${totalRefundedAllocations} allocations`);
    return {
        message: "Leader deleted successfully",
        totalFollowers: followers.length,
        refundedFollowers: totalRefundedFollowers,
        refundedAllocations: totalRefundedAllocations,
    };
};
