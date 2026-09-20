"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEO_RESTRICTION_REASONS = exports.GEO_RESTRICTION_SCOPES = exports.GEO_RESTRICTION_TYPES = void 0;
const sequelize_1 = require("sequelize");
exports.GEO_RESTRICTION_TYPES = ["BLOCK", "ALLOW"];
exports.GEO_RESTRICTION_SCOPES = [
    "FULL",
    "PARTIAL",
];
exports.GEO_RESTRICTION_REASONS = [
    "SANCTIONS",
    "UNLICENSED",
    "REGULATORY",
    "HIGH_RISK",
    "INTERNAL_POLICY",
    "OTHER",
];
class geoRestriction extends sequelize_1.Model {
    static initModel(sequelize) {
        return geoRestriction.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            countryCode: {
                type: sequelize_1.DataTypes.STRING(2),
                allowNull: false,
                validate: {
                    is: {
                        args: /^[A-Z]{2}$/,
                        msg: "countryCode: Country code must be an ISO 3166-1 alpha-2 code (e.g. US)",
                    },
                },
            },
            countryName: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "countryName: Country name cannot be empty" },
                },
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("BLOCK", "ALLOW"),
                allowNull: false,
                defaultValue: "BLOCK",
                validate: {
                    isIn: {
                        args: [exports.GEO_RESTRICTION_TYPES],
                        msg: "type: Type must be one of BLOCK, ALLOW",
                    },
                },
            },
            scope: {
                type: sequelize_1.DataTypes.ENUM("FULL", "PARTIAL"),
                allowNull: false,
                defaultValue: "FULL",
                validate: {
                    isIn: {
                        args: [exports.GEO_RESTRICTION_SCOPES],
                        msg: "scope: Scope must be one of FULL, PARTIAL",
                    },
                },
            },
            restrictedActions: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                defaultValue: null,
                get() {
                    const value = this.getDataValue("restrictedActions");
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
            reason: {
                type: sequelize_1.DataTypes.ENUM("SANCTIONS", "UNLICENSED", "REGULATORY", "HIGH_RISK", "INTERNAL_POLICY", "OTHER"),
                allowNull: false,
                defaultValue: "REGULATORY",
                validate: {
                    isIn: {
                        args: [exports.GEO_RESTRICTION_REASONS],
                        msg: `reason: Reason must be one of ${exports.GEO_RESTRICTION_REASONS.join(", ")}`,
                    },
                },
            },
            legalReference: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
            },
            notes: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            effectiveFrom: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            effectiveTo: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
            },
            createdBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            updatedBy: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "geoRestriction",
            tableName: "geo_restriction",
            timestamps: true,
            paranoid: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "geoRestrictionCountryCodeIdx",
                    using: "BTREE",
                    fields: [{ name: "countryCode" }],
                },
                {
                    name: "geoRestrictionStatusIdx",
                    using: "BTREE",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) { }
}
exports.default = geoRestriction;
