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
const Sequelize = __importStar(require("sequelize"));
const sequelize_1 = require("sequelize");
const emptyMenuOverrides = () => ({});
const emptyFooterContent = () => ({
    siteName: null,
    siteDescription: null,
    copyright: null,
    links: { hidden: [], labels: {}, icons: {}, order: {}, custom: [] },
    socials: null,
});
class siteChrome extends sequelize_1.Model {
    static initModel(sequelize) {
        return siteChrome.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the site chrome row (singleton)",
            },
            navbarVariant: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                defaultValue: "classic",
                comment: "Id of the navbar layout variant, matching the chrome variant registry",
            },
            footerVariant: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                defaultValue: "columns",
                comment: "Id of the footer layout variant, matching the chrome variant registry",
            },
            menuOverrides: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: emptyMenuOverrides,
                comment: "Menu override patches keyed by scope (admin, user, ext_*). Patch, never a snapshot - see frontend/lib/chrome/menu-overrides.ts",
                get() {
                    const value = this.getDataValue("menuOverrides");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            footerContent: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: emptyFooterContent,
                comment: "Footer brand text, link override patch and social links. null socials = derive from settings; [] = show none",
                get() {
                    const value = this.getDataValue("footerContent");
                    if (value == null)
                        return null;
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return null;
                        }
                    }
                    return value;
                },
            },
            createdAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: Sequelize.NOW,
            },
            updatedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                defaultValue: Sequelize.NOW,
            },
        }, {
            sequelize,
            modelName: "siteChrome",
            tableName: "site_chrome",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = siteChrome;
