"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
function decimalGetter(field) {
    return function () {
        const raw = this.getDataValue(field);
        if (raw === null || raw === undefined)
            return raw;
        const n = typeof raw === "number" ? raw : Number(raw);
        return Number.isFinite(n) ? n : 0;
    };
}
class stakingStatement extends sequelize_1.Model {
    static initModel(sequelize) {
        return stakingStatement.init({
            id: {
                type: sequelize_1.DataTypes.UUID,
                defaultValue: sequelize_1.DataTypes.UUIDV4,
                primaryKey: true,
                allowNull: false,
            },
            userId: {
                type: sequelize_1.DataTypes.UUID,
                allowNull: false,
                validate: { notNull: { msg: "userId: User ID cannot be null" } },
            },
            period: {
                type: sequelize_1.DataTypes.STRING(32),
                allowNull: false,
                validate: { notEmpty: { msg: "period: Period must not be empty" } },
            },
            periodStart: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            periodEnd: {
                type: sequelize_1.DataTypes.DATE,
                allowNull: false,
            },
            format: {
                type: sequelize_1.DataTypes.ENUM("CSV"),
                allowNull: false,
                defaultValue: "CSV",
            },
            content: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: false,
            },
            hash: {
                type: sequelize_1.DataTypes.STRING(128),
                allowNull: false,
            },
            totalStaked: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("totalStaked"),
            },
            totalRewards: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("totalRewards"),
            },
            totalCommission: {
                type: sequelize_1.DataTypes.DECIMAL(36, 18),
                allowNull: false,
                defaultValue: 0,
                get: decimalGetter("totalCommission"),
            },
            summary: {
                type: sequelize_1.DataTypes.TEXT("long"),
                allowNull: true,
            },
        }, {
            sequelize,
            modelName: "stakingStatement",
            tableName: "staking_statements",
            timestamps: true,
            indexes: [
                { name: "PRIMARY", unique: true, fields: [{ name: "id" }] },
                {
                    name: "staking_statements_user_period_key",
                    unique: true,
                    fields: [{ name: "userId" }, { name: "period" }],
                },
            ],
        });
    }
    static associate(models) {
        stakingStatement.belongsTo(models.user, {
            foreignKey: "userId",
            as: "user",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = stakingStatement;
