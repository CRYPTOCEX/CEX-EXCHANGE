"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const sync_1 = require("csv-stringify/sync");
const demoMask_1 = require("@b/utils/demoMask");
exports.metadata = {
    summary: "Export all users as a CSV file",
    operationId: "exportUsersToCSV",
    tags: ["Admin", "CRM", "User"],
    parameters: [
        {
            name: "includePasswords",
            in: "query",
            description: "Include encrypted passwords in export",
            required: false,
            schema: {
                type: "boolean",
                default: false,
            },
        },
        {
            name: "status",
            in: "query",
            description: "Filter by user status",
            required: false,
            schema: {
                type: "string",
                enum: ["ACTIVE", "INACTIVE", "BANNED", "SUSPENDED"],
            },
        },
    ],
    responses: {
        200: {
            description: "CSV file with user data",
            content: {
                "text/csv": {
                    schema: {
                        type: "string",
                    },
                },
            },
        },
        401: {
            description: "Unauthorized access",
        },
    },
    requiresAuth: true,
    permission: "export.user",
};
exports.default = async (data) => {
    const { user, query } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized access" });
    }
    const includePasswords = (query === null || query === void 0 ? void 0 : query.includePasswords) === "true";
    const statusFilter = query === null || query === void 0 ? void 0 : query.status;
    const whereConditions = {};
    if (statusFilter) {
        whereConditions.status = statusFilter;
    }
    const users = await db_1.models.user.findAll({
        where: whereConditions,
        include: [
            { model: db_1.models.role, as: "role" },
        ],
        order: [["createdAt", "DESC"]],
    });
    const csvData = users.map((user) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const userData = {
            email: user.email || "",
            firstName: user.firstName || "",
            lastName: user.lastName || "",
            password: includePasswords ? user.password : "",
            phone: user.phone || "",
            status: user.status || "ACTIVE",
            emailVerified: user.emailVerified ? "true" : "false",
            twoFactor: user.twoFactor ? "true" : "false",
            roleId: user.roleId || "",
            avatar: user.avatar || "",
        };
        if (user.profile) {
            const profile = typeof user.profile === "string"
                ? JSON.parse(user.profile)
                : user.profile;
            userData.bio = profile.bio || "";
            userData.address = ((_a = profile.location) === null || _a === void 0 ? void 0 : _a.address) || "";
            userData.city = ((_b = profile.location) === null || _b === void 0 ? void 0 : _b.city) || "";
            userData.country = ((_c = profile.location) === null || _c === void 0 ? void 0 : _c.country) || "";
            userData.zip = ((_d = profile.location) === null || _d === void 0 ? void 0 : _d.zip) || "";
            userData.facebook = ((_e = profile.social) === null || _e === void 0 ? void 0 : _e.facebook) || "";
            userData.twitter = ((_f = profile.social) === null || _f === void 0 ? void 0 : _f.twitter) || "";
            userData.instagram = ((_g = profile.social) === null || _g === void 0 ? void 0 : _g.instagram) || "";
            userData.github = ((_h = profile.social) === null || _h === void 0 ? void 0 : _h.github) || "";
            userData.dribbble = ((_j = profile.social) === null || _j === void 0 ? void 0 : _j.dribbble) || "";
            userData.gitlab = ((_k = profile.social) === null || _k === void 0 ? void 0 : _k.gitlab) || "";
        }
        else {
            userData.bio = "";
            userData.address = "";
            userData.city = "";
            userData.country = "";
            userData.zip = "";
            userData.facebook = "";
            userData.twitter = "";
            userData.instagram = "";
            userData.github = "";
            userData.dribbble = "";
            userData.gitlab = "";
        }
        return userData;
    });
    const maskedData = (0, demoMask_1.applyDemoMask)(csvData, ["email", "phone"]);
    const csv = (0, sync_1.stringify)(maskedData, {
        header: true,
        columns: [
            "email",
            "firstName",
            "lastName",
            "password",
            "phone",
            "status",
            "emailVerified",
            "twoFactor",
            "roleId",
            "avatar",
            "bio",
            "address",
            "city",
            "country",
            "zip",
            "facebook",
            "twitter",
            "instagram",
            "github",
            "dribbble",
            "gitlab",
        ],
    });
    return {
        data: csv,
        headers: {
            "Content-Type": "text/csv",
            "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.csv"`,
        },
    };
};
