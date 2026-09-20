"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnilevelMlmReferralRegister = exports.handleBinaryMlmReferralRegister = exports.removeReferralFromTree = exports.placeReferralInTree = exports.handleReferralRegister = exports.EVENT_DRIVEN_CONDITION_NAMES = void 0;
exports.isReferralApprovalRequired = isReferralApprovalRequired;
exports.processFirstDepositRewards = processFirstDepositRewards;
exports.payableReward = payableReward;
exports.processRewards = processRewards;
const db_1 = require("@b/db");
const notifications_1 = require("./notifications");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const safe_imports_1 = require("@b/utils/safe-imports");
const utils_1 = require("@b/api/finance/currency/utils");
const rate_math_1 = require("@b/api/finance/currency/rate-math");
const precision_1 = require("@b/services/wallet/utils/precision");
async function getMlmSystemAndSettings() {
    const utils = await (0, safe_imports_1.getAffiliateUtils)();
    if (utils === null || utils === void 0 ? void 0 : utils.getMlmSystemAndSettings) {
        return utils.getMlmSystemAndSettings();
    }
    return { mlmSystem: "DIRECT", mlmSettings: {} };
}
exports.EVENT_DRIVEN_CONDITION_NAMES = new Set([
    "WELCOME_BONUS",
    "FIRST_DEPOSIT_BONUS",
    "ECOMMERCE_PURCHASE",
    "ICO_CONTRIBUTION",
    "STAKING",
    "STAKING_LOYALTY",
    "AI_INVESTMENT",
    "INVESTMENT",
    "GENERAL_INVESTMENT",
    "FOREX_INVESTMENT",
    "NFT_PURCHASE",
    "NFT_SALE",
    "P2P_TRADE",
    "P2P_TRADE_COMPLETION",
    "COPY_TRADING",
    "FUTURES_TRADE",
    "BINARY_WIN",
    "BINARY_TRADE_VOLUME",
    "FX_TRADE_COMMISSION",
    "FX_TRADE_VOLUME",
]);
function isReferralApprovalRequired(settings) {
    const fromScreen = settings.get("affiliateRequireApproval");
    if (fromScreen !== undefined && fromScreen !== null && fromScreen !== "") {
        return String(fromScreen) === "true";
    }
    const legacy = settings.get("referralApprovalRequired");
    return String(legacy) === "true";
}
async function processFirstDepositRewards(userId, amount, currency, depositTransactionId) {
    const deposits = await db_1.models.transaction.findAll({
        where: { userId, type: "DEPOSIT" },
        attributes: ["id"],
        paranoid: false,
    });
    const depositIds = deposits.map((d) => d.id);
    if (!depositIds.includes(depositTransactionId))
        depositIds.push(depositTransactionId);
    for (const conditionName of ["WELCOME_BONUS", "FIRST_DEPOSIT_BONUS"]) {
        try {
            const alreadyPaid = await db_1.models.mlmReferralReward.findOne({
                where: { sourceId: depositIds.map((id) => `${conditionName}:deposit:${id}`) },
                attributes: ["id"],
                paranoid: false,
            });
            if (alreadyPaid)
                continue;
            await processRewards(userId, amount, conditionName, currency, `${conditionName}:deposit:${depositTransactionId}`);
        }
        catch (error) {
            console_1.logger.error("MLM", `First-deposit reward ${conditionName} failed for user ${userId}: ${error.message}`);
        }
    }
}
async function amountInRewardCurrency(amount, activityCurrency, rewardCurrency) {
    const from = String(activityCurrency !== null && activityCurrency !== void 0 ? activityCurrency : "").toUpperCase();
    const to = String(rewardCurrency !== null && rewardCurrency !== void 0 ? rewardCurrency : "").toUpperCase();
    if (!from || !to || from === to)
        return amount;
    const rates = await (0, utils_1.getUsdRates)([from, to]);
    const fromUsd = Number(rates === null || rates === void 0 ? void 0 : rates.get(from));
    const toUsd = Number(rates === null || rates === void 0 ? void 0 : rates.get(to));
    if (!Number.isFinite(fromUsd) || fromUsd <= 0)
        return null;
    if (!Number.isFinite(toUsd) || toUsd <= 0)
        return null;
    return amount * (0, rate_math_1.crossMidRate)(fromUsd, toUsd);
}
function payableReward(amount, rewardCurrency) {
    const currency = String(rewardCurrency !== null && rewardCurrency !== void 0 ? rewardCurrency : "").trim().toUpperCase();
    if (!currency)
        return amount;
    return (0, precision_1.roundToPrecision)(amount, currency);
}
async function processRewards(userId, amount, conditionName, currency, ctxOrSourceId, maybeCtx) {
    var _a, _b, _c, _d, _e, _f, _g;
    let ctx;
    let sourceId;
    if (typeof ctxOrSourceId === "string") {
        sourceId = ctxOrSourceId;
        ctx = maybeCtx;
    }
    else {
        ctx = ctxOrSourceId;
        sourceId = undefined;
    }
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Checking MLM extension status");
    const cacheManager = cache_1.CacheManager.getInstance();
    const extensions = await cacheManager.getExtensions();
    if (!extensions.has("mlm"))
        return;
    (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Loading MLM settings");
    const { mlmSystem, mlmSettings } = await getMlmSystemAndSettings();
    if (mlmSystem === "BINARY" && !mlmSettings.binary) {
        return;
    }
    else if (mlmSystem === "UNILEVEL" && !mlmSettings.unilevel) {
        return;
    }
    const { mlmReferralCondition } = db_1.models;
    try {
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Looking up referral condition");
        const condition = await mlmReferralCondition.findOne({
            where: { name: conditionName, status: true },
        });
        if (!condition) {
            console_1.logger.warn("MLM", `Referral condition not found or inactive: ${conditionName}`);
            return;
        }
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Validating transaction against condition requirements");
        if (!isValidTransaction(conditionName, amount, currency, condition.minAmount)) {
            console_1.logger.warn("MLM", `Transaction validation failed: ${conditionName}, amount=${amount}, currency=${currency}, minAmount=${condition.minAmount}`);
            return;
        }
        let rewardsProcessed = false;
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, `Processing ${mlmSystem} rewards`);
        switch (mlmSystem) {
            case "DIRECT":
                rewardsProcessed = await processDirectRewards(condition, userId, amount, ctx, sourceId, currency);
                break;
            case "BINARY":
                rewardsProcessed = await processBinaryRewards(condition, userId, amount, mlmSettings, ctx, sourceId, currency);
                break;
            case "UNILEVEL":
                rewardsProcessed = await processUnilevelRewards(condition, userId, amount, mlmSettings, ctx, sourceId, currency);
                break;
            default:
                console_1.logger.error("MLM", "Invalid MLM system type", new Error("Invalid MLM system type"));
                break;
        }
        if (rewardsProcessed) {
            (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Sending reward notifications");
            const referral = await db_1.models.mlmReferral.findOne({
                where: { referredId: userId, status: "ACTIVE" },
                attributes: ["referrerId"],
            });
            const notifyUserId = (referral === null || referral === void 0 ? void 0 : referral.referrerId) || userId;
            await (0, notifications_1.createNotification)({
                userId: notifyUserId,
                relatedId: condition.id ? condition.id.toString() : undefined,
                title: "Referral Reward Earned",
                message: `You earned a referral reward for ${conditionName} from a ${amount} ${currency} transaction.`,
                type: "system",
                link: `/affiliate/reward`,
                actions: [
                    {
                        label: "View Rewards",
                        link: `/affiliate/reward`,
                        primary: true,
                    },
                ],
            }, ctx);
            await (0, notifications_1.createAdminNotification)("View MLM Rewards", "MLM Reward Processed", `A reward for ${conditionName} of ${amount} ${currency} was processed for user ${userId}.`, "system", `/admin/affiliate/reward`, undefined, undefined, ctx);
        }
    }
    catch (error) {
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, error.message || "Failed to process rewards");
        console_1.logger.error("MLM", "Failed to process rewards", error);
    }
}
function isValidTransaction(conditionName, amount, currency, minAmount) {
    if (!conditionName || typeof conditionName !== 'string') {
        return false;
    }
    if (typeof amount !== 'number' || amount <= 0 || !isFinite(amount)) {
        return false;
    }
    if (!currency || typeof currency !== 'string') {
        return false;
    }
    if (amount < minAmount) {
        return false;
    }
    switch (conditionName) {
        case "WELCOME_BONUS":
            return currency === "USDT";
        case "MONTHLY_TRADE_VOLUME":
            return currency === "USDT";
        case "BINARY_TRADE_VOLUME":
            return currency === "USDT";
        case "FIRST_DEPOSIT_BONUS":
        case "DEPOSIT":
        case "SPOT_TRADE":
        case "SPOT_TRADE_VOLUME":
        case "TRADE":
        case "TRADE_COMMISSION":
        case "BINARY_WIN":
        case "BINARY_WIN_COMMISSION":
        case "INVESTMENT":
        case "GENERAL_INVESTMENT":
        case "AI_INVESTMENT":
        case "AI_INVESTMENT_PROFIT":
        case "FOREX_INVESTMENT":
        case "FOREX_PROFIT":
        case "FOREX_TRADE":
        case "FX_TRADE_COMMISSION":
        case "FX_TRADE_VOLUME":
        case "ICO_CONTRIBUTION":
        case "ICO_PURCHASE":
        case "STAKING":
        case "STAKING_LOYALTY":
        case "ECOMMERCE_PURCHASE":
        case "ECOMMERCE_ORDER":
        case "P2P_TRADE":
        case "P2P_TRADE_COMPLETION":
        case "NFT_PURCHASE":
        case "NFT_SALE":
        case "NFT_TRADE":
        case "COPY_TRADING":
        case "COPY_TRADING_PROFIT":
        case "FUTURES_TRADE":
        case "FUTURES_PROFIT":
        case "FUTURES_VOLUME":
        case "TOKEN_PURCHASE":
        case "TOKEN_SALE":
            return true;
        default:
            console_1.logger.warn("MLM", `Unknown condition name attempted: ${conditionName}`);
            return false;
    }
}
async function processDirectRewards(condition, referredId, amount, ctx, sourceId, activityCurrency) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Finding referral record");
        const referral = await db_1.models.mlmReferral.findOne({
            where: {
                referredId,
                status: "ACTIVE",
                referrerId: { [sequelize_1.Op.ne]: referredId },
            },
        });
        if (!referral)
            return false;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Calculating reward amount");
        let rewardAmount;
        if (condition.rewardType !== "PERCENTAGE") {
            rewardAmount = condition.reward;
        }
        else {
            const base = await amountInRewardCurrency(amount, activityCurrency, condition.rewardCurrency);
            if (base === null) {
                console_1.logger.warn("MLM", `Skipping percentage reward for condition ${condition.id}: cannot price ` +
                    `${activityCurrency} or ${condition.rewardCurrency} in USD, and paying the ` +
                    `unconverted amount would pay a commission in the wrong unit`);
                return false;
            }
            rewardAmount = payableReward(base * (condition.reward / 100), condition.rewardCurrency);
        }
        if (rewardAmount <= 0) {
            console_1.logger.warn("MLM", `Invalid reward amount calculated: ${rewardAmount} (amount=${amount}, reward=${condition.reward}, type=${condition.rewardType})`);
            return false;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Creating reward record");
        const created = await createRewardRecord(referral.referrerId, rewardAmount, condition.id, sourceId);
        if (!created)
            return false;
        console_1.logger.info("MLM", `Direct reward created: ${rewardAmount} for referrer ${referral.referrerId}, condition ${condition.name || condition.id}`);
        return true;
    }
    catch (error) {
        console_1.logger.error("MLM", "Failed to process direct rewards", error);
        return false;
    }
}
async function findSponsorUplines(userId, levels) {
    const uplines = [];
    let currentUserId = userId;
    const seen = new Set([String(userId)]);
    for (let i = 0; i < levels; i++) {
        try {
            const referral = await db_1.models.mlmReferral.findOne({
                where: {
                    referredId: currentUserId,
                    status: "ACTIVE"
                },
            });
            if (!referral || !referral.referrerId) {
                console_1.logger.info("MLM", `No more uplines found at level ${i + 1} for user ${currentUserId}`);
                break;
            }
            const referrerId = String(referral.referrerId);
            if (referrerId === String(currentUserId)) {
                console_1.logger.info("MLM", `Reached the top of the chain at level ${i + 1} (self-referral for ${currentUserId})`);
                break;
            }
            if (seen.has(referrerId)) {
                console_1.logger.warn("MLM", `Referral cycle detected at level ${i + 1} via ${referrerId}; stopping the upline walk`);
                break;
            }
            seen.add(referrerId);
            uplines.push({
                level: i + 1,
                referrerId: referral.referrerId,
            });
            currentUserId = referral.referrerId;
        }
        catch (error) {
            console_1.logger.error("MLM", `Failed to find upline at level ${i + 1}`, error);
            break;
        }
    }
    console_1.logger.info("MLM", `Found ${uplines.length} uplines for user ${userId}: ${JSON.stringify(uplines)}`);
    return uplines;
}
async function createRewardRecord(referrerId, rewardAmount, conditionId, sourceId) {
    try {
        if (!referrerId || !conditionId) {
            throw (0, error_1.createError)({ statusCode: 400, message: "referrerId and conditionId are required" });
        }
        if (typeof rewardAmount !== 'number' || rewardAmount <= 0 || !isFinite(rewardAmount)) {
            throw (0, error_1.createError)({ statusCode: 400, message: `Invalid reward amount: ${rewardAmount}` });
        }
        if (sourceId) {
            const existingReward = await db_1.models.mlmReferralReward.findOne({
                where: { sourceId },
            });
            if (existingReward) {
                console_1.logger.warn("MLM", `Duplicate reward prevented (sourceId: ${sourceId}) for referrer ${referrerId}`);
                return false;
            }
        }
        else {
            const existingReward = await db_1.models.mlmReferralReward.findOne({
                where: {
                    referrerId,
                    conditionId,
                    reward: rewardAmount,
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(Date.now() - 60000)
                    }
                }
            });
            if (existingReward) {
                console_1.logger.warn("MLM", `Duplicate reward prevented (identical amount within 60s) for referrer ${referrerId}, condition ${conditionId}. ` +
                    `Pass a sourceId from the caller for exact deduplication.`);
                return false;
            }
            console_1.logger.warn("MLM", `Reward created without a sourceId (referrer ${referrerId}, condition ${conditionId}) — deduplication is approximate. ` +
                `The caller should pass a stable sourceId.`);
        }
        await db_1.models.mlmReferralReward.create({
            referrerId,
            reward: rewardAmount,
            conditionId,
            ...(sourceId ? { sourceId } : {}),
        });
        return true;
    }
    catch (error) {
        if ((error === null || error === void 0 ? void 0 : error.name) === "SequelizeUniqueConstraintError" && sourceId) {
            console_1.logger.warn("MLM", `Duplicate reward prevented (unique constraint: ${sourceId}) for referrer ${referrerId}`);
            return false;
        }
        console_1.logger.error("MLM", "Failed to create reward record", error);
        return false;
    }
}
async function processBinaryRewards(condition, userId, depositAmount, mlmSettings, ctx, sourceId, activityCurrency) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating binary MLM settings");
        if (!mlmSettings.binary || !mlmSettings.binary.levels) {
            return false;
        }
        if (mlmSettings.binary.levelsPercentage && Array.isArray(mlmSettings.binary.levelsPercentage)) {
            const totalCommission = mlmSettings.binary.levelsPercentage.reduce((sum, level) => {
                const percentage = Number(level === null || level === void 0 ? void 0 : level.value);
                return sum + (Number.isFinite(percentage) ? percentage : 0);
            }, 0);
            if (totalCommission > 100) {
                console_1.logger.error("MLM", `Total binary commission percentages (${totalCommission}%) cannot exceed 100%`, new Error(`Total binary commission percentages (${totalCommission}%) cannot exceed 100%`));
                return false;
            }
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding binary uplines");
        const binaryLevels = mlmSettings.binary.levels;
        const uplines = await findSponsorUplines(userId, binaryLevels);
        if (!uplines.length) {
            return false;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Processing rewards for ${uplines.length} uplines`);
        for (const upline of uplines) {
            const levelRewardPercentage = (_d = mlmSettings.binary.levelsPercentage.find((l) => l.level === upline.level)) === null || _d === void 0 ? void 0 : _d.value;
            if (levelRewardPercentage === undefined) {
                console_1.logger.info("MLM", `No reward percentage configured for binary level ${upline.level}`);
                continue;
            }
            let finalReward;
            if (condition.rewardType === "PERCENTAGE") {
                const base = await amountInRewardCurrency(depositAmount, activityCurrency, condition.rewardCurrency);
                if (base === null) {
                    console_1.logger.warn("MLM", `Skipping percentage reward for condition ${condition.id}: cannot price ` +
                        `${activityCurrency} or ${condition.rewardCurrency} in USD`);
                    continue;
                }
                const conditionReward = base * (condition.reward / 100);
                finalReward = payableReward(conditionReward * (levelRewardPercentage / 100), condition.rewardCurrency);
            }
            else {
                finalReward = payableReward(condition.reward * (levelRewardPercentage / 100), condition.rewardCurrency);
            }
            console_1.logger.info("MLM", `Binary reward for level ${upline.level}: ${finalReward} (${levelRewardPercentage}% of base)`);
            const levelSourceId = sourceId ? `${sourceId}:L${upline.level}` : undefined;
            await createRewardRecord(upline.referrerId, finalReward, condition.id, levelSourceId);
        }
        return true;
    }
    catch (error) {
        console_1.logger.error("MLM", "Failed to process binary rewards", error);
        return false;
    }
}
async function processUnilevelRewards(condition, userId, depositAmount, mlmSettings, ctx, sourceId, activityCurrency) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating unilevel MLM settings");
        if (!mlmSettings.unilevel || !mlmSettings.unilevel.levels) {
            return false;
        }
        if (mlmSettings.unilevel.levelsPercentage && Array.isArray(mlmSettings.unilevel.levelsPercentage)) {
            const totalCommission = mlmSettings.unilevel.levelsPercentage.reduce((sum, level) => {
                const percentage = Number(level === null || level === void 0 ? void 0 : level.value);
                return sum + (Number.isFinite(percentage) ? percentage : 0);
            }, 0);
            if (totalCommission > 100) {
                console_1.logger.error("MLM", `Total unilevel commission percentages (${totalCommission}%) cannot exceed 100%`, new Error(`Total unilevel commission percentages (${totalCommission}%) cannot exceed 100%`));
                return false;
            }
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding unilevel uplines");
        const unilevelLevels = mlmSettings.unilevel.levels;
        const uplines = await findSponsorUplines(userId, unilevelLevels);
        if (!uplines.length) {
            return false;
        }
        (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, `Processing rewards for ${uplines.length} uplines`);
        for (const upline of uplines) {
            const levelRewardPercentage = (_d = mlmSettings.unilevel.levelsPercentage.find((l) => l.level === upline.level)) === null || _d === void 0 ? void 0 : _d.value;
            if (levelRewardPercentage === undefined) {
                console_1.logger.info("MLM", `No reward percentage configured for unilevel level ${upline.level}`);
                continue;
            }
            let finalReward;
            if (condition.rewardType === "PERCENTAGE") {
                const base = await amountInRewardCurrency(depositAmount, activityCurrency, condition.rewardCurrency);
                if (base === null) {
                    console_1.logger.warn("MLM", `Skipping percentage reward for condition ${condition.id}: cannot price ` +
                        `${activityCurrency} or ${condition.rewardCurrency} in USD`);
                    continue;
                }
                const conditionReward = base * (condition.reward / 100);
                finalReward = payableReward(conditionReward * (levelRewardPercentage / 100), condition.rewardCurrency);
            }
            else {
                finalReward = payableReward(condition.reward * (levelRewardPercentage / 100), condition.rewardCurrency);
            }
            console_1.logger.info("MLM", `Unilevel reward for level ${upline.level}: ${finalReward} (${levelRewardPercentage}% of base)`);
            const levelSourceId = sourceId ? `${sourceId}:L${upline.level}` : undefined;
            await createRewardRecord(upline.referrerId, finalReward, condition.id, levelSourceId);
        }
        return true;
    }
    catch (error) {
        console_1.logger.error("MLM", "Failed to process unilevel rewards", error);
        return false;
    }
}
const handleReferralRegister = async (refId, userId, ctx) => {
    var _a, _b, _c, _d, _e, _f;
    try {
        if (refId === userId) {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Ignoring self-referral");
            console_1.logger.warn("MLM", `Self-referral blocked for user ${userId}`);
            return;
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding referrer user");
        const referrer = await db_1.models.user.findByPk(refId);
        if (referrer) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Loading referral settings");
            const cacheManager = cache_1.CacheManager.getInstance();
            const settings = await cacheManager.getSettings();
            const referralApprovalRequired = isReferralApprovalRequired(settings);
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating referral record");
            const referral = await db_1.models.mlmReferral.create({
                referrerId: referrer.id,
                referredId: userId,
                status: referralApprovalRequired ? "PENDING" : "ACTIVE",
            });
            if (referral.status !== "ACTIVE") {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Referral awaits approval — not placing it in the tree yet");
                return;
            }
            await (0, exports.placeReferralInTree)(referral, ctx);
        }
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message || "Failed to handle referral register");
        console_1.logger.error("MLM", "Failed to handle referral register", error);
        throw error;
    }
};
exports.handleReferralRegister = handleReferralRegister;
const placeReferralInTree = async (referral, ctx) => {
    var _a, _b;
    const { mlmSystem } = await getMlmSystemAndSettings();
    if (mlmSystem === "DIRECT")
        return;
    if (mlmSystem === "BINARY") {
        const existing = await db_1.models.mlmBinaryNode.findOne({
            where: { referralId: referral.id },
        });
        if (existing)
            return;
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Registering binary MLM node");
        await (0, exports.handleBinaryMlmReferralRegister)(referral.referrerId, referral, db_1.models.mlmBinaryNode, ctx);
        return;
    }
    if (mlmSystem === "UNILEVEL") {
        const existing = await db_1.models.mlmUnilevelNode.findOne({
            where: { referralId: referral.id },
        });
        if (existing)
            return;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Registering unilevel MLM node");
        await (0, exports.handleUnilevelMlmReferralRegister)(referral.referrerId, referral, db_1.models.mlmUnilevelNode, ctx);
    }
};
exports.placeReferralInTree = placeReferralInTree;
const removeReferralFromTree = async (referralId, ctx) => {
    var _a;
    var _b, _c;
    (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Removing the rejected referral from the tree");
    const binaryNode = await db_1.models.mlmBinaryNode.findOne({
        where: { referralId },
    });
    if (binaryNode) {
        if (binaryNode.parentId) {
            const parent = await db_1.models.mlmBinaryNode.findByPk(binaryNode.parentId);
            if (parent) {
                const patch = {};
                if (parent.leftChildId === binaryNode.id)
                    patch.leftChildId = null;
                if (parent.rightChildId === binaryNode.id)
                    patch.rightChildId = null;
                if (Object.keys(patch).length)
                    await parent.update(patch);
            }
        }
        await db_1.models.mlmBinaryNode.update({ parentId: (_b = binaryNode.parentId) !== null && _b !== void 0 ? _b : null }, { where: { parentId: binaryNode.id } });
        await binaryNode.destroy();
    }
    const unilevelNode = await db_1.models.mlmUnilevelNode.findOne({
        where: { referralId },
    });
    if (unilevelNode) {
        await db_1.models.mlmUnilevelNode.update({ parentId: (_c = unilevelNode.parentId) !== null && _c !== void 0 ? _c : null }, { where: { parentId: unilevelNode.id } });
        await unilevelNode.destroy();
    }
};
exports.removeReferralFromTree = removeReferralFromTree;
const checkCycleForBinary = async (referrerNode, newUserId, mlmBinaryNodeModel, transaction) => {
    let current = referrerNode;
    while (current) {
        const referral = await db_1.models.mlmReferral.findOne({
            where: { id: current.referralId },
            ...(transaction ? { transaction } : {}),
        });
        if (referral && referral.referredId === newUserId) {
            return true;
        }
        if (!current.parentId)
            break;
        current = await mlmBinaryNodeModel.findByPk(current.parentId, {
            ...(transaction ? { transaction } : {}),
        });
    }
    return false;
};
const checkCycleForUnilevel = async (referrerNode, newUserId, mlmUnilevelNodeModel, transaction) => {
    let current = referrerNode;
    while (current) {
        const referral = await db_1.models.mlmReferral.findOne({
            where: { id: current.referralId },
            ...(transaction ? { transaction } : {}),
        });
        if (referral && referral.referredId === newUserId) {
            return true;
        }
        if (!current.parentId)
            break;
        current = await mlmUnilevelNodeModel.findByPk(current.parentId, {
            ...(transaction ? { transaction } : {}),
        });
    }
    return false;
};
const handleBinaryMlmReferralRegister = async (referrerUserId, newReferral, mlmBinaryNode, ctx) => {
    return await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b, _c, _d, _e;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Finding referrer's referral record for binary node lookup");
            let referrerReferral = await db_1.models.mlmReferral.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { referredId: referrerUserId, referrerId: referrerUserId },
                        { referredId: referrerUserId },
                    ],
                },
                transaction,
            });
            if (!referrerReferral) {
                referrerReferral = await db_1.models.mlmReferral.create({
                    referrerId: referrerUserId,
                    referredId: referrerUserId,
                    status: "ACTIVE",
                }, { transaction });
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding or creating binary node for referrer");
            let referrerNode = await mlmBinaryNode.findOne({
                where: { referralId: referrerReferral.id },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!referrerNode) {
                referrerNode = await mlmBinaryNode.create({
                    referralId: referrerReferral.id,
                    parentId: null,
                }, { transaction });
            }
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Checking for referral cycles");
            const cycleExists = await checkCycleForBinary(referrerNode, newReferral.referredId, mlmBinaryNode, transaction);
            if (cycleExists) {
                throw (0, error_1.createError)({ statusCode: 409, message: "Referral loop detected: the referred user is already an ancestor." });
            }
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating binary node for new referral");
            let placementNode = referrerNode;
            if (referrerNode.leftChildId && referrerNode.rightChildId) {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Referrer node is full, finding next available slot via BFS");
                const queue = [referrerNode];
                let foundSlot = false;
                while (queue.length > 0 && !foundSlot) {
                    const node = queue.shift();
                    if (!node.leftChildId || !node.rightChildId) {
                        placementNode = node;
                        foundSlot = true;
                        break;
                    }
                    if (node.leftChildId) {
                        const leftNode = await mlmBinaryNode.findByPk(node.leftChildId, { transaction, lock: transaction.LOCK.UPDATE });
                        if (leftNode)
                            queue.push(leftNode);
                    }
                    if (node.rightChildId) {
                        const rightNode = await mlmBinaryNode.findByPk(node.rightChildId, { transaction, lock: transaction.LOCK.UPDATE });
                        if (rightNode)
                            queue.push(rightNode);
                    }
                }
                if (!foundSlot) {
                    throw (0, error_1.createError)({ statusCode: 409, message: "No available position in the binary tree." });
                }
            }
            const placementField = placementNode.leftChildId
                ? "rightChildId"
                : "leftChildId";
            const newNode = await mlmBinaryNode.create({
                referralId: newReferral.id,
                parentId: placementNode.id,
            }, { transaction });
            placementNode[placementField] = newNode.id;
            await placementNode.save({ transaction });
            return newNode;
        }
        catch (error) {
            console_1.logger.error("MLM", "Failed to handle binary MLM referral register", error);
            throw error;
        }
    });
};
exports.handleBinaryMlmReferralRegister = handleBinaryMlmReferralRegister;
const handleUnilevelMlmReferralRegister = async (referrerUserId, newReferral, mlmUnilevelNode, ctx) => {
    return await db_1.sequelize.transaction(async (transaction) => {
        var _a, _b, _c, _d;
        try {
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Finding referrer's referral record for unilevel node lookup");
            let referrerReferral = await db_1.models.mlmReferral.findOne({
                where: {
                    [sequelize_1.Op.or]: [
                        { referredId: referrerUserId, referrerId: referrerUserId },
                        { referredId: referrerUserId },
                    ],
                },
                transaction,
            });
            if (!referrerReferral) {
                referrerReferral = await db_1.models.mlmReferral.create({
                    referrerId: referrerUserId,
                    referredId: referrerUserId,
                    status: "ACTIVE",
                }, { transaction });
            }
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding or creating unilevel node for referrer");
            let referrerNode = await mlmUnilevelNode.findOne({
                where: { referralId: referrerReferral.id },
                transaction,
                lock: transaction.LOCK.UPDATE,
            });
            if (!referrerNode) {
                referrerNode = await mlmUnilevelNode.create({
                    referralId: referrerReferral.id,
                    parentId: null,
                }, { transaction });
            }
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Checking for referral cycles");
            const cycleExists = await checkCycleForUnilevel(referrerNode, newReferral.referredId, mlmUnilevelNode, transaction);
            if (cycleExists) {
                throw (0, error_1.createError)({ statusCode: 409, message: "Referral loop detected: the referred user is already an ancestor." });
            }
            (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating unilevel node for new referral");
            const newNode = await mlmUnilevelNode.create({
                referralId: newReferral.id,
                parentId: referrerNode.id,
            }, { transaction });
            return newNode;
        }
        catch (error) {
            console_1.logger.error("MLM", "Failed to handle unilevel MLM referral register", error);
            throw error;
        }
    });
};
exports.handleUnilevelMlmReferralRegister = handleUnilevelMlmReferralRegister;
