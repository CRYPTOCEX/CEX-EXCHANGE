"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const sequelize_1 = require("sequelize");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Update ICO Offering (Admin)",
    description: "Updates an existing ICO offering's editable fields. Admins can update basic info, token details, and dates.",
    operationId: "updateIcoOfferingAdmin",
    tags: ["ICO", "Admin", "Offerings"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Update ICO Offering",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "The ID of the ICO offering." },
        },
    ],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Offering name" },
                        symbol: { type: "string", description: "Token symbol" },
                        icon: { type: "string", description: "Token icon URL" },
                        website: { type: "string", description: "Project website URL" },
                        targetAmount: { type: "number", description: "Target funding amount" },
                        tokenPrice: { type: "number", description: "Token price" },
                        startDate: { type: "string", format: "date-time", description: "Start date" },
                        endDate: { type: "string", format: "date-time", description: "End date" },
                        description: { type: "string", description: "Token description" },
                        blockchain: { type: "string", description: "Blockchain network" },
                        totalSupply: { type: "number", description: "Total token supply" },
                        featured: { type: "boolean", description: "Featured status" },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "ICO offering updated successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            offering: { type: "object" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request data" },
        401: { description: "Unauthorized – Admin privileges required." },
        404: { description: "ICO offering not found." },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.ico.offer",
};
exports.default = async (data) => {
    const { user, params, body, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const { id } = params;
    const { name, symbol, icon, website, targetAmount, tokenPrice, startDate, endDate, description, blockchain, totalSupply, featured, } = body;
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch ICO offering");
        const offering = await db_1.models.icoTokenOffering.findByPk(id, {
            include: [{ model: db_1.models.icoTokenDetail, as: "tokenDetail" }],
            transaction,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found." });
        }
        const offeringUpdates = {};
        if (name !== undefined && name.trim()) {
            offeringUpdates.name = name.trim();
        }
        if (symbol !== undefined && symbol.trim()) {
            const existingSymbol = await db_1.models.icoTokenOffering.findOne({
                where: { symbol: symbol.toUpperCase() },
                transaction,
            });
            if (existingSymbol && existingSymbol.id !== id) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Token symbol "${symbol.toUpperCase()}" is already in use.`,
                });
            }
            offeringUpdates.symbol = symbol.toUpperCase();
        }
        if (icon !== undefined) {
            offeringUpdates.icon = icon;
        }
        if (website !== undefined) {
            offeringUpdates.website = website;
        }
        if (targetAmount !== undefined && targetAmount > 0) {
            offeringUpdates.targetAmount = targetAmount;
        }
        if (tokenPrice !== undefined && tokenPrice > 0) {
            if (offering.status === "ACTIVE") {
                const hasInvestors = await db_1.models.icoTransaction.count({
                    where: { offeringId: id, status: { [sequelize_1.Op.in]: ["PENDING", "VERIFICATION", "RELEASED"] } },
                    transaction,
                });
                if (hasInvestors > 0) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: "Cannot change token price on an active offering with existing investments.",
                    });
                }
            }
            offeringUpdates.tokenPrice = tokenPrice;
        }
        if (startDate !== undefined) {
            const parsedStart = new Date(startDate);
            if (offering.status === "PENDING" && parsedStart < new Date()) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "Start date cannot be in the past for pending offerings.",
                });
            }
            offeringUpdates.startDate = parsedStart;
        }
        if (endDate !== undefined) {
            const parsedEnd = new Date(endDate);
            const effectiveStart = offeringUpdates.startDate || offering.startDate;
            if (parsedEnd <= effectiveStart) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: "End date must be after start date.",
                });
            }
            offeringUpdates.endDate = parsedEnd;
        }
        if (featured !== undefined) {
            offeringUpdates.featured = featured;
        }
        if (Object.keys(offeringUpdates).length > 0) {
            ctx === null || ctx === void 0 ? void 0 : ctx.step("Update offering fields");
            await offering.update(offeringUpdates, { transaction });
        }
        if (offering.tokenDetail && (description !== undefined || blockchain !== undefined || totalSupply !== undefined)) {
            const detailUpdates = {};
            if (description !== undefined) {
                detailUpdates.description = description;
            }
            if (blockchain !== undefined) {
                detailUpdates.blockchain = blockchain;
            }
            if (totalSupply !== undefined && totalSupply > 0) {
                const soldTokens = await db_1.models.icoTransaction.sum('amount', {
                    where: {
                        offeringId: id,
                        status: { [sequelize_1.Op.in]: ["PENDING", "VERIFICATION", "RELEASED"] },
                    },
                    transaction,
                }) || 0;
                if (totalSupply < soldTokens) {
                    throw (0, error_1.createError)({
                        statusCode: 400,
                        message: `Cannot reduce total supply below already-sold tokens (${soldTokens}).`,
                    });
                }
                detailUpdates.totalSupply = totalSupply;
            }
            if (Object.keys(detailUpdates).length > 0) {
                ctx === null || ctx === void 0 ? void 0 : ctx.step("Update token detail fields");
                await offering.tokenDetail.update(detailUpdates, { transaction });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Log admin activity");
        await db_1.models.icoAdminActivity.create({
            type: "UPDATED",
            offeringId: id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                updatedFields: Object.keys(offeringUpdates),
            }),
        }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch updated offering");
        const updatedOffering = await db_1.models.icoTokenOffering.findByPk(id, {
            include: [
                {
                    model: db_1.models.icoTokenDetail,
                    as: "tokenDetail",
                    include: [{ model: db_1.models.icoTokenType, as: "tokenTypeData" }],
                },
                { model: db_1.models.icoLaunchPlan, as: "plan" },
                { model: db_1.models.icoTokenOfferingPhase, as: "phases" },
                { model: db_1.models.icoRoadmapItem, as: "roadmapItems" },
            ],
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("ICO offering updated successfully");
        return {
            message: "ICO offering updated successfully",
            offering: updatedOffering,
        };
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
};
