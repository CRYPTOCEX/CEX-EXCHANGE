"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class aiSupportFeedback extends sequelize_1.Model {
    static initModel(sequelize) {
        return aiSupportFeedback.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            turnId: { type: sequelize_1.DataTypes.UUID, allowNull: false },
            userId: { type: sequelize_1.DataTypes.UUID, allowNull: true },
            isHelpful: { type: sequelize_1.DataTypes.BOOLEAN, allowNull: false },
            comment: { type: sequelize_1.DataTypes.TEXT, allowNull: true },
            source: {
                type: sequelize_1.DataTypes.ENUM("CUSTOMER", "AGENT"),
                allowNull: false,
                defaultValue: "CUSTOMER",
            },
        }, {
            sequelize,
            modelName: "aiSupportFeedback",
            tableName: "ai_support_feedback",
            paranoid: false,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "ai_support_feedback_turn_user_uq",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "turnId" }, { name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        aiSupportFeedback.belongsTo(models.aiSupportTurn, {
            foreignKey: "turnId",
            as: "turn",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = aiSupportFeedback;
