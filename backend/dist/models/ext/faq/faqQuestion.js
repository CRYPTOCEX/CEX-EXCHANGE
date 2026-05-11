"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class faqQuestion extends sequelize_1.Model {
    static initModel(sequelize) {
        return faqQuestion.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            name: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "name: Name must not be empty" },
                },
            },
            email: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    isEmail: { msg: "email: Must be a valid email" },
                    notEmpty: { msg: "email: Email must not be empty" },
                },
            },
            question: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "question: Question must not be empty" },
                },
            },
            answer: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "ANSWERED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "ANSWERED", "REJECTED"]],
                        msg: "status: Must be one of: PENDING, ANSWERED, REJECTED",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "faqQuestion",
            tableName: "faq_questions",
            paranoid: true,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "faq_questions_status_idx", fields: [{ name: "status" }] },
            ],
        });
    }
}
exports.default = faqQuestion;
