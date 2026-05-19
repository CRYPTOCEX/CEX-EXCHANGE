"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const errors_1 = require("@b/utils/schema/errors");
exports.metadata = {
    summary: "Add admin note to P2P offer",
    description: "Adds an internal timestamped admin note to a P2P offer. Notes are stored in the adminNotes field and logged in admin activity for audit purposes.",
    operationId: "addAdminNoteToP2POffer",
    tags: ["Admin", "P2P", "Offer"],
    requiresAuth: true,
    logModule: "ADMIN_P2P",
    logTitle: "Add note to offer",
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "Offer ID",
            required: true,
            schema: { type: "string" },
        },
    ],
    requestBody: {
        description: "Note data",
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        note: { type: "string" },
                    },
                    required: ["note"],
                },
            },
        },
    },
    responses: {
        200: { description: "Admin note added successfully." },
        401: errors_1.unauthorizedResponse,
        404: (0, errors_1.notFoundResponse)("Resource"),
        500: errors_1.serverErrorResponse,
    },
    permission: "edit.p2p.offer",
};
exports.default = async (data) => {
    const { params, body, ctx } = data;
    const { id } = params;
    const { note } = body;
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Fetching offer");
        const offer = await db_1.models.p2pOffer.findByPk(id);
        if (!offer) {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Offer not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Offer not found" });
        }
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Getting admin information");
        const admin = await db_1.models.user.findByPk(data.user.id, {
            attributes: ["firstName", "lastName"],
        });
        const adminName = admin ? `${admin.firstName} ${admin.lastName}`.trim() : "Admin";
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Creating timestamped note");
        const timestamp = new Date().toISOString();
        const noteEntry = `[${timestamp}] ${adminName}: ${note}`;
        const currentNotes = offer.adminNotes || "";
        const updatedNotes = currentNotes
            ? `${currentNotes}\n${noteEntry}`
            : noteEntry;
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Updating offer with note");
        await offer.update({
            adminNotes: updatedNotes,
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Logging admin activity");
        await db_1.models.p2pAdminActivity.create({
            adminId: data.user.id,
            type: "NOTE_ADDED",
            relatedEntityId: offer.id,
            relatedEntityName: "OFFER",
        });
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Admin note added successfully");
        return {
            message: "Admin note added successfully."
        };
    }
    catch (err) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to add admin note");
        throw (0, error_1.createError)({
            statusCode: 500,
            message: "Internal Server Error: " + err.message,
        });
    }
};
