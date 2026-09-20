"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportDeflection extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportDeflection.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            question: { type: sequelize_1.DataTypes.TEXT, allowNull: false },
            chunkId: { type: sequelize_1.DataTypes.STRING(191), allowNull: true },
            articleQuestion: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            outcome: {
                type: sequelize_1.DataTypes.ENUM("SHOWN", "RESOLVED", "FILED"),
                allowNull: false,
                defaultValue: "SHOWN",
            },
        }, {
            sequelize,
            modelName: "aiSupportDeflection",
            tableName: "ai_support_deflection",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_deflection_user_created_idx",
                    using: "BTREE",
                    fields: [{ name: "userId" }, { name: "createdAt" }],
                },
                {
                    name: "ai_support_deflection_outcome_created_idx",
                    using: "BTREE",
                    fields: [{ name: "outcome" }, { name: "createdAt" }],
                },
            ],
        });
    }
}
exports.default = aiSupportDeflection;
