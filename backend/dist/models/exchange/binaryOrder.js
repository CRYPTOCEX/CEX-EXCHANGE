"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
class binaryOrder extends sequelize_1.Model {
    static initModel(sequelize) {
        return binaryOrder.init({
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
                    isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
                },
                comment: "ID of the user who placed this order",
            },
            symbol: {
                type: sequelize_1.DataTypes.STRING(191),
                allowNull: false,
                validate: {
                    notEmpty: { msg: "symbol: Symbol must not be empty" },
                },
                comment: "Trading currency/pair for the binary option",
            },
            price: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "price: Price must be a number" },
                },
                comment: "Entry price when the order was placed",
            },
            amount: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "amount: Amount must be a number" },
                },
                comment: "Amount invested in this binary option",
            },
            profit: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: false,
                validate: {
                    isNumeric: { msg: "profit: Profit must be a number" },
                },
                comment: "Potential profit amount from this option",
            },
            side: {
                type: sequelize_1.DataTypes.ENUM("RISE", "FALL", "HIGHER", "LOWER", "TOUCH", "NO_TOUCH", "CALL", "PUT", "UP", "DOWN"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "RISE",
                                "FALL",
                                "HIGHER",
                                "LOWER",
                                "TOUCH",
                                "NO_TOUCH",
                                "CALL",
                                "PUT",
                                "UP",
                                "DOWN",
                            ],
                        ],
                        msg: "side: Invalid side for order",
                    },
                },
                comment: "Direction/side of the binary option prediction",
            },
            type: {
                type: sequelize_1.DataTypes.ENUM("RISE_FALL", "HIGHER_LOWER", "TOUCH_NO_TOUCH", "CALL_PUT", "TURBO"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [
                            [
                                "RISE_FALL",
                                "HIGHER_LOWER",
                                "TOUCH_NO_TOUCH",
                                "CALL_PUT",
                                "TURBO",
                            ],
                        ],
                        msg: "type: Invalid type for order",
                    },
                },
                comment: "Type of binary option (rise/fall, higher/lower, etc.)",
            },
            durationType: {
                type: sequelize_1.DataTypes.ENUM("TIME", "TICKS"),
                allowNull: false,
                defaultValue: "TIME",
                validate: {
                    isIn: {
                        args: [["TIME", "TICKS"]],
                        msg: "durationType: must be 'TIME' or 'TICKS'",
                    },
                },
                comment: "Duration type - time-based or tick-based",
            },
            barrier: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "barrier: Barrier must be a number" },
                },
                comment: "Barrier price level for barrier options",
            },
            strikePrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "strikePrice: Strike Price must be a number" },
                },
                comment: "Strike price for the binary option",
            },
            payoutPerPoint: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: {
                        msg: "payoutPerPoint: Payout Per Point must be a number",
                    },
                },
                comment: "Payout amount per point movement",
            },
            profitPercentage: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: {
                        msg: "profitPercentage: Profit Percentage must be a number",
                    },
                },
                comment: "Profit percentage for this binary order duration",
            },
            status: {
                type: sequelize_1.DataTypes.ENUM("PENDING", "WIN", "LOSS", "DRAW", "CANCELED", "ERROR"),
                allowNull: false,
                validate: {
                    isIn: {
                        args: [["PENDING", "WIN", "LOSS", "DRAW", "CANCELED", "ERROR"]],
                        msg: "status: must be one of 'PENDING', 'WIN', 'LOSS', 'DRAW', 'CANCELED', 'ERROR'",
                    },
                },
                comment: "Current status of the binary option order (ERROR = data fetch failed, needs manual review)",
            },
            isDemo: {
                type: sequelize_1.DataTypes.BOOLEAN,
                allowNull: false,
                defaultValue: false,
                comment: "Whether this is a demo/practice order",
            },
            closedAt: {
                type: sequelize_1.DataTypes.DATE(3),
                allowNull: false,
                validate: {
                    isDate: {
                        msg: "closedAt: closedAt must be a valid date",
                        args: true,
                    },
                },
                comment: "Date and time when the option expires/closes",
            },
            closePrice: {
                type: sequelize_1.DataTypes.DOUBLE,
                allowNull: true,
                validate: {
                    isNumeric: { msg: "closePrice: Close Price must be a number" },
                },
                comment: "Final price when the option closed",
            },
            metadata: {
                type: sequelize_1.DataTypes.JSON,
                allowNull: true,
                comment: "Additional metadata (e.g., idempotency key, client info)",
            },
        }, {
            sequelize,
            modelName: "binaryOrder",
            tableName: "binary_order",
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
                    name: "binaryOrderIdKey",
                    unique: true,
                    using: "BTREE",
                    fields: [{ name: "id" }],
                },
                {
                    name: "binaryOrderUserIdForeign",
                    using: "BTREE",
                    fields: [{ name: "userId" }],
                },
                {
                    name: "idx_binary_order_status_closedAt",
                    using: "BTREE",
                    fields: [{ name: "status" }, { name: "closedAt" }],
                },
                {
                    name: "idx_binary_order_user_idempotency",
                    using: "BTREE",
                    fields: [
                        { name: "userId" },
                        { name: "metadata", length: 255 },
                    ],
                },
            ],
        });
    }
    static associate(models) {
        binaryOrder.belongsTo(models.user, {
            as: "user",
            foreignKey: "userId",
            onDelete: "CASCADE",
            onUpdate: "CASCADE",
        });
    }
}
exports.default = binaryOrder;
