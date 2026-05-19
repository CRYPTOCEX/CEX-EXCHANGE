"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const utils_1 = require("../utils");
const validation_1 = require("@b/utils/validation");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Deletes an image file by id",
    operationId: "deleteImageFile",
    tags: ["Admin", "Content", "Media"],
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            required: true,
            description: "The relative id of the image file to delete",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Image file deleted successfully",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            message: { type: "string" },
                        },
                    },
                },
            },
        },
        400: { description: "Bad request if the id is not specified" },
        404: { description: "Not found if the image file does not exist" },
        500: { description: "Internal server error" },
    },
    requiresAuth: true,
    permission: "delete.content.media",
    logModule: "ADMIN_CMS",
    logTitle: "Delete media file",
};
exports.default = async (data) => {
    const { params, ctx } = data;
    const imagePath = params.id;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating image ID");
    if (!imagePath) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("Image ID is required");
        throw (0, error_1.createError)({ statusCode: 400, message: "Image id is required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Sanitizing file path");
    const sanitizedPath = (0, validation_1.sanitizePath)(imagePath.replace(/_/g, path_1.sep));
    const fullPath = (0, path_1.join)(utils_1.publicDirectory, sanitizedPath);
    try {
        ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting image file");
        await fs_1.promises.unlink(fullPath);
        (0, utils_1.filterMediaCache)(sanitizedPath);
        ctx === null || ctx === void 0 ? void 0 : ctx.success("Image file deleted successfully");
        return { message: "Image file deleted successfully" };
    }
    catch (error) {
        if (error.code === "ENOENT") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Image file not found");
            throw (0, error_1.createError)({ statusCode: 404, message: "Image file not found" });
        }
        else if (error.code === "EBUSY") {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("File is busy or locked");
            throw (0, error_1.createError)({ statusCode: 409, message: "File is busy or locked" });
        }
        else {
            ctx === null || ctx === void 0 ? void 0 : ctx.fail("Failed to delete image file");
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to delete image file" });
        }
    }
};
