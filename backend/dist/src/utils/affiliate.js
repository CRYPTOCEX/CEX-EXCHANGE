"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleUnilevelMlmReferralRegister = exports.handleBinaryMlmReferralRegister = exports.handleReferralRegister = void 0;
exports.processRewards = processRewards;
const db_1 = require("@b/db");
const notifications_1 = require("./notifications");
const console_1 = require("@b/utils/console");
const cache_1 = require("@b/utils/cache");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const safe_imports_1 = require("@b/utils/safe-imports");
async function getMlmSystemAndSettings() {
    const utils = await (0, safe_imports_1.getAffiliateUtils)();
    if (utils === null || utils === void 0 ? void 0 : utils.getMlmSystemAndSettings) {
        return utils.getMlmSystemAndSettings();
    }
    return { mlmSystem: "DIRECT", mlmSettings: {} };
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
                rewardsProcessed = await processDirectRewards(condition, userId, amount, ctx, sourceId);
                break;
            case "BINARY":
                rewardsProcessed = await processBinaryRewards(condition, userId, amount, mlmSettings, ctx, sourceId);
                break;
            case "UNILEVEL":
                rewardsProcessed = await processUnilevelRewards(condition, userId, amount, mlmSettings, ctx, sourceId);
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
async function processDirectRewards(condition, referredId, amount, ctx, sourceId) {
    var _a, _b, _c;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Finding referral record");
        const referral = await db_1.models.mlmReferral.findOne({
            where: { referredId, status: "ACTIVE" },
        });
        if (!referral)
            return false;
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Calculating reward amount");
        const rewardAmount = condition.rewardType === "PERCENTAGE"
            ? amount * (condition.reward / 100)
            : condition.reward;
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
async function findUplines(userId, systemType, levels) {
    const uplines = [];
    let currentUserId = userId;
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
                    createdAt: {
                        [sequelize_1.Op.gte]: new Date(Date.now() - 60000)
                    }
                }
            });
            if (existingReward) {
                console_1.logger.warn("MLM", `Duplicate reward prevented (60s window) for referrer ${referrerId}, condition ${conditionId}`);
                return false;
            }
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
async function processBinaryRewards(condition, userId, depositAmount, mlmSettings, ctx, sourceId) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating binary MLM settings");
        if (!mlmSettings.binary || !mlmSettings.binary.levels) {
            return false;
        }
        if (mlmSettings.binary.levelsPercentage && Array.isArray(mlmSettings.binary.levelsPercentage)) {
            const totalCommission = mlmSettings.binary.levelsPercentage.reduce((sum, level) => {
                const percentage = typeof level.value === 'number' ? level.value : 0;
                return sum + percentage;
            }, 0);
            if (totalCommission > 100) {
                console_1.logger.error("MLM", `Total binary commission percentages (${totalCommission}%) cannot exceed 100%`, new Error(`Total binary commission percentages (${totalCommission}%) cannot exceed 100%`));
                return false;
            }
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding binary uplines");
        const binaryLevels = mlmSettings.binary.levels;
        const uplines = await findUplines(userId, "BINARY", binaryLevels);
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
                const conditionReward = depositAmount * (condition.reward / 100);
                finalReward = conditionReward * (levelRewardPercentage / 100);
            }
            else {
                finalReward = condition.reward * (levelRewardPercentage / 100);
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
async function processUnilevelRewards(condition, userId, depositAmount, mlmSettings, ctx, sourceId) {
    var _a, _b, _c, _d;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Validating unilevel MLM settings");
        if (!mlmSettings.unilevel || !mlmSettings.unilevel.levels) {
            return false;
        }
        if (mlmSettings.unilevel.levelsPercentage && Array.isArray(mlmSettings.unilevel.levelsPercentage)) {
            const totalCommission = mlmSettings.unilevel.levelsPercentage.reduce((sum, level) => {
                const percentage = typeof level.value === 'number' ? level.value : 0;
                return sum + percentage;
            }, 0);
            if (totalCommission > 100) {
                console_1.logger.error("MLM", `Total unilevel commission percentages (${totalCommission}%) cannot exceed 100%`, new Error(`Total unilevel commission percentages (${totalCommission}%) cannot exceed 100%`));
                return false;
            }
        }
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Finding unilevel uplines");
        const unilevelLevels = mlmSettings.unilevel.levels;
        const uplines = await findUplines(userId, "UNILEVEL", unilevelLevels);
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
                const conditionReward = depositAmount * (condition.reward / 100);
                finalReward = conditionReward * (levelRewardPercentage / 100);
            }
            else {
                finalReward = condition.reward * (levelRewardPercentage / 100);
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
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Finding referrer user");
        const referrer = await db_1.models.user.findByPk(refId);
        if (referrer) {
            (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Loading referral settings");
            const cacheManager = cache_1.CacheManager.getInstance();
            const settings = await cacheManager.getSettings();
            const referralApprovalRequired = settings.has("referralApprovalRequired")
                ? settings.get("referralApprovalRequired") === "true"
                : false;
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Creating referral record");
            const referral = await db_1.models.mlmReferral.create({
                referrerId: referrer.id,
                referredId: userId,
                status: referralApprovalRequired ? "PENDING" : "ACTIVE",
            });
            const { mlmSystem } = await getMlmSystemAndSettings();
            if (mlmSystem === "DIRECT") {
                return;
            }
            else if (mlmSystem === "BINARY") {
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Registering binary MLM node");
                await (0, exports.handleBinaryMlmReferralRegister)(referrer.id, referral, db_1.models.mlmBinaryNode, ctx);
            }
            else if (mlmSystem === "UNILEVEL") {
                (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Registering unilevel MLM node");
                await (0, exports.handleUnilevelMlmReferralRegister)(referrer.id, referral, db_1.models.mlmUnilevelNode, ctx);
            }
        }
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message || "Failed to handle referral register");
        console_1.logger.error("MLM", "Failed to handle referral register", error);
        throw error;
    }
};
exports.handleReferralRegister = handleReferralRegister;
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
