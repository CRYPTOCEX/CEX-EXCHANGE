"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminAlertRecipientRoles = adminAlertRecipientRoles;
exports.isDemoInstall = isDemoInstall;
const ADMIN_ROLE_NAMES = ["Admin", "Super Admin"];
const DEMO_ADMIN_ROLE_NAMES = ["Super Admin"];
function adminAlertRecipientRoles() {
    return process.env.NEXT_PUBLIC_DEMO_STATUS === "true"
        ? DEMO_ADMIN_ROLE_NAMES
        : ADMIN_ROLE_NAMES;
}
function isDemoInstall() {
    return process.env.NEXT_PUBLIC_DEMO_STATUS === "true";
}
