"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class faqFeedback extends sequelize_1.Model {
    static initModel(sequelize) {
        return faqFeedback.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                },
            },
            faqId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "faqId: FAQ ID cannot be null" },
                },
            },
            isHelpful: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
            },
            comment: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "faqFeedback",
            tableName: "faq_feedbacks",
            paranoid: true,
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                { name: "faq_feedbacks_faqId_idx", fields: [{ name: "faqId" }] },
                { name: "faq_feedbacks_userId_idx", fields: [{ name: "userId" }] },
                {
                    name: "faq_feedbacks_unique_user_faq",
                    unique: true,
                    fields: [{ name: "userId" }, { name: "faqId" }],
                },
            ],
        });
    }
    static associate(models) {
        faqFeedback.belongsTo(models.faq, {
            foreignKey: "faqId",
            as: "faq",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        faqFeedback.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = faqFeedback;
