"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const query_1 = require("@b/utils/query");
exports.metadata = {
    summary: "Retrieves public referrer information by referral code",
    description: "Looks up a referrer by their referral code (user id) and returns their PUBLIC display name (username) and avatar. " +
        "This route is unauthenticated and the refCode is guessable from any referral link, so it must never return a legal name: " +
        "username is the only name other users are entitled to see.",
    operationId: "getPublicReferrer",
    tags: ["Public", "Referrer"],
    requiresAuth: false,
    parameters: [
        {
            index: 0,
            name: "refCode",
            in: "path",
            required: true,
            description: "The referral code (referrer's user id)",
            schema: { type: "string" },
        },
    ],
    responses: {
        200: {
            description: "Referrer found",
            content: {
                "application/json": {
                    schema: {
                        type: "object",
                        properties: {
                            username: { type: "string", nullable: true },
                            avatar: { type: "string", nullable: true },
                        },
                    },
                },
            },
        },
        404: (0, query_1.notFoundMetadataResponse)("Referrer"),
        500: query_1.serverErrorResponse,
    },
};
exports.default = async (data) => {
    var _a, _b;
    const { params } = data;
    const refCode = params === null || params === void 0 ? void 0 : params.refCode;
    if (!refCode) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Referrer not found" });
    }
    const referrer = await db_1.models.user.findOne({
        where: { id: refCode },
        attributes: ["username", "avatar"],
    });
    if (!referrer) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Referrer not found" });
    }
    return {
        username: (_a = referrer.username) !== null && _a !== void 0 ? _a : null,
        avatar: (_b = referrer.avatar) !== null && _b !== void 0 ? _b : null,
    };
};
