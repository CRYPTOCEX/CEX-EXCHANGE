"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.callerIsSuperAdmin = callerIsSuperAdmin;
const db_1 = require("@b/db");
async function callerIsSuperAdmin(userId) {
    var _a;
    if (!userId)
        return false;
    const row = await db_1.models.user.findByPk(String(userId), {
        include: [{ model: db_1.models.role, as: "role" }],
    });
    return ((_a = row === null || row === void 0 ? void 0 : row.role) === null || _a === void 0 ? void 0 : _a.name) === "Super Admin";
}
