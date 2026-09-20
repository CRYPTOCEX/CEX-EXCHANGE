"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const model_validators_1 = require("@b/utils/model-validators");
class transfiUser extends sequelize_1.Model {
    static initModel(sequelize) {
        return transfiUser.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                unique: "transfiUserUserIdKey",
                validate: {
                    isUUID: { args: model_validators_1.ANY_UUID_VERSION, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "Platform user this TransFi identity belongs to",
            },
            transfiUserId: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                unique: "transfiUserTransfiUserIdKey",
                validate: {
                    is: {
                        args: /^UX-[A-Za-z0-9]+$/,
                        msg: "transfiUserId: Must be a TransFi user id of the form UX-...",
                    },
                },
                comment: "TransFi identity id (UX-...)",
            },
            status: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: false,
                defaultValue: "unknown",
                comment: "TransFi top-level user status, verbatim",
            },
            basicKycStatus: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "TransFi basicKycStatus, verbatim",
            },
            standardKycStatus: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "TransFi standardKycStatus, verbatim",
            },
            advancedKycStatus: {
                type: sequelize_1.DataTypes.STRING(64),
                allowNull: true,
                comment: "TransFi advancedKycStatus, verbatim",
            },
            email: {
                type: sequelize_1.DataTypes.STRING(255),
                allowNull: true,
                comment: "Email registered with TransFi for this identity",
            },
            failureMessage: {
                type: sequelize_1.DataTypes.TEXT,
                allowNull: true,
                comment: "TransFi rejection/failure reason, when supplied",
            },
            lastSyncedAt: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: true,
                comment: "Last reconciliation against TransFi",
            },
        }, {
            sequelize,
            modelName: "transfiUser",
            tableName: "transfi_user",
            timestamps: true,
            paranoid: false,
            indexes: [
                {
                    name: "transfiUserUserIdKey",
                    unique: true,
                    fields: [{ name: "userId" }],
                },
                {
                    name: "transfiUserTransfiUserIdKey",
                    unique: true,
                    fields: [{ name: "transfiUserId" }],
                },
                {
                    name: "transfiUserStatusIdx",
                    fields: [{ name: "status" }],
                },
            ],
        });
    }
    static associate(models) {
        transfiUser.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = transfiUser;
