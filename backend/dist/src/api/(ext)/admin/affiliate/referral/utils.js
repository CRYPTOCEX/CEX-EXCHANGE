"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mlmReferralStoreSchema = exports.mlmReferralUpdateSchema = exports.baseMlmReferralSchema = exports.mlmReferralSchema = void 0;
const schema_1 = require("@b/utils/schema");
const id = (0, schema_1.baseStringSchema)("ID of the MLM Referral");
const referrerId = (0, schema_1.baseStringSchema)("ID of the referrer");
const referredId = (0, schema_1.baseStringSchema)("ID of the referred");
const status = (0, schema_1.baseEnumSchema)("Status of the referral", [
    "PENDING",
    "ACTIVE",
    "REJECTED",
]);
const createdAt = (0, schema_1.baseDateTimeSchema)("Creation date of the referral");
const updatedAt = (0, schema_1.baseDateTimeSchema)("Last update date of the referral", true);
const deletedAt = (0, schema_1.baseDateTimeSchema)("Deletion date of the MLM Referral, if any");
exports.mlmReferralSchema = {
    id,
    referrerId,
    referredId,
    status,
    createdAt,
    updatedAt,
};
exports.baseMlmReferralSchema = {
    id,
    referrerId,
    referredId,
    status,
    createdAt,
    updatedAt,
    deletedAt,
};
exports.mlmReferralUpdateSchema = {
    type: "object",
    properties: {
        status,
    },
    required: ["status"],
};
exports.mlmReferralStoreSchema = exports.baseMlmReferralSchema;
