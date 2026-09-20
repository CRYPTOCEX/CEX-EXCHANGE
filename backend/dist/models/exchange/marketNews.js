"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class marketNews extends sequelize_1.Model {
    static initModel(sequelize) {
        return marketNews.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            externalId: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: true,
                comment: "Stable provider dedup key (<provider>:<id>) — NULL for operator-authored MANUAL rows",
            },
            source: {
                type: sequelize_1.DataTypes.STRING(10),
                allowNull: false,
                defaultValue: "PROVIDER",
                validate: {
                    isIn: {
                        args: [["PROVIDER", "MANUAL"]],
                        msg: "source: Must be PROVIDER or MANUAL",
                    },
                },
            },
            provider: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
            },
            publishedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            headline: {
                type: sequelize_1.DataTypes.STRING(500),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "headline: Headline must not be empty" },
                },
            },
            summary: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "PLAIN TEXT only — vendors ship the publisher's HTML here, so every write door converts it first",
            },
            url: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            imageUrl: {
                type: sequelize_1.DataTypes.STRING(1000),
                allowNull: true,
            },
            category: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "Provider category (crypto, general, merger, ...)",
            },
            relatedSymbols: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "JSON array of base/quote assets this story is tagged with",
                set(value) {
                    this.setDataValue("relatedSymbols", value === null || value === undefined || typeof value === "string"
                        ? value
                        : JSON.stringify(value));
                },
                get() {
                    const value = this.getDataValue("relatedSymbols");
                    if (!value)
                        return null;
                    if (typeof value !== "string")
                        return value;
                    try {
                        const parsed = JSON.parse(value);
                        return Array.isArray(parsed) ? parsed : null;
                    }
                    catch (_a) {
                        return null;
                    }
                },
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: true,
                defaultValue: true,
                comment: "Visible to clients — lets an operator pull a story",
            },
        }, {
            sequelize,
            modelName: "marketNews",
            tableName: "market_news",
            timestamps: true,
            indexes: [
                {
                    name: "PRIMARY",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "marketNewsExternalIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "externalId" }],
                },
                {
                    name: "marketNewsPublishedAtIndex",
                    using: "BTREE",
                    fields: [{ name: "publishedAt" }],
                },
            ],
        });
    }
}
exports.default = marketNews;
