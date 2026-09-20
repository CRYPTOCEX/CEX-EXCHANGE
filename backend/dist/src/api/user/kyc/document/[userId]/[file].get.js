"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
const error_1 = require("@b/utils/error");
const kyc_review_access_1 = require("@b/utils/kyc-review-access");
const utils_1 = require("../utils");
exports.metadata = {
    summary: "Get a KYC identity document",
    description: "Streams one stored KYC document. Only the applicant it belongs to, and " +
        "operators holding KYC-review permission, may read it.",
    operationId: "getKycDocument",
    tags: ["KYC", "Upload"],
    requiresAuth: true,
    responseType: "binary",
    parameters: [
        {
            index: 0,
            name: "userId",
            in: "path",
            description: "ID of the applicant the document belongs to",
            required: true,
            schema: { type: "string" },
        },
        {
            index: 1,
            name: "file",
            in: "path",
            description: "Stored document filename",
            required: true,
            schema: { type: "string" },
        },
    ],
    responses: {
        200: { description: "Document streamed." },
        401: { description: "Unauthorized." },
        404: { description: "Document not found." },
    },
};
exports.default = async (data) => {
    const { userId, file } = data.params || {};
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized" });
    }
    const isOwner = String(user.id) === String(userId);
    if (!isOwner) {
        const isReviewer = await (0, kyc_review_access_1.hasKycReviewAccess)(user.id);
        if (!isReviewer) {
            throw (0, error_1.createError)({ statusCode: 404, message: "Document not found" });
        }
    }
    const filePath = (0, utils_1.resolveKycDocumentPath)(String(userId), String(file));
    if (!filePath) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Document not found" });
    }
    let contents;
    try {
        contents = await promises_1.default.readFile(filePath);
    }
    catch (_a) {
        throw (0, error_1.createError)({ statusCode: 404, message: "Document not found" });
    }
    const extension = path_1.default.extname(filePath).toLowerCase();
    const contentType = utils_1.KYC_DOCUMENT_CONTENT_TYPES[extension] || "application/octet-stream";
    const disposition = extension === ".pdf" ? "attachment" : "inline";
    return {
        data: contents,
        headers: {
            "Content-Type": contentType,
            "Content-Disposition": disposition,
            "Cache-Control": "private, max-age=0, no-store",
            "X-Content-Type-Options": "nosniff",
            "Content-Security-Policy": "default-src 'none'; sandbox",
        },
    };
};
