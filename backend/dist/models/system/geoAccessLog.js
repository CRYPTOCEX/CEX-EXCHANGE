"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GEO_COUNTRY_SOURCES = exports.GEO_ACCESS_DECISIONS = void 0;
const sequelize_1 = require("sequelize");
exports.GEO_ACCESS_DECISIONS = [
    "BLOCKED",
    "ALLOWED",
    "BYPASSED",
];
exports.GEO_COUNTRY_SOURCES = [
    "CDN_HEADER",
    "IP_LOOKUP",
    "KYC",
    "PROFILE",
    "MANUAL",
    "NONE",
];
class geoAccessLog extends sequelize_1.Model {
    static initModel(sequelize) {
        return geoAccessLog.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            ip: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            countryCode: {
                type: sequelize_1.DataTypes.STRING(2),
                allowNull: true,
            },
            countryName: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
            },
            region: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
            },
            city: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: true,
            },
            source: {
                type: sequelize_1.DataTypes.ENUM("CDN_HEADER", "IP_LOOKUP", "KYC", "PROFILE", "MANUAL", "NONE"),
                allowNull: false,
                defaultValue: "NONE",
            },
            decision: {
                type: sequelize_1.DataTypes.ENUM("BLOCKED", "ALLOWED", "BYPASSED"),
                allowNull: false,
            },
            reasonCode: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
            },
            reasonDetail: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            restrictionId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            action: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: true,
            },
            path: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: false,
            },
            method: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: true,
            },
            userAgent: {
                type: sequelize_1.DataTypes.STRING(512),
                allowNull: true,
            },
            isProxy: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            isHosting: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            isTor: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
            },
            hitCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 1,
            },
        }, {
            sequelize,
            modelName: "geoAccessLog",
            tableName: "geo_access_log",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "geoAccessLogCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "createdAt" }],
                },
                {
                    name: "geoAccessLogDecisionCreatedAtIdx",
                    using: "BTREE",
                    fields: [{ name: "decision" }, { name: "createdAt" }],
                },
                {
                    name: "geoAccessLogCountryCodeIdx",
                    using: "BTREE",
                    fields: [{ name: "countryCode" }],
                },
                {
                    name: "geoAccessLogIpIdx",
                    using: "BTREE",
                    fields: [{ name: "ip" }],
                },
                {
                    name: "geoAccessLogUserIdIdx",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        geoAccessLog.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            constraints: false,
        });
    }
}
exports.default = geoAccessLog;
