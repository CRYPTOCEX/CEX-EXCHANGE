"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.hasKycReviewAccess = hasKycReviewAccess;
const db_1 = require("@b/db");
const console_1 = require("@b/utils/console");
const KYC_REVIEW_PERMISSIONS = [
    "view.kyc.application",
    "edit.kyc.application",
    "Access KYC Application Management",
];
const SUPER_ADMIN_ROLE = "Super Admin";
async function hasKycReviewAccess(userId) {
    if (!userId)
        return false;
    try {
        const user = await db_1.models.user.findByPk(userId, {
            attributes: ["id"],
            include: [
                {
                    model: db_1.models.role,
                    as: "role",
                    attributes: ["id", "name"],
                    include: [
                        {
                            model: db_1.models.permission,
                            as: "permissions",
                            attributes: ["name"],
                            through: { attributes: [] },
                        },
                    ],
                },
            ],
        });
        const role = user === null || user === void 0 ? void 0 : user.role;
        if (!role)
            return false;
        if (String(role.name) === SUPER_ADMIN_ROLE)
            return true;
        const permissions = (role.permissions || []);
        return permissions.some((permission) => KYC_REVIEW_PERMISSIONS.includes(permission === null || permission === void 0 ? void 0 : permission.name));
    }
    catch (error) {
        console_1.logger.error("KYC", "Failed to resolve KYC review access", error);
        return false;
    }
}
