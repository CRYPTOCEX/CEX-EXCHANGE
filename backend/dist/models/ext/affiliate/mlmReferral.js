"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class mlmReferral extends sequelize_1.Model {
    static initModel(sequelize) {
        return mlmReferral.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            referrerId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "referrerId: Referrer ID must be a valid UUID",
                    },
                },
            },
            referredId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: {
                    isUUID: {
                        args: 4,
                        msg: "referredId: Referred ID must be a valid UUID",
                    },
                },
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "ACTIVE", "REJECTED"),
                allowNull: false,
                defaultValue: "PENDING",
                validate: {
                    isIn: {
                        args: [["PENDING", "ACTIVE", "REJECTED"]],
                        msg: "status: Status must be one of PENDING, ACTIVE, REJECTED",
                    },
                },
            },
        }, {
            sequelize,
            modelName: "mlmReferral",
            tableName: "mlm_referral",
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
                    name: "mlmReferralReferredIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "referredId" }],
                },
                {
                    name: "mlmReferralReferrerIdReferredIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "referrerId" }, { name: "referredId" }],
                },
            ],
        });
    }
    static associate(models) {
        mlmReferral.belongsTo(models.user, {
            as: "referrer",
            foreignKey: "referrerId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmReferral.belongsTo(models.user, {
            as: "referred",
            foreignKey: "referredId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmReferral.hasOne(models.mlmUnilevelNode, {
            as: "unilevelNode",
            foreignKey: "referralId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
        mlmReferral.hasOne(models.mlmBinaryNode, {
            as: "node",
            foreignKey: "referralId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = mlmReferral;
