"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const utils_1 = require("@b/api/(ext)/affiliate/utils");
const sequelize_1 = require("sequelize");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Gets detailed affiliate referral information",
    description: "Retrieves comprehensive information about a specific affiliate referral, including referrer profile, network structure, rewards history, and earnings. The network structure varies based on MLM system (DIRECT/BINARY/UNILEVEL).",
    operationId: "getAffiliateReferralDetail",
    tags: ["Admin", "Affiliate", "Referral"],
    requiresAuth: true,
    permission: "view.affiliate.referral",
    demoMask: ["affiliate.email", "affiliate.phone", "network.email"],
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", format: "uuid" },
            description: "The affiliate referral ID",
        },
    ],
    responses: {
        200: {
            description: "Affiliate referral details retrieved successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            affiliate: { type: "object", description: "Referrer user information and metrics" },
                            network: { type: "array", description: "Network of referred users" },
                            rewards: { type: "array", description: "Reward history" },
                            monthlyEarnings: { type: "array", description: "Last 6 months earnings" },
                        },
                    },
                },
            },
        },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Affiliate Referral"),
        500: errors_1.serverErrorResponse,
    },
    logModule: "ADMIN_AFFILIATE",
    logTitle: "Get affiliate referral details",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j;
    const { user, params, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const referralId = params.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Loading referral record with ID: ${referralId}`);
    const referralRecord = await db_1.models.mlmReferral.findOne({
        where: { id: referralId },
        include: [
            {
                model: db_1.models.user,
                as: "referrer",
                attributes: ["id", "firstName", "lastName", "email", "phone", "status"],
            },
        ],
        raw: false,
    });
    if (!(referralRecord === null || referralRecord === void 0 ? void 0 : referralRecord.referrer)) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "Referral record not found.",
        });
    }
    const referrer = referralRecord.referrer;
    const affiliateUserId = referrer.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Building affiliate profile");
    const affiliate = {
        id: affiliateUserId,
        name: `${referrer.firstName || ""} ${referrer.lastName || ""}`.trim(),
        email: referrer.email || "",
        phone: referrer.phone || null,
        location: null,
        status: (_a = referrer.status) === null || _a === void 0 ? void 0 : _a.toLowerCase(),
        joinDate: (_c = (_b = referralRecord.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString()) !== null && _c !== void 0 ? _c : new Date().toISOString(),
        referralCode: referralRecord.id,
    };
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating summary metrics");
    const referralsCount = await db_1.models.mlmReferral.count({
        where: { referrerId: affiliateUserId },
    });
    const earningsRow = await db_1.models.mlmReferralReward.findOne({
        attributes: [[(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "totalEarnings"]],
        where: { referrerId: affiliateUserId },
        raw: true,
    });
    const totalEarnings = parseFloat(earningsRow === null || earningsRow === void 0 ? void 0 : earningsRow.totalEarnings) || 0;
    const rewardsCount = await db_1.models.mlmReferralReward.count({
        where: { referrerId: affiliateUserId },
    });
    const conversionRate = referralsCount
        ? Math.round((rewardsCount / referralsCount) * 100)
        : 0;
    Object.assign(affiliate, {
        referrals: referralsCount,
        earnings: totalEarnings,
        conversionRate,
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Determining MLM system");
    const { mlmSystem } = await (0, utils_1.getMlmSystemAndSettings)();
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Building network structure for ${mlmSystem} system`);
    let network = [];
    if (mlmSystem === "UNILEVEL") {
        const rootNode = await db_1.models.mlmUnilevelNode.findOne({
            where: { referralId },
        });
        if (rootNode) {
            const all = await db_1.models.mlmUnilevelNode.findAll({ raw: true });
            const children = {};
            all.forEach((n) => {
                if (n.parentId) {
                    children[n.parentId] = children[n.parentId] || [];
                    children[n.parentId].push(n);
                }
            });
            const queue = [{ node: rootNode, level: 1 }];
            while (queue.length) {
                const { node, level } = queue.shift();
                for (const child of children[node.id] || []) {
                    queue.push({ node: child, level: level + 1 });
                    const childReferral = await db_1.models.mlmReferral.findOne({
                        where: { id: child.referralId },
                        include: [
                            {
                                model: db_1.models.user,
                                as: "referred",
                                attributes: [
                                    "id",
                                    "firstName",
                                    "lastName",
                                    "email",
                                    "status",
                                    "createdAt",
                                ],
                            },
                        ],
                        raw: false,
                    });
                    if (childReferral === null || childReferral === void 0 ? void 0 : childReferral.referred) {
                        network.push({
                            nodeId: child.id,
                            referralId: child.referralId,
                            id: childReferral.referred.id,
                            name: `${childReferral.referred.firstName} ${childReferral.referred.lastName}`.trim(),
                            email: childReferral.referred.email,
                            level,
                            status: (_d = childReferral.referred.status) === null || _d === void 0 ? void 0 : _d.toLowerCase(),
                            earnings: 0,
                            referrals: 0,
                            joinDate: (_f = (_e = childReferral.referred.createdAt) === null || _e === void 0 ? void 0 : _e.toISOString()) !== null && _f !== void 0 ? _f : new Date().toISOString(),
                        });
                    }
                }
            }
        }
    }
    else if (mlmSystem === "BINARY") {
        const root = await db_1.models.mlmBinaryNode.findOne({ where: { referralId } });
        if (root) {
            const queue = [{ node: root, level: 1 }];
            while (queue.length) {
                const { node, level } = queue.shift();
                for (const side of ["leftChildId", "rightChildId"]) {
                    const childId = node[side];
                    if (childId) {
                        const childNode = await db_1.models.mlmBinaryNode.findByPk(childId, { raw: true });
                        if (childNode) {
                            queue.push({ node: childNode, level: level + 1 });
                            const childReferral = await db_1.models.mlmReferral.findOne({
                                where: { id: childNode.referralId },
                                include: [
                                    {
                                        model: db_1.models.user,
                                        as: "referred",
                                        attributes: [
                                            "id",
                                            "firstName",
                                            "lastName",
                                            "email",
                                            "status",
                                            "createdAt",
                                        ],
                                    },
                                ],
                                raw: false,
                            });
                            if (childReferral === null || childReferral === void 0 ? void 0 : childReferral.referred) {
                                network.push({
                                    nodeId: childNode.id,
                                    referralId: childNode.referralId,
                                    id: childReferral.referred.id,
                                    name: `${childReferral.referred.firstName} ${childReferral.referred.lastName}`.trim(),
                                    email: childReferral.referred.email,
                                    level,
                                    status: (_g = childReferral.referred.status) === null || _g === void 0 ? void 0 : _g.toLowerCase(),
                                    earnings: 0,
                                    referrals: 0,
                                    joinDate: (_j = (_h = childReferral.referred.createdAt) === null || _h === void 0 ? void 0 : _h.toISOString()) !== null && _j !== void 0 ? _j : new Date().toISOString(),
                                });
                            }
                        }
                    }
                }
            }
        }
    }
    else {
        const direct = await db_1.models.mlmReferral.findAll({
            where: { referrerId: affiliateUserId },
            include: [
                {
                    model: db_1.models.user,
                    as: "referred",
                    attributes: [
                        "id",
                        "firstName",
                        "lastName",
                        "email",
                        "status",
                        "createdAt",
                    ],
                },
            ],
            raw: false,
        });
        network = direct
            .filter((d) => d.referred)
            .map((d) => {
            var _a, _b, _c;
            return ({
                nodeId: null,
                referralId: d.id,
                id: d.referred.id,
                name: `${d.referred.firstName} ${d.referred.lastName}`.trim(),
                email: d.referred.email,
                level: 1,
                status: (_a = d.referred.status) === null || _a === void 0 ? void 0 : _a.toLowerCase(),
                earnings: 0,
                referrals: 0,
                joinDate: (_c = (_b = d.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString()) !== null && _c !== void 0 ? _c : new Date().toISOString(),
            });
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Enriching network with metrics");
    if (network.length) {
        const [refAll, earnAll] = (await Promise.all([
            db_1.models.mlmReferral.findAll({
                attributes: ["referrerId", [(0, sequelize_1.fn)("COUNT", (0, sequelize_1.literal)("*")), "cnt"]],
                group: ["referrerId"],
                raw: true,
            }),
            db_1.models.mlmReferralReward.findAll({
                attributes: ["referrerId", [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "sum"]],
                group: ["referrerId"],
                raw: true,
            }),
        ]));
        const refMap = Object.fromEntries(refAll.map((r) => [r.referrerId, parseInt(r.cnt, 10)]));
        const earnMap = Object.fromEntries(earnAll.map((r) => [r.referrerId, parseFloat(r.sum)]));
        network = network.map((n) => ({
            ...n,
            referrals: refMap[n.id] || 0,
            earnings: earnMap[n.id] || 0,
        }));
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching reward history");
    const rewardsRaw = await db_1.models.mlmReferralReward.findAll({
        where: { referrerId: affiliateUserId },
        include: [
            {
                model: db_1.models.mlmReferralCondition,
                as: "condition",
                attributes: ["name"],
            },
        ],
        order: [["createdAt", "DESC"]],
        raw: false,
    });
    const rewards = rewardsRaw.map((r) => {
        var _a, _b, _c;
        return ({
            id: r.id,
            date: (_b = (_a = r.createdAt) === null || _a === void 0 ? void 0 : _a.toISOString()) !== null && _b !== void 0 ? _b : new Date().toISOString(),
            type: ((_c = r.condition) === null || _c === void 0 ? void 0 : _c.name) || "",
            description: r.description || "",
            status: r.isClaimed ? "paid" : "pending",
            amount: r.reward,
        });
    });
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculating monthly earnings");
    const months = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i, 1);
        months.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    }
    const earnByMonthRaw = await db_1.models.mlmReferralReward.findAll({
        attributes: [
            [(0, sequelize_1.fn)("DATE_FORMAT", (0, sequelize_1.col)("createdAt"), "%Y-%m"), "month"],
            [(0, sequelize_1.fn)("SUM", (0, sequelize_1.col)("reward")), "amount"],
        ],
        where: {
            referrerId: affiliateUserId,
            createdAt: {
                [sequelize_1.Op.gte]: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
            },
        },
        group: ["month"],
        raw: true,
    });
    const earnMonthMap = {};
    earnByMonthRaw.forEach((r) => {
        earnMonthMap[r.month] = parseFloat(r.amount);
    });
    const monthlyEarnings = months.map((m) => ({
        month: m,
        earnings: earnMonthMap[m] || 0,
    }));
    ctx === null || ctx === void 0 ? void 0 : ctx.success("Affiliate details retrieved successfully");
    return { affiliate, network, rewards, monthlyEarnings };
};
