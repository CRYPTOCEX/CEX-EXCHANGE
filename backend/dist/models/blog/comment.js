"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class comment extends sequelize_1.Model {
    static initModel(sequelize) {
        return comment.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the blog comment",
            },
            content: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: false,
                validate: {
                    notEmpty: { msg: "content: Content must not be empty" },
                },
                comment: "Content/text of the comment",
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: {
                        args: 4,
                        msg: "userId: User ID must be a valid UUID",
                    },
                },
                comment: "ID of the user who posted this comment",
            },
            postId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    notNull: { msg: "postId: Post ID cannot be null" },
                    isUUID: { args: 4, msg: "postId: Post ID must be a valid UUID" },
                },
                comment: "ID of the blog post this comment belongs to",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("APPROVED", "PENDING", "REJECTED"),
                defaultValue: "PENDING",
                allowNull: false,
                comment: "Moderation status of the comment (APPROVED, PENDING, REJECTED)",
            },
        }, {
            sequelize,
            modelName: "comment",
            tableName: "comment",
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
                    name: "commentsPostIdForeign",
                    using: "BTREE",
                    fields: [{ name: "postId" }],
                },
                {
                    name: "commentsUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
        });
    }
    static associate(models) {
        comment.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        comment.belongsTo(models.post, {
            as: "post",
            foreignKey: "postId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = comment;
