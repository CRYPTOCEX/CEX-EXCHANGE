"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Delete ICO Phase (Admin)",
    description: "Deletes a phase from an existing ICO offering. This recalculates the offering end date.",
    operationId: "deleteIcoPhaseAdmin",
    tags: ["ICO", "Admin", "Offerings"],
    requiresAuth: true,
    logModule: "ADMIN_ICO",
    logTitle: "Delete ICO Phase",
    parameters: [
        {
            name: "id",
            in: "path",
            required: true,
            schema: { type: "string", description: "The ID of the ICO offering." },
        },
        {
            name: "phaseId",
            in: "path",
            required: true,
            schema: { type: "string", description: "The ID of the phase to delete." },
        },
    ],
    responses: {
        200: {
            description: "Phase deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                            newEndDate: { type: "string", format: "date-time" },
                        },
                    },
                },
            },
        },
        400: { description: "Invalid request or cannot delete phase" },
        401: { description: "Unauthorized – Admin privileges required." },
        404: { description: "ICO offering or phase not found." },
        500: { description: "Internal Server Error" },
    },
    permission: "edit.ico.offer",
};
exports.default = async (data) => {
    const { user, params, ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validate user authentication");
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({
            statusCode: 401,
            message: "Unauthorized: Admin privileges required.",
        });
    }
    const { id, phaseId } = params;
    if (!id || !phaseId) {
        throw (0, error_1.createError)({
            statusCode: 400,
            message: "Offering ID and Phase ID are required.",
        });
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
        if (!["ACTIVE", "PENDING", "UPCOMING", "SUCCESS"].includes(offering.status)) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete phase from offering with status: ${offering.status}`,
            });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Find phase to delete");
        const phase = await db_1.models.icoTokenOfferingPhase.findOne({
            where: { id: phaseId, offeringId: id },
            transaction,
        });
        if (!phase) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Phase not found." });
        }
        const soldTokens = phase.allocation - phase.remaining;
        if (soldTokens > 0) {
            throw (0, error_1.createError)({
                statusCode: 400,
                message: `Cannot delete phase with ${soldTokens} tokens already sold.`,
            });
        }
        const phaseName = phase.name;
        const phaseDuration = phase.duration;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Delete phase");
        await phase.destroy({ transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Recalculate end date");
        const remainingPhases = await db_1.models.icoTokenOfferingPhase.findAll({
            where: { offeringId: id },
            transaction,
        });
        let newEndDate;
        if (remainingPhases.length === 0) {
            newEndDate = new Date(offering.startDate);
        }
        else {
            const totalDuration = remainingPhases.reduce((total, p) => total + (p.duration || 0), 0);
            newEndDate = new Date(offering.startDate);
            newEndDate.setDate(newEndDate.getDate() + totalDuration);
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Update offering end date");
        await offering.update({ endDate: newEndDate }, { transaction });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Log admin activity");
        await db_1.models.icoAdminActivity.create({
            type: "PHASE_DELETED",
            offeringId: id,
            offeringName: offering.name,
            adminId: user.id,
            details: JSON.stringify({
                phaseName,
                phaseDuration,
                newEndDate: newEndDate.toISOString(),
                remainingPhases: remainingPhases.length,
            }),
        }, { transaction });
        await transaction.commit();
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Phase deleted successfully");
        return {
            message: "Phase deleted successfully",
            newEndDate: newEndDate.toISOString(),
            remainingPhases: remainingPhases.length,
        };
    }
    catch (error) {
        await transaction.rollback();
        throw error;
    }
};
