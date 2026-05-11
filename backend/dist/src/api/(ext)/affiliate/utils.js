"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseReferralSchema = void 0;
exports.getMlmSystemAndSettings = getMlmSystemAndSettings;
exports.listDirectReferrals = listDirectReferrals;
exports.listUnilevelReferrals = listUnilevelReferrals;
exports.listBinaryReferrals = listBinaryReferrals;
const db_1 = require("@b/db");
const schema_1 = require("@b/utils/schema");
const sequelize_1 = require("sequelize");
const cache_1 = require("@b/utils/cache");
async function getMlmSystemAndSettings() {
    const cacheManager = cache_1.CacheManager.getInstance();
    const settings = await cacheManager.getSettings();
    const mlmSystem = (settings.get("affiliateMlmSystem") || settings.get("mlmSystem") || "DIRECT");
    const mlmSettings = {};
    if (mlmSystem === "BINARY") {
        const binaryLevels = parseInt(settings.get("affiliateBinaryLevels") || "0");
        if (binaryLevels >= 2 && binaryLevels <= 7) {
            const levelsPercentage = [];
            for (let i = 1; i <= binaryLevels; i++) {
                const value = parseFloat(settings.get(`affiliateBinaryLevel${i}`) || "0");
                levelsPercentage.push({ level: i, value });
            }
            mlmSettings.binary = {
                levels: binaryLevels,
                levelsPercentage,
            };
        }
    }
    else if (mlmSystem === "UNILEVEL") {
        const unilevelLevels = parseInt(settings.get("affiliateUnilevelLevels") || "0");
        if (unilevelLevels >= 2 && unilevelLevels <= 7) {
            const levelsPercentage = [];
            for (let i = 1; i <= unilevelLevels; i++) {
                const value = parseFloat(settings.get(`affiliateUnilevelLevel${i}`) || "0");
                levelsPercentage.push({ level: i, value });
            }
            mlmSettings.unilevel = {
                levels: unilevelLevels,
                levelsPercentage,
            };
        }
    }
    return { mlmSystem, mlmSettings };
}
exports.baseReferralSchema = {
    id: (0, schema_1.baseStringSchema)("Referral ID"),
    referredId: (0, schema_1.baseStringSchema)("Referred user UUID"),
    referrerId: (0, schema_1.baseStringSchema)("Referrer user UUID"),
    createdAt: (0, schema_1.baseStringSchema)("Date of referral"),
};
async function listDirectReferrals(user, ctx) {
    var _a, _b, _c, _d, _e, _f, _g;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching direct referrals");
        const referrerId = user.id;
        const referrals = (await db_1.models.mlmReferral.findAll({
            where: { referrerId },
            include: [
                {
                    model: db_1.models.user,
                    as: "referred",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "avatar",
                        "createdAt",
                        "status",
                    ],
                    include: [
                        {
                            model: db_1.models.mlmReferral,
                            as: "referrerReferrals",
                            attributes: ["id"],
                        },
                        {
                            model: db_1.models.mlmReferralReward,
                            as: "referralRewards",
                            attributes: ["id"],
                        },
                    ],
                },
                {
                    model: db_1.models.user,
                    as: "referrer",
                    include: [
                        {
                            model: db_1.models.mlmReferralReward,
                            as: "referralRewards",
                            attributes: ["id"],
                        },
                    ],
                },
            ],
        }));
        (_b = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _b === void 0 ? void 0 : _b.call(ctx, "Processing referrals data");
        const downlines = referrals.map((referral) => {
            var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
            return ({
                id: (_a = referral.referred) === null || _a === void 0 ? void 0 : _a.id,
                firstName: (_b = referral.referred) === null || _b === void 0 ? void 0 : _b.firstName,
                lastName: (_c = referral.referred) === null || _c === void 0 ? void 0 : _c.lastName,
                avatar: (_d = referral.referred) === null || _d === void 0 ? void 0 : _d.avatar,
                createdAt: (_e = referral.referred) === null || _e === void 0 ? void 0 : _e.createdAt,
                status: (_f = referral.referred) === null || _f === void 0 ? void 0 : _f.status,
                level: 2,
                rewardsCount: ((_h = (_g = referral.referred) === null || _g === void 0 ? void 0 : _g.referralRewards) === null || _h === void 0 ? void 0 : _h.length) || 0,
                referredCount: ((_k = (_j = referral.referred) === null || _j === void 0 ? void 0 : _j.referrerReferrals) === null || _k === void 0 ? void 0 : _k.length) || 0,
                downlines: [],
            });
        });
        const rootUserRewardsCount = ((_e = (_d = (_c = referrals[0]) === null || _c === void 0 ? void 0 : _c.referrer) === null || _d === void 0 ? void 0 : _d.referralRewards) === null || _e === void 0 ? void 0 : _e.length) || 0;
        const result = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            createdAt: user.createdAt,
            status: user.status,
            level: 1,
            rewardsCount: rootUserRewardsCount,
            referredCount: referrals.length,
            downlines,
        };
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _f === void 0 ? void 0 : _f.call(ctx, "Direct referrals fetched successfully");
        return result;
    }
    catch (error) {
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _g === void 0 ? void 0 : _g.call(ctx, error.message);
        throw error;
    }
}
async function listUnilevelReferrals(user, mlmSettings, ctx) {
    var _a, _b, _c, _d, _e, _f;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching unilevel referrals");
        const userId = user.id;
        if (!((_b = mlmSettings === null || mlmSettings === void 0 ? void 0 : mlmSettings.unilevel) === null || _b === void 0 ? void 0 : _b.levels)) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Unilevel settings not configured, returning empty structure");
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                createdAt: user.createdAt,
                status: user.status,
                level: 1,
                rewardsCount: 0,
                referredCount: 0,
                downlines: [],
            };
        }
        const directReferrals = await db_1.models.mlmReferral.findAll({
            where: { referrerId: userId },
            include: [
                {
                    model: db_1.models.user,
                    as: "referred",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "avatar",
                        "createdAt",
                        "status",
                    ],
                    include: [
                        {
                            model: db_1.models.mlmReferralReward,
                            as: "referralRewards",
                            attributes: ["id"],
                        },
                    ],
                },
            ],
        });
        const rootUser = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            createdAt: user.createdAt,
            status: user.status,
            level: 1,
            rewardsCount: await db_1.models.mlmReferralReward.count({
                where: { referrerId: userId },
            }),
            referredCount: directReferrals.length,
            downlines: [],
        };
        const processedIds = new Set([user.id]);
        async function buildDownlines(referrals, level) {
            var _a, _b;
            if (level > mlmSettings.unilevel.levels || !referrals.length)
                return [];
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Building downlines for level ${level}`);
            const downlines = [];
            for (const referral of referrals) {
                const referredUser = referral.referred;
                if (processedIds.has(referredUser.id))
                    continue;
                processedIds.add(referredUser.id);
                const nextLevelReferrals = await db_1.models.mlmReferral.findAll({
                    where: { referrerId: referredUser.id },
                    include: [
                        {
                            model: db_1.models.user,
                            as: "referred",
                            attributes: [
                                "id",
                                "firstName",
                                "lastName",
                                "avatar",
                                "createdAt",
                                "status",
                            ],
                            include: [
                                {
                                    model: db_1.models.mlmReferralReward,
                                    as: "referralRewards",
                                    attributes: ["id"],
                                },
                            ],
                        },
                    ],
                });
                const downline = {
                    id: referredUser.id,
                    firstName: referredUser.firstName,
                    lastName: referredUser.lastName,
                    avatar: referredUser.avatar,
                    createdAt: referredUser.createdAt,
                    status: referredUser.status,
                    level,
                    rewardsCount: ((_b = referredUser.referralRewards) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    referredCount: nextLevelReferrals.length,
                    downlines: await buildDownlines(nextLevelReferrals, level + 1),
                };
                downlines.push(downline);
            }
            return downlines;
        }
        (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Building downline hierarchy");
        rootUser.downlines = await buildDownlines(directReferrals, 2);
        (_e = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _e === void 0 ? void 0 : _e.call(ctx, "Unilevel referrals fetched successfully");
        return rootUser;
    }
    catch (error) {
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _f === void 0 ? void 0 : _f.call(ctx, error.message);
        throw error;
    }
}
async function listBinaryReferrals(user, mlmSettings, ctx) {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, "Fetching binary referrals");
        const referrerId = user.id;
        if (!((_b = mlmSettings === null || mlmSettings === void 0 ? void 0 : mlmSettings.binary) === null || _b === void 0 ? void 0 : _b.levels)) {
            (_c = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _c === void 0 ? void 0 : _c.call(ctx, "Binary settings not configured, returning empty structure");
            return {
                id: user.id,
                firstName: user.firstName,
                lastName: user.lastName,
                avatar: user.avatar,
                createdAt: user.createdAt,
                status: user.status,
                level: 1,
                rewardsCount: 0,
                referredCount: 0,
                downlines: [],
            };
        }
        let selfReferralData = await db_1.models.mlmReferral.findOne({
            where: { referrerId, referredId: referrerId },
            attributes: ["id"],
            raw: true,
        });
        if (!selfReferralData) {
            const existingReferral = await db_1.models.mlmReferral.findOne({
                where: { referredId: referrerId },
                attributes: ["id"],
                raw: true,
            });
            if (existingReferral) {
                selfReferralData = existingReferral;
            }
            else {
                (_d = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _d === void 0 ? void 0 : _d.call(ctx, "Creating self-referral for legacy user");
                const newSelfReferral = await db_1.models.mlmReferral.create({
                    referrerId,
                    referredId: referrerId,
                    status: "ACTIVE",
                });
                selfReferralData = { id: newSelfReferral.id };
            }
        }
        const selfReferralId = selfReferralData.id;
        let rootNodeData = await db_1.models.mlmBinaryNode.findOne({
            where: { referralId: selfReferralId },
            attributes: ["id"],
            raw: true,
        });
        if (!rootNodeData) {
            (_e = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _e === void 0 ? void 0 : _e.call(ctx, "Creating binary root node for legacy user");
            const newRootNode = await db_1.models.mlmBinaryNode.create({
                referralId: selfReferralId,
            });
            rootNodeData = { id: newRootNode.id };
        }
        const rootNodeId = rootNodeData.id;
        const processedIds = new Set([user.id]);
        async function fetchBinaryDownlines(nodeIds, level = 2) {
            var _a, _b, _c;
            if (level > mlmSettings.binary.levels || level > 10)
                return [];
            (_a = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _a === void 0 ? void 0 : _a.call(ctx, `Fetching binary downlines for level ${level}`);
            const nodes = (await db_1.models.mlmBinaryNode.findAll({
                where: { parentId: { [sequelize_1.Op.in]: nodeIds } },
                include: [
                    {
                        model: db_1.models.mlmReferral,
                        as: "referral",
                        include: [
                            {
                                model: db_1.models.user,
                                as: "referred",
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "avatar",
                                    "createdAt",
                                    "status",
                                ],
                                include: [
                                    {
                                        model: db_1.models.mlmReferralReward,
                                        as: "referralRewards",
                                        attributes: ["id"],
                                    },
                                    {
                                        model: db_1.models.mlmReferral,
                                        as: "referrerReferrals",
                                        attributes: ["id"],
                                    },
                                ],
                            },
                        ],
                    },
                    { model: db_1.models.mlmBinaryNode, as: "leftChild", attributes: ["id"] },
                    { model: db_1.models.mlmBinaryNode, as: "rightChild", attributes: ["id"] },
                ],
                raw: true,
                nest: true,
            }));
            const downlines = [];
            for (const node of nodes) {
                const referredUser = node.referral.referred;
                if (processedIds.has(referredUser.id))
                    continue;
                processedIds.add(referredUser.id);
                const childDownlines = await fetchBinaryDownlines([node.id], level + 1);
                downlines.push({
                    id: referredUser.id,
                    firstName: referredUser.firstName,
                    lastName: referredUser.lastName,
                    avatar: referredUser.avatar,
                    createdAt: referredUser.createdAt,
                    status: referredUser.status,
                    level,
                    rewardsCount: ((_b = referredUser.referralRewards) === null || _b === void 0 ? void 0 : _b.length) || 0,
                    referredCount: ((_c = referredUser.referrerReferrals) === null || _c === void 0 ? void 0 : _c.length) || 0,
                    downlines: childDownlines,
                });
            }
            return downlines;
        }
        (_f = ctx === null || ctx === void 0 ? void 0 : ctx.step) === null || _f === void 0 ? void 0 : _f.call(ctx, "Building binary tree structure");
        const topLevelDownlines = await fetchBinaryDownlines([rootNodeId], 2);
        const rootUserRewardsCount = await db_1.models.mlmReferralReward.count({
            where: { referrerId },
        });
        const result = {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            avatar: user.avatar,
            createdAt: user.createdAt,
            status: user.status,
            level: 1,
            rewardsCount: rootUserRewardsCount,
            referredCount: topLevelDownlines.reduce((acc, line) => acc + line.referredCount, 0),
            downlines: topLevelDownlines,
        };
        (_g = ctx === null || ctx === void 0 ? void 0 : ctx.success) === null || _g === void 0 ? void 0 : _g.call(ctx, "Binary referrals fetched successfully");
        return result;
    }
    catch (error) {
        (_h = ctx === null || ctx === void 0 ? void 0 : ctx.fail) === null || _h === void 0 ? void 0 : _h.call(ctx, error.message);
        throw error;
    }
}
