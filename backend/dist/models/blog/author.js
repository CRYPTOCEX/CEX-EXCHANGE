"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const init_1 = require("../init");
class author extends sequelize_1.Model {
    static initModel(sequelize) {
        return author.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
                comment: "Unique identifier for the blog author",
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: "authorUserIdFkey",
                validate: {
                    notNull: { msg: "userId: User ID cannot be null" },
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user who is applying to become a blog author",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "APPROVED", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "APPROVED", "REJECTED"]],
                        msg: "status: Must be either 'PENDING', 'APPROVED', or 'REJECTED'",
                    },
                },
                comment: "Current status of the author application (PENDING, APPROVED, REJECTED)",
            },
        }, {
            sequelize,
            modelName: "author",
            tableName: "author",
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
                    name: "authorIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "authorUserIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
            ],
            hooks: {
                ...(0, init_1.createUserCacheHooks)(),
            },
        });
    }
    static associate(models) {
        author.hasMany(models.post, {
            as: "posts",
            foreignKey: "authorId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        author.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = author;
