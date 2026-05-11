"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = exports.offeringCreationSchema = void 0;
const utils_1 = require("@b/api/finance/wallet/utils");
const notifications_1 = require("@b/utils/notifications");
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const Middleware_1 = require("@b/handler/Middleware");
exports.offeringCreationSchema = {
    type: "object",
    properties: {
        name: { type: "string", minLength: 2 },
        icon: { type: "string", description: "Token icon URL" },
        symbol: { type: "string", minLength: 2, maxLength: 8 },
        tokenType: { type: "string" },
        blockchain: { type: "string" },
        totalSupply: { type: "number" },
        description: { type: "string", minLength: 50, maxLength: 1000 },
        tokenDetails: {
            type: "object",
            properties: {
                whitepaper: { type: "string", format: "uri" },
                github: {
                    type: "string",
                    description: "GitHub repository URL",
                    format: "uri",
                },
                twitter: {
                    type: "string",
                    description: "Twitter handle or URL",
                    format: "uri",
                },
                telegram: {
                    type: "string",
                    description: "Telegram handle or URL",
                    format: "uri",
                },
                useOfFunds: { type: "array", items: { type: "string" } },
            },
            required: ["whitepaper", "github", "useOfFunds", "twitter", "telegram"],
        },
        teamMembers: {
            type: "array",
            description: "Team members information",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string", description: "Member name" },
                    role: { type: "string", description: "Member role" },
                    bio: { type: "string", description: "Member bio", maxLength: 500 },
                    linkedin: {
                        type: "string",
                        description: "LinkedIn URL",
                        format: "uri",
                    },
                    twitter: {
                        type: "string",
                        description: "Twitter URL",
                        format: "uri",
                    },
                    github: { type: "string", description: "GitHub URL", format: "uri" },
                    website: {
                        type: "string",
                        description: "Website URL",
                        format: "uri",
                    },
                },
                required: ["name", "role", "bio"],
            },
        },
        roadmap: {
            type: "array",
            description: "Roadmap items",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string", maxLength: 1000 },
                    date: { type: "string", format: "date-time" },
                    completed: { type: "boolean" },
                },
                required: ["title", "description", "date"],
            },
        },
        website: {
            type: "string",
            description: "Project website URL",
            format: "uri",
        },
        targetAmount: { type: "number" },
        startDate: {
            type: "string",
            description: "Start date of the offering",
            format: "date-time",
        },
        phases: {
            type: "array",
            description: "Offering phases",
            items: {
                type: "object",
                properties: {
                    id: { type: "string" },
                    name: { type: "string" },
                    tokenPrice: { type: "number" },
                    allocation: { type: "number" },
                    durationDays: { type: "number" },
                },
                required: ["name", "tokenPrice", "allocation", "durationDays"],
            },
        },
        vestingEnabled: {
            type: "boolean",
            description: "Enable token vesting"
        },
        vestingSchedule: {
            type: "object",
            description: "Vesting schedule configuration",
            properties: {
                type: {
                    type: "string",
                    enum: ["LINEAR", "CLIFF", "MILESTONE"]
                },
                durationMonths: { type: "number" },
                cliffMonths: { type: "number" },
                milestones: {
                    type: "array",
                    items: {
                        type: "object",
                        properties: {
                            monthsAfterPurchase: { type: "number" },
                            percentage: { type: "number" },
                        },
                    },
                },
            },
        },
        termsAccepted: { type: "boolean" },
        selectedPlan: {
            type: "string",
            description: "ID of the selected launch plan",
            pattern: "^[0-9a-fA-F-]{36}$",
        },
        paymentComplete: { type: "boolean" },
    },
    required: [
        "name",
        "symbol",
        "icon",
        "tokenType",
        "blockchain",
        "totalSupply",
        "description",
        "tokenDetails",
        "website",
        "targetAmount",
        "startDate",
        "phases",
        "termsAccepted",
        "selectedPlan",
        "paymentComplete",
    ],
};
exports.metadata = {
    summary: "Create ICO Offering",
    description: "Creates a new ICO offering along with token details, team members, and roadmap items. Also verifies user wallet balance and deducts the launch fee based on the selected launch plan.",
    operationId: "createIcoOffering",
    tags: ["ICO", "Offerings"],
    requiresAuth: true,
    logModule: "ICO_CREATE",
    logTitle: "Create ICO offering",
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: exports.offeringCreationSchema,
            },
        },
    },
    responses: {
        200: {
            description: "ICO offering created successfully.",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            offering: {
                                type: "object",
                                description: "The created offering record",
                            },
                        },
                    },
                },
            },
        },
        401: { description: "Unauthorized – Admin privileges required." },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
};
exports.default = async (data) => {
    await Middleware_1.rateLimiters.orderCreation(data);
    const { user, body, ctx } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: You must be logged in to create an offering.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating offering creation request");
    const { name, symbol, icon, tokenType, blockchain, totalSupply, description, tokenDetails, teamMembers, roadmap, website, targetAmount, startDate, phases, vestingEnabled, vestingSchedule, termsAccepted, selectedPlan, paymentComplete, } = body;
    if (!termsAccepted) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Terms and conditions must be accepted to create an offering.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Retrieving and validating launch plan");
    const launchPlan = await db_1.models.icoLaunchPlan.findOne({
        where: { id: selectedPlan },
    });
    if (!launchPlan) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid launch plan selected.",
        });
    }
    let planFeatures;
    try {
        const featuresData = typeof launchPlan.features === 'string' ? JSON.parse(launchPlan.features) : launchPlan.features;
        planFeatures = featuresData;
    }
    catch (err) {
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Failed to parse launch plan features.",
        });
    }
    if (teamMembers && teamMembers.length > planFeatures.maxTeamMembers) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum allowed team members is ${planFeatures.maxTeamMembers}.`,
        });
    }
    if (roadmap && roadmap.length > planFeatures.maxRoadmapItems) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum allowed roadmap items is ${planFeatures.maxRoadmapItems}.`,
        });
    }
    if (phases && phases.length > planFeatures.maxOfferingPhases) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Maximum allowed offering phases is ${planFeatures.maxOfferingPhases}.`,
        });
    }
    if (!tokenType) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Token type is required.",
        });
    }
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(tokenType);
    if (!isUUID) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid token type ID format. Please provide a valid UUID.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token type");
    const tokenTypeRecord = await db_1.models.icoTokenType.findOne({
        where: { id: tokenType },
    });
    if (!tokenTypeRecord) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Token type with ID ${tokenType} not found.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Verifying wallet balance for launch fee");
    const wallet = await (0, utils_1.getWallet)(user.id, launchPlan.walletType, launchPlan.currency, false, ctx);
    if (!wallet || wallet.balance < launchPlan.price) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Insufficient balance for the launch.",
        });
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating ICO offering record");
        const startDateObj = new Date(startDate);
        let totalDurationDays = 0;
        for (const phase of phases) {
            totalDurationDays += phase.durationDays;
        }
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + totalDurationDays);
        const tokenPrice = phases.length > 0 ? phases[0].tokenPrice : 0;
        const offering = await db_1.models.icoTokenOffering.create({
            userId: user.id,
            planId: launchPlan.id,
            typeId: tokenTypeRecord.id,
            name,
            icon,
            symbol: symbol.toUpperCase(),
            status: "PENDING",
            purchaseWalletCurrency: launchPlan.currency,
            purchaseWalletType: launchPlan.walletType,
            tokenPrice,
            targetAmount,
            startDate: startDateObj,
            endDate: endDateObj,
            participants: 0,
            isPaused: false,
            isFlagged: false,
            submittedAt: new Date(),
            website,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating token details and vesting configuration");
        await db_1.models.icoTokenDetail.create({
            offeringId: offering.id,
            tokenType,
            totalSupply,
            tokensForSale: totalSupply,
            salePercentage: 0,
            blockchain,
            description,
            useOfFunds: tokenDetails.useOfFunds,
            links: {
                whitepaper: tokenDetails.whitepaper,
                github: tokenDetails.github,
                twitter: tokenDetails.twitter,
                telegram: tokenDetails.telegram,
            },
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating offering phases");
        for (let i = 0; i < phases.length; i++) {
            const phase = phases[i];
            await db_1.models.icoTokenOfferingPhase.create({
                offeringId: offering.id,
                name: phase.name,
                tokenPrice: phase.tokenPrice,
                allocation: phase.allocation,
                duration: phase.durationDays,
                remaining: phase.allocation,
                sequence: i,
            }, { transaction });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Adding team members and roadmap items");
        if (Array.isArray(teamMembers)) {
            for (const member of teamMembers) {
                if (member.name && member.role && member.bio) {
                    await db_1.models.icoTeamMember.create({
                        offeringId: offering.id,
                        name: member.name,
                        role: member.role,
                        bio: member.bio,
                        avatar: member.avatar,
                        linkedin: member.linkedin,
                        twitter: member.twitter,
                        website: member.website,
                        github: member.github,
                    }, { transaction });
                }
            }
        }
        if (Array.isArray(roadmap)) {
            for (const item of roadmap) {
                if (item.title && item.description && item.date) {
                    await db_1.models.icoRoadmapItem.create({
                        offeringId: offering.id,
                        title: item.title,
                        description: item.description,
                        date: item.date,
                        completed: item.completed || false,
                    }, { transaction });
                }
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deducting launch fee from wallet");
        const walletForUpdate = await db_1.models.wallet.findOne({
            where: { id: wallet.id },
            transaction,
            lock: transaction.LOCK.UPDATE,
        });
        if (!walletForUpdate) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Wallet not found during transaction." });
        }
        if (walletForUpdate.balance < launchPlan.price) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "Insufficient wallet balance at transaction time.",
            });
        }
        await walletForUpdate.update({ balance: walletForUpdate.balance - launchPlan.price }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending confirmation notification");
        try {
            await (0, notifications_1.createNotification)({
                userId: user.id,
                relatedId: offering.id,
                title: "Offering Created",
                type: "system",
                message: `Your ICO offering "${offering.name}" has been created successfully.`,
                details: "Your offering is now pending review. You can track its progress and view more details on your dashboard.",
                link: `/ico/creator/token/${offering.id}`,
                actions: [
                    {
                        label: "View Offering",
                        link: `/ico/creator/token/${offering.id}`,
                        primary: true,
                    },
                ],
            }, ctx);
        }
        catch (notifErr) {
            console.error("Failed to create notification for offering creation", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success(`Created ICO offering "${name}" (${symbol})`);
        return {
            message: "Offering created successfully.",
        };
    }
    catch (err) {
        await transaction.rollback();
        const errMsg = err instanceof Error ? err.message : "Failed to create ICO offering";
        ctx === null || ctx === void 0 ? void 0 : ctx.fail(errMsg);
        throw (0, error_1.createError)({
            statusCode: err.statusCode || 500,
            message: err.statusCode ? err.message : "Internal Server Error: " + errMsg,
        });
    }
};
