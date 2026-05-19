"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Add ICO Phase (Admin)",
    description: "Adds a new phase to an existing ICO offering. This allows extending the ICO with additional sale phases.",
    operationId: "addIcoPhaseAdmin",
    tags: ["ICO", "Admin", "Offerings"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Add ICO Phase",
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
                    required: ["name", "tokenPrice", "allocation", "duration"],
                    properties: {
                        name: {
                            type: "string",
                            description: "Name of the phase (e.g., 'Phase 4', 'Extension Phase')",
                        },
                        tokenPrice: {
                            type: "number",
                            description: "Token price for this phase",
                        },
                        allocation: {
                            type: "number",
                            description: "Number of tokens allocated for this phase",
                        },
                        duration: {
                            type: "integer",
                            description: "Duration of the phase in days",
                        },
                    },
                },
            },
        },
    },
    responses: {
        200: {
            description: "Phase added successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            phase: { type: "object" },
                            newEndDate: { type: "string", format: "date-time" },
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
    const { name, tokenPrice, allocation, duration } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate request body");
    if (!name || typeof name !== "string" || name.trim().length === 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Phase name is required." });
    }
    if (typeof tokenPrice !== "number" || tokenPrice <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Token price must be a positive number." });
    }
    if (typeof allocation !== "number" || allocation <= 0) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Allocation must be a positive number." });
    }
    if (typeof duration !== "number" || duration <= 0 || !Number.isInteger(duration)) {
        throw (0, error_1.createError)({ statusCode: 400, message: "Duration must be a positive integer (days)." });
    }
    const transaction = await db_1.sequelize.transaction();
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetch ICO offering");
        const offering = await db_1.models.icoTokenOffering.findByPk(id, {
            include: [{ model: db_1.models.icoTokenOfferingPhase, as: "phases" }],
            transaction,
        });
        if (!offering) {
            throw (0, error_1.createError)({ statusCode: 404, message: "ICO offering not found." });
        }
        if (!["ACTIVE", "PENDING", "UPCOMING"].includes(offering.status)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot add phase to offering with status: ${offering.status}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate next sequence number");
        const existingPhases = offering.phases || [];
        const maxSequence = existingPhases.reduce((max, phase) => Math.max(max, phase.sequence || 0), -1);
        const newSequence = maxSequence + 1;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Check for duplicate phase name");
        const duplicateName = existingPhases.some((phase) => phase.name.toLowerCase() === name.trim().toLowerCase());
        if (duplicateName) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: "A phase with this name already exists.",
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Calculate phase dates");
        const now = new Date();
        const currentEndDate = new Date(offering.endDate);
        const phaseStartDate = currentEndDate > now ? currentEndDate : now;
        const phaseEndDate = new Date(phaseStartDate);
        phaseEndDate.setDate(phaseEndDate.getDate() + duration);
        const tokenDetail = await db_1.models.icoTokenDetail.findOne({
            where: { offeringId: id },
            transaction,
        });
        if (tokenDetail) {
            const existingAllocation = existingPhases.reduce((sum, phase) => sum + (phase.allocation || 0), 0);
            if (existingAllocation + allocation > tokenDetail.totalSupply) {
                throw (0, error_1.createError)({
                    statusCode: 400,
                    message: `Total allocation (${existingAllocation + allocation}) exceeds total supply (${tokenDetail.totalSupply}). Available: ${tokenDetail.totalSupply - existingAllocation}`,
                });
            }
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Create new phase");
        const newPhase = await db_1.models.icoTokenOfferingPhase.create({
            offeringId: id,
            name: name.trim(),
            tokenPrice,
            allocation,
            remaining: allocation,
            duration,
            sequence: newSequence,
            startDate: phaseStartDate,
            endDate: phaseEndDate,
        }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update offering end date and status");
        const updateData = { endDate: phaseEndDate };
        if (currentEndDate <= now && offering.status !== "SUCCESS") {
            updateData.status = "ACTIVE";
        }
        await offering.update(updateData, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Log admin activity");
        await db_1.models.icoAdminActivity.create({
            type: "PHASE_ADDED",
            offeringId: id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                phaseName: name.trim(),
                tokenPrice,
                allocation,
                duration,
                phaseStartDate: phaseStartDate.toISOString(),
                newEndDate: phaseEndDate.toISOString(),
                statusChanged: updateData.status ? `Reactivated to ${updateData.status}` : null,
            }),
        }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Phase added successfully");
        return {
            message: "Phase added successfully",
            phase: newPhase,
            phaseStartDate: phaseStartDate.toISOString(),
            newEndDate: phaseEndDate.toISOString(),
            statusReactivated: !!updateData.status,
        };
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
};
