"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryAiEngineABTestAssignment extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryAiEngineABTestAssignment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            testId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "testId: Test ID must not be empty" },
                    isUUID: { args: 4, msg: "testId: Must be a valid UUID" },
                },
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "userId: User ID must not be empty" },
                    isUUID: { args: 4, msg: "userId: Must be a valid UUID" },
                },
            },
            variant: {
                type: sequelize_1.DataTypes.ENUM("CONTROL", "TREATMENT"),
                allowNull: false,
            },
            assignedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
                defaultValue: sequelize_1.DataTypes.NOW,
            },
        }, {
            sequelize,
            modelName: "binaryAiEngineABTestAssignment",
            tableName: "binary_ai_engine_ab_test_assignment",
            timestamps: true,
            indexes: [
                { fields: ["testId"] },
                { fields: ["userId"] },
                { fields: ["variant"] },
                {
                    unique: true,
                    fields: ["testId", "userId"],
                    name: "binary_ai_engine_ab_test_assignment_test_user_unique",
                },
            ],
        });
    }
    static associate(models) {
        binaryAiEngineABTestAssignment.belongsTo(models.binaryAiEngineABTest, {
            foreignKey: "testId",
            as: "test",
            onDelete: "CASCADE",
        });
        binaryAiEngineABTestAssignment.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
        });
    }
}
exports.default = binaryAiEngineABTestAssignment;
