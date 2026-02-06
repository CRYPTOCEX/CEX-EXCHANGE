"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getUserById = void 0;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
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
                as: "kyc",
                attributes: ["status"],
                include: [
                    {
                        model: db_1.models.kycLevel,
                        as: "level",
                        attributes: ["id", "name", "level", "features"],
                        paranoid: false,
                    },
                ],
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
    let featureAccess = [];
    if (plainUser.kyc &&
        plainUser.kyc.status === "APPROVED" &&
        plainUser.kyc.level) {
        plainUser.kycLevel = plainUser.kyc.level.level;
        try {
            if (plainUser.kyc.level.features) {
                if (typeof plainUser.kyc.level.features === "string") {
                    featureAccess = JSON.parse(plainUser.kyc.level.features);
                }
                else if (Array.isArray(plainUser.kyc.level.features)) {
                    featureAccess = plainUser.kyc.level.features;
                }
                if (!Array.isArray(featureAccess)) {
                    featureAccess = [];
                }
            }
        }
        catch (err) {
            console_1.logger.error("USER", "Error parsing KYC level features", err);
            featureAccess = [];
        }
    }
    else {
        plainUser.kycLevel = 0;
    }
    plainUser.featureAccess = featureAccess;
    return plainUser;
};
exports.getUserById = getUserById;
