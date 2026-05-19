"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.metadata = void 0;
const error_1 = require("@b/utils/error");
const db_1 = require("@b/db");
const XLSX = __importStar(require("xlsx"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const demoMask_1 = require("@b/utils/demoMask");
exports.metadata = {
    summary: "Export all users as an Excel file with detailed information",
    operationId: "exportUsersToExcel",
    tags: ["Admin", "CRM", "User"],
    responses: {
        200: {
            description: "Excel file created successfully",
        },
    },
    requiresAuth: true,
    permission: "view.user",
};
exports.default = async (data) => {
    const { user } = data;
    if (!(user === null || user === void 0 ? void 0 : user.id)) {
        throw (0, error_1.createError)({ statusCode: 401, message: "Unauthorized access" });
    }
    const users = await db_1.models.user.findAll({
        include: [
            { model: db_1.models.role, as: "role" },
            { model: db_1.models.kycApplication, as: "kycApplications" },
        ],
    });
    const userData = users.map((user) => {
        var _a, _b, _c;
        const kycApps = user.kycApplications || [];
        const approvedKyc = kycApps.find((app) => app.status === "APPROVED");
        const latestKyc = kycApps.length > 0 ? kycApps[kycApps.length - 1] : null;
        const effectiveKyc = approvedKyc || latestKyc;
        return {
            ID: user.id,
            FirstName: user.firstName || "N/A",
            LastName: user.lastName || "N/A",
            Email: user.email || "N/A",
            EmailVerified: user.emailVerified ? "Yes" : "No",
            Phone: user.phone || "N/A",
            Role: ((_a = user.role) === null || _a === void 0 ? void 0 : _a.name) || "N/A",
            Status: user.status,
            KYC_Status: (effectiveKyc === null || effectiveKyc === void 0 ? void 0 : effectiveKyc.status) || "N/A",
            CreatedAt: ((_b = user.createdAt) === null || _b === void 0 ? void 0 : _b.toISOString()) || "N/A",
            LastLogin: ((_c = user.lastLogin) === null || _c === void 0 ? void 0 : _c.toISOString()) || "N/A",
        };
    });
    const maskedData = (0, demoMask_1.applyDemoMask)(userData, ["Email", "Phone"]);
    const worksheet = XLSX.utils.json_to_sheet(maskedData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    const filePath = path.join(process.cwd(), "exports", "users.xlsx");
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    XLSX.writeFile(workbook, filePath);
    return {
        message: `Excel file created successfully at ${filePath}`,
    };
};
