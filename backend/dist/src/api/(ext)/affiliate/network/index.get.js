"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.default = handler;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const sequelize_1 = require("sequelize");
const utils_1 = require("@b/api/(ext)/affiliate/utils");
exports.metadata = {
    summary: "Get Affiliate Network Node",
    description: "Retrieves the current user's affiliate network data for client visualization.",
    operationId: "getAffiliateNetworkNode",
    tags: ["Affiliate", "Network"],
    requiresAuth: true,
    logModule: "AFFILIATE",
    logTitle: "Get affiliate network tree",
    responses: {
        200: { description: "Network data retrieved successfully." },
        401: { description: "Unauthorized – login required." },
        404: { description: "User not found." },
        500: { description: "Internal Server Error" },
    },
};
async function handler(data) {
    var _a, _b;
    const { user, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Loading MLM system settings from cache");
    const { mlmSystem, mlmSettings } = await (0, utils_1.getMlmSystemAndSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching user profile data");
    const userRecord = await db_1.models.user.findByPk(user.id, {
        attributes: [
            "id",
            "firstName",
            "lastName",
            "avatar",
            "status",
            "createdAt",
        ],
        raw: true,
    });
    if (!userRecord) {
        throw (0, error_1.createError)({ statusCode: 404, message: "User not found" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building user profile");
    const userProfile = {
        id: userRecord.id,
        firstName: userRecord.firstName,
        lastName: userRecord.lastName,
        avatar: userRecord.avatar,
        status: userRecord.status,
        joinDate: (userRecord.createdAt || new Date()).toISOString(),
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating total rewards");
    const rewardsRow = await db_1.models.mlmReferralReward.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "totalRewards"]],
        where: { referrerId: user.id },
        raw: true,
    });
    const totalRewards = parseFloat((_a = rewardsRow === null || rewardsRow === void 0 ? void 0 : rewardsRow.totalRewards) !== null && _a !== void 0 ? _a : "0") || 0;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Looking up upline referrer");
    let upline = null;
    const upr = await db_1.models.mlmReferral.findOne({
        where: { referredId: user.id },
        include: [
            {
                model: db_1.models.user,
                as: "referrer",
                attributes: [
                    "id",
                    "firstName",
                    "lastName",
                    "avatar",
                    "status",
                    "createdAt",
                ],
            },
        ],
        raw: true,
        nest: true,
    });
    if (upr === null || upr === void 0 ? void 0 : upr.referrer) {
        const r = upr.referrer;
        const rRewardsResult = await db_1.models.mlmReferralReward.findOne({
            attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "total"]],
            where: { referrerId: r.id },
            raw: true,
        });
        const rRewards = parseFloat((_b = rRewardsResult === null || rRewardsResult === void 0 ? void 0 : rRewardsResult.total) !== null && _b !== void 0 ? _b : "0") || 0;
        const rTeam = await db_1.models.mlmReferral.count({
            where: { referrerId: r.id },
        });
        upline = {
            id: r.id,
            firstName: r.firstName,
            lastName: r.lastName,
            avatar: r.avatar,
            status: r.status,
            joinDate: (r.createdAt || new Date()).toISOString(),
            earnings: rRewards,
            teamSize: rTeam,
            performance: rTeam > 0 ? Math.round((rRewards / rTeam) * 100) : 0,
        };
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Fetching ${mlmSystem || 'DIRECT'} network tree data`);
    let treeDataRaw;
    switch (mlmSystem) {
        case "BINARY":
            treeDataRaw = await (0, utils_1.listBinaryReferrals)(userRecord, mlmSettings, ctx);
            break;
        case "UNILEVEL":
            treeDataRaw = await (0, utils_1.listUnilevelReferrals)(userRecord, mlmSettings, ctx);
            break;
        default:
            treeDataRaw = await (0, utils_1.listDirectReferrals)(userRecord, ctx);
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Normalizing network tree structure");
    function normalizeNode(n, level = 0, visited = new Set()) {
        var _a, _b, _c, _d, _e;
        if (level > 50 || visited.has(n.id)) {
            return null;
        }
        visited.add(n.id);
        const joinDate = n.joinDate ||
            (n.createdAt ? new Date(n.createdAt).toISOString() : undefined);
        const earnings = (_b = (_a = n.earnings) !== null && _a !== void 0 ? _a : n.rewardsCount) !== null && _b !== void 0 ? _b : 0;
        const teamSize = (_d = (_c = n.teamSize) !== null && _c !== void 0 ? _c : n.referredCount) !== null && _d !== void 0 ? _d : (((_e = n.downlines) === null || _e === void 0 ? void 0 : _e.length) || 0);
        const performance = teamSize ? Math.round((earnings / teamSize) * 100) : 0;
        const downlines = (n.downlines || [])
            .slice(0, 1000)
            .map((c) => normalizeNode(c, level + 1, new Set(visited)))
            .filter(Boolean);
        return {
            id: n.id,
            firstName: n.firstName,
            lastName: n.lastName,
            avatar: n.avatar,
            status: n.status,
            joinDate,
            earnings,
            teamSize,
            performance,
            role: n.role || (level === 0 ? "You" : ""),
            level,
            downlines,
        };
    }
    const treeData = normalizeNode(treeDataRaw, 0);
    let referrals;
    let binaryStructure;
    let levels;
    if (mlmSystem === "DIRECT") {
        referrals = treeData.downlines.map((node) => ({
            id: node.id,
            referred: node,
            referrerId: user.id,
            status: node.status,
            createdAt: node.joinDate,
            earnings: node.earnings,
            teamSize: node.teamSize,
            performance: node.performance,
            downlines: node.downlines,
        }));
    }
    if (mlmSystem === "BINARY") {
        const [left, right] = treeData.downlines;
        binaryStructure = { left: left || null, right: right || null };
    }
    if (mlmSystem === "UNILEVEL") {
        const lvlMap = {};
        function gather(n, depth = 0) {
            if (!lvlMap[depth])
                lvlMap[depth] = [];
            if (depth > 0)
                lvlMap[depth].push(n);
            n.downlines.forEach((c) => gather(c, depth + 1));
        }
        gather(treeData, 0);
        levels = Object.keys(lvlMap)
            .map((k) => Number(k))
            .sort((a, b) => a - b)
            .filter((d) => d > 0)
            .map((d) => lvlMap[d]);
    }
    const enrichedUser = {
        ...userProfile,
        earnings: totalRewards,
        teamSize: treeData.teamSize,
        performance: treeData.performance,
        role: "You",
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Retrieved ${mlmSystem || 'DIRECT'} network tree with ${treeData.teamSize || 0} team members`);
    return {
        user: enrichedUser,
        totalRewards,
        upline,
        referrals,
        binaryStructure,
        levels,
        treeData,
        mlmSystem: mlmSystem || "DIRECT",
    };
}
