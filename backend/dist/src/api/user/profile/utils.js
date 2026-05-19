"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = void 0;
const db_1 = require("@b/db");
const error_1 = require("@b/utils/error");
const kyc_1 = require("@b/utils/kyc");
const getUserById = async (id) => {
    const user = await db_1.models.user.findOne({
        where: { id },
        include: [
            {
                model: db_1.models.role,
                as: "role",
                attributes: ["id", "name"],
                include: [
                    {
                        model: db_1.models.permission,
                        as: "permissions",
                        through: { attributes: [] },
                        attributes: ["id", "name"],
                    },
                ],
            },
            {
                model: db_1.models.twoFactor,
                as: "twoFactor",
                attributes: ["type", "enabled"],
            },
            {
                model: db_1.models.kycApplication,
                as: "kycApplications",
                attributes: ["id", "status", "levelId", "createdAt", "reviewedAt"],
                include: [
                    {
                        model: db_1.models.kycLevel,
                        as: "level",
                        attributes: ["id", "name", "level", "features"],
                        paranoid: false,
                    },
                ],
                required: false,
            },
            {
                model: db_1.models.author,
                as: "author",
                attributes: ["id", "status"],
            },
            {
                model: db_1.models.providerUser,
                as: "providers",
                attributes: ["provider", "providerUserId"],
            },
        ],
        attributes: { exclude: ["password"] },
    });
    if (!user) {
        throw (0, error_1.createError)({
            statusCode: 404,
            message: "User not found",
        });
    }
    const plainUser = user.get({ plain: true });
    const kycStatus = (0, kyc_1.getEffectiveKycStatus)(plainUser.kycApplications || []);
    plainUser.kycLevel = kycStatus.level;
    plainUser.featureAccess = kycStatus.features;
    plainUser.kyc = kycStatus.effectiveApplication ? {
        id: kycStatus.effectiveApplication.id,
        status: kycStatus.effectiveApplication.status,
        level: kycStatus.effectiveApplication.level,
    } : null;
    delete plainUser.kycApplications;
    return plainUser;
};
exports.getUserById = getUserById;
