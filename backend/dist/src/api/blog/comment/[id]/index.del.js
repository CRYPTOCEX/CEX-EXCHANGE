"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
exports.deleteComment = deleteComment;
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Deletes a blog comment",
    description: "This endpoint deletes a blog comment.",
    operationId: "deleteComment",
    tags: ["Blog"],
    logModule: "BLOG",
    logTitle: "Delete comment",
    requiresAuth: true,
    parameters: [
        {
            index: 0,
            name: "id",
            in: "path",
            description: "The ID of the comment to delete",
            required: true,
            schema: {
                type: "string",
                description: "Comment ID",
            },
        },
    ],
    responses: (0, query_1.deleteRecordResponses)("Comment"),
};
exports.default = async (data) => {
    const { ctx } = data;
    ctx === null || ctx === void 0 ? void 0 : ctx.step("Deleting comment");
    const result = await deleteComment(data.params.id);
    ctx === null || ctx === void 0 ? void 0 : ctx.success(`Comment ${data.params.id} deleted successfully`);
    return result;
};
async function deleteComment(id) {
    await db_1.models.comment.destroy({
        where: { id },
    });
    return {
        message: "Comment deleted successfully",
    };
}
