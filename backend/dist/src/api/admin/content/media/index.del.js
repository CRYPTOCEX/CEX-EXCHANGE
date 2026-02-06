"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const utils_1 = require("./utils");
const error_1 = require("@b/utils/error");
exports.metadata = {
    summary: "Bulk deletes image files by ids",
    operationId: "bulkDeleteImageFiles",
    tags: ["Admin", "Content", "Media"],
    requestBody: {
        required: true,
        content: {
            "application/json": {
                schema: {
                    type: "object",
                    properties: {
                        ids: {
                            type: "array",
                            items: { type: "string" },
                            description: "Array of image file ids to delete",
                        },
                    },
                    required: ["ids"],
                },
            },
        },
    },
    responses: {
        200: {
            description: "Image files deleted successfully",
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
        400: { description: "Bad request if ids are not specified" },
        404: { description: "Not found if some image files do not exist" },
        500: { description: "Internal server error" },
    },
    requiresAuth: true,
    permission: "delete.content.media",
    logModule: "ADMIN_CMS",
    logTitle: "Bulk delete media files",
};
exports.default = async (data) => {
    const { body, ctx } = data;
    const { ids } = body;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Validating image IDs");
    if (!ids || ids.length === 0) {
        ctx === null || ctx === void 0 ? void 0 : ctx.fail("No image IDs provided");
        throw (0, error_1.createError)({ statusCode: 400, message: "Image ids are required" });
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.step(`Deleting ${ids.length} image file(s)`);
    for (const imagePath of ids) {
        try {
            const fullPath = (0, path_1.join)(utils_1.publicDirectory, imagePath.replace(/_/g, "/"));
            await fs_1.promises.unlink(fullPath);
            (0, utils_1.filterMediaCache)("/uploads" + imagePath);
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
    }
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Successfully deleted ${ids.length} image file(s)`);
    return { message: "Image files deleted successfully" };
};
