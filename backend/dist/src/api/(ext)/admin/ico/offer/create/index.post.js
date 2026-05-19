"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const notifications_1 = require("@b/utils/notifications");
const console_1 = require("@b/utils/console");
const offeringCreationSchema = {
    type: "object",
    properties: {
        userId: { type: "string", format: "uuid" },
        name: { type: "string" },
        symbol: { type: "string" },
        icon: { type: "string" },
        tokenType: { type: "string" },
        blockchain: { type: "string" },
        totalSupply: { type: "number" },
        description: { type: "string" },
        tokenDetails: { type: "object" },
        teamMembers: { type: "array" },
        roadmap: { type: "array" },
        website: { type: "string" },
        targetAmount: { type: "number" },
        startDate: { type: "string" },
        phases: { type: "array" },
        selectedPlan: { type: "string" },
        status: { type: "string" },
        submittedBy: { type: "string" },
        submittedAt: { type: "string" },
    },
    required: ["userId", "name", "symbol", "tokenType", "blockchain", "totalSupply", "selectedPlan"],
};
exports.metadata = {
    summary: "Admin: Create ICO Offering (No Payment)",
    description: "Creates a new ICO offering as admin for any user without charging wallet.",
    operationId: "adminCreateIcoOffering",
    tags: ["ICO", "Admin"],
    requiresAuth: true,
    requestBody: {
        required: true,
        content: { "application/json": { schema: offeringCreationSchema } },
    },
    responses: {
        200: { description: "ICO offering created successfully." },
        401: { description: "Unauthorized – Admin privileges required." },
        400: { description: "Bad Request" },
        500: { description: "Internal Server Error" },
    },
    permission: "create.ico.offer",
    logModule: "ADMIN_ICO",
    logTitle: "Admin Create ICO Offering",
};
exports.default = async (data) => {
    var _a, _b, _c, _d, _e;
    const { user, body, ctx } = data;
    if (!user) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized",
        });
    }
    const { userId, name, symbol, icon, tokenType, blockchain, totalSupply, description, tokenDetails, teamMembers, roadmap, website, targetAmount, startDate, phases, selectedPlan, submittedAt = new Date().toISOString(), } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating launch plan");
    const launchPlan = await db_1.models.icoLaunchPlan.findOne({
        where: { id: selectedPlan },
    });
    if (!launchPlan) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Invalid launch plan selected.",
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating token type");
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
    const tokenTypeRecord = await db_1.models.icoTokenType.findOne({
        where: { id: tokenType },
    });
    if (!tokenTypeRecord) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: `Token type with ID ${tokenType} not found.`,
        });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Parsing and validating plan features");
    let planFeatures;
    try {
        const featuresValue = launchPlan.features;
        const featuresString = typeof featuresValue === 'string'
            ? featuresValue
            : JSON.stringify(featuresValue);
        planFeatures = JSON.parse(featuresString);
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
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating ICO offering with all details");
    const transaction = await db_1.sequelize.transaction();
    try {
        const startDateObj = new Date(startDate);
        let totalDurationDays = 0;
        for (const phase of phases)
            totalDurationDays += phase.durationDays;
        const endDateObj = new Date(startDateObj);
        endDateObj.setDate(endDateObj.getDate() + totalDurationDays);
        const tokenPrice = phases.length > 0 ? phases[0].tokenPrice : 0;
        const offering = await db_1.models.icoTokenOffering.create({
            userId,
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
            submittedAt,
            website,
        }, { transaction });
        await db_1.models.icoTokenDetail.create({
            offeringId: offering.id,
            tokenType: tokenTypeRecord.name,
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
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Sending notification to user");
        try {
            await (0, notifications_1.createNotification)({
                userId,
                relatedId: offering.id,
                title: "Admin Created Offering",
                type: "system",
                message: `An ICO offering "${offering.name}" has been created for you by the admin.`,
                details: "Check your dashboard for more details.",
                link: `/ico/creator/token/${offering.id}`,
            }, ctx);
        }
        catch (notifErr) {
            console_1.logger.error("ADMIN_ICO_OFFER", "Failed to notify user for admin-created offering", notifErr);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO offering created successfully");
        return {
            message: "Offering created successfully.",
            offeringId: offering.id,
        };
    }
    catch (err) {
        await transaction.rollback();
        console_1.logger.error("ADMIN_ICO_OFFER", "ICO creation failed", err);
        if (err.name === "SequelizeUniqueConstraintError") {
            const field = ((_b = (_a = err.errors) === null || _a === void 0 ? void 0 : _a[0]) === null || _b === void 0 ? void 0 : _b.path) || "field";
            const value = ((_d = (_c = err.errors) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.value) || "";
            let userMessage = "";
            if (field === "icoTokenOfferingSymbolKey" || field === "symbol") {
                userMessage = `Token symbol "${value}" is already in use. Please choose a different symbol.`;
            }
            else {
                userMessage = `The ${field} "${value}" is already in use.`;
            }
            throw (0, error_1.createError)({
                statusCode: 400,
                message: userMessage,
            });
        }
        if (err.name === "SequelizeValidationError" || err.name === "SequelizeDatabaseError") {
            const details = ((_e = err.errors) === null || _e === void 0 ? void 0 : _e.map((e) => `${e.path}: ${e.message}`).join(", ")) || err.message;
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Validation Error: ${details}`,
            });
        }
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
