"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportSource extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportSource.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            kind: {
                type: sequelize_1.DataTypes.ENUM("DOCS_PACK", "DOCS_REMOTE", "FAQ", "ARTICLE", "CRAWL"),
                allowNull: false,
                defaultValue: "DOCS_PACK",
            },
            title: { type: sequelize_1.DataTypes.STRING(191), allowNull: false },
            locator: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
            productSlug: { type: sequelize_1.DataTypes.STRING(96), allowNull: true },
            version: { type: sequelize_1.DataTypes.STRING(32), allowNull: true },
            checksum: { type: sequelize_1.DataTypes.STRING(64), allowNull: true },
            chunkCount: {
                type: sequelize_1.DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0,
            },
            weight: {
                type: sequelize_1.DataTypes.FLOAT,
                allowNull: false,
                defaultValue: 1.0,
            },
            status: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: true,
            },
            lastIndexedAt: { type: sequelize_1.DataTypes.DATE, allowNull: true },
            error: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
        }, {
            sequelize,
            modelName: "aiSupportSource",
            tableName: "ai_support_source",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_source_kind_status_idx",
                    using: "BTREE",
                    fields: [{ name: "kind" }, { name: "status" }],
                },
                {
                    name: "ai_support_source_product_idx",
                    using: "BTREE",
                    fields: [{ name: "productSlug" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportSource.hasMany(models.aiSupportChunk, {
            foreignKey: "sourceId",
            as: "chunks",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportSource;
