"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const query_1 = require("@b/utils/query");
const wallet_1 = require("@b/services/wallet");
let getWalletByUserIdAndCurrency;
try {
    const ecosystemWallet = require("@b/api/(ext)/ecosystem/utils/wallet");
    getWalletByUserIdAndCurrency = ecosystemWallet.getWalletByUserIdAndCurrency;
}
catch (error) {
    getWalletByUserIdAndCurrency = null;
}
exports.metadata = {
    summary: "Claims a specific referral reward",
    description: "Processes the claim of a specified referral reward.",
    operationId: "claimReward",
    tags: ["MLM", "Rewards"],
    requiresAuth: true,
    logModule: "AFFILIATE",
    logTitle: "Claim affiliate reward",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "Referral reward UUID" },
        },
    ],
    responses: {
        200: {
            description: "Reward claimed successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string", description: "Success message" },
                        },
                    },
                },
            },
        },
        401: query_1.unauthorizedResponse,
        404: (0, query_1.notFoundMetadataResponse)("Affiliate Reward"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    const { params, user, ctx } = data;
    const { id } = params;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching reward details and validating ownership");
    const reward = await db_1.models.mlmReferralReward.findOne({
        where: { id, isClaimed: false, referrerId: user.id },
        include: [{ model: db_1.models.mlmReferralCondition, as: "condition" }],
    });
    if (!reward)
        throw (0, error_1.createError)({ statusCode: 404, message: "Reward not found or already claimed" });
    if (!reward.condition)
        throw (0, error_1.createError)({ statusCode: 500, message: "Reward condition not found" });
    const condition = reward.condition;
    let updatedWallet;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Retrieving or creating ${condition.rewardWalletType} wallet for ${condition.rewardCurrency}`);
    if (condition.rewardWalletType === "ECO") {
        if (getWalletByUserIdAndCurrency) {
            updatedWallet = await getWalletByUserIdAndCurrency(user.id, condition.rewardCurrency);
        }
        else {
            const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, "ECO", condition.rewardCurrency);
            updatedWallet = walletResult.wallet;
        }
    }
    else {
        const walletResult = await wallet_1.walletCreationService.getOrCreateWallet(user.id, condition.rewardWalletType, condition.rewardCurrency);
        updatedWallet = walletResult.wallet;
    }
    if (!updatedWallet)
        throw (0, error_1.createError)({ statusCode: 500, message: "Wallet not found or could not be created" });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Processing reward claim in transaction");
    await db_1.sequelize.transaction(async (transaction) => {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying reward is still available (preventing race conditions)");
        const rewardToUpdate = await db_1.models.mlmReferralReward.findOne({
            where: { id, isClaimed: false, referrerId: user.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!rewardToUpdate) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Reward not found or already claimed" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step(`Crediting reward via wallet service: ${rewardToUpdate.reward} ${condition.rewardCurrency}`);
        const idempotencyKey = `affiliate_reward_${id}`;
        await wallet_1.walletService.credit({
            idempotencyKey,
            userId: user.id,
            walletId: updatedWallet.id,
            walletType: condition.rewardWalletType,
            currency: condition.rewardCurrency,
            amount: rewardToUpdate.reward,
            operationType: "REFERRAL_REWARD",
            referenceId: id,
            description: `Referral reward for ${condition.type}`,
            metadata: {
                rewardId: id,
                conditionId: reward.conditionId,
                conditionType: condition.type,
            },
            transaction,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Marking reward as claimed");
        await rewardToUpdate.update({ isClaimed: true }, { transaction });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Claimed ${reward.reward} ${condition.rewardCurrency} in referral rewards`);
    return { message: "Reward claimed successfully" };
};
