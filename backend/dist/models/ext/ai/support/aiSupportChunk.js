"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportChunk extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportChunk.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            sourceId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            ord: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            breadcrumb: { type: sequelize_1.DataTypes.STRING(512), allowNull: true },
            title: { type: sequelize_1.DataTypes.STRING(255), allowNull: true },
            anchor: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            text: { type: sequelize_1.DataTypes.TEXT("medium"), allowNull: false },
            tokens: { type: sequelize_1.DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
            citationUrl: { type: sequelize_1.DataTypes.STRING(512), allowNull: true },
            tags: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                get() {
                    const value = this.getDataValue("tags");
                    if (value == null)
                        return [];
                    if (typeof value === "string") {
                        try {
                            return JSON.parse(value);
                        }
                        catch (_a) {
                            return [];
                        }
                    }
                    return value;
                },
            },
            weight: { type: sequelize_1.DataTypes.FLOAT, allowNull: false, defaultValue: 1.0 },
            audience: {
                type: sequelize_1.DataTypes.ENUM("CUSTOMER", "OPERATOR"),
                allowNull: false,
                defaultValue: "CUSTOMER",
            },
        }, {
            sequelize,
            modelName: "aiSupportChunk",
            tableName: "ai_support_chunk",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_chunk_source_ord_idx",
                    using: "BTREE",
                    fields: [{ name: "sourceId" }, { name: "ord" }],
                },
                {
                    name: "ai_support_chunk_updated_idx",
                    using: "BTREE",
                    fields: [{ name: "updatedAt" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportChunk.belongsTo(models.aiSupportSource, {
            foreignKey: "sourceId",
            as: "source",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportChunk;
