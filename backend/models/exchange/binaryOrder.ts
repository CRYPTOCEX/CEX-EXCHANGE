import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import user from "../user";

export default class binaryOrder
  extends Model<binaryOrderAttributes, binaryOrderCreationAttributes>
  implements binaryOrderAttributes
{
  id!: string;
  userId!: string;
  symbol!: string;
  price!: number;
  amount!: number;
  profit!: number;
  side!:
    | "RISE"
    | "FALL"
    | "HIGHER"
    | "LOWER"
    | "TOUCH"
    | "NO_TOUCH"
    | "CALL"
    | "PUT"
    | "UP"
    | "DOWN";
  type!: "RISE_FALL" | "HIGHER_LOWER" | "TOUCH_NO_TOUCH" | "CALL_PUT" | "TURBO";
  durationType!: "TIME" | "TICKS";
  barrier?: number;
  strikePrice?: number;
  payoutPerPoint?: number;
  status!: "PENDING" | "WIN" | "LOSS" | "DRAW" | "CANCELED";
  isDemo!: boolean;
  closedAt!: Date;
  closePrice?: number;
  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;

  user!: user;
  getUser!: Sequelize.BelongsToGetAssociationMixin<user>;
  setUser!: Sequelize.BelongsToSetAssociationMixin<user, userId>;
  createUser!: Sequelize.BelongsToCreateAssociationMixin<user>;

  public static initModel(sequelize: Sequelize.Sequelize): typeof binaryOrder {
    return binaryOrder.init(
      {
        id: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          primaryKey: true,
          allowNull: false,
        },
        userId: {
          type: DataTypes.UUID,
          allowNull: false,
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: 4, msg: "userId: User ID must be a valid UUID" },
          },
          comment: "ID of the user who placed this order",
        },
        symbol: {
          type: DataTypes.STRING(191),
          allowNull: false,
          validate: {
            notEmpty: { msg: "symbol: Symbol must not be empty" },
          },
          comment: "Trading currency/pair for the binary option",
        },
        price: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "price: Price must be a number" },
          },
          comment: "Entry price when the order was placed",
        },
        amount: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "amount: Amount must be a number" },
          },
          comment: "Amount invested in this binary option",
        },
        profit: {
          type: DataTypes.DOUBLE,
          allowNull: false,
          validate: {
            isNumeric: { msg: "profit: Profit must be a number" },
          },
          comment: "Potential profit amount from this option",
        },
        side: {
          type: DataTypes.ENUM(
            "RISE",
            "FALL",
            "HIGHER",
            "LOWER",
            "TOUCH",
            "NO_TOUCH",
            "CALL",
            "PUT",
            "UP",
            "DOWN"
          ),
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
          type: DataTypes.ENUM(
            "RISE_FALL",
            "HIGHER_LOWER",
            "TOUCH_NO_TOUCH",
            "CALL_PUT",
            "TURBO"
          ),
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
          type: DataTypes.ENUM("TIME", "TICKS"),
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
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isNumeric: { msg: "barrier: Barrier must be a number" },
          },
          comment: "Barrier price level for barrier options",
        },
        strikePrice: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isNumeric: { msg: "strikePrice: Strike Price must be a number" },
          },
          comment: "Strike price for the binary option",
        },
        payoutPerPoint: {
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isNumeric: {
              msg: "payoutPerPoint: Payout Per Point must be a number",
            },
          },
          comment: "Payout amount per point movement",
        },
        status: {
          type: DataTypes.ENUM("PENDING", "WIN", "LOSS", "DRAW", "CANCELED"),
          allowNull: false,
          validate: {
            isIn: {
              args: [["PENDING", "WIN", "LOSS", "DRAW", "CANCELED"]],
              msg: "status: must be one of 'PENDING', 'WIN', 'LOSS', 'DRAW','CANCELED'",
            },
          },
          comment: "Current status of the binary option order",
        },
        isDemo: {
          type: DataTypes.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: "Whether this is a demo/practice order",
        },
        closedAt: {
          type: DataTypes.DATE(3),
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
          type: DataTypes.DOUBLE,
          allowNull: true,
          validate: {
            isNumeric: { msg: "closePrice: Close Price must be a number" },
          },
          comment: "Final price when the option closed",
        },
      },
      {
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
        ],
      }
    );
  }
  public static associate(models: any) {
    binaryOrder.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
      onUpdate: "CASCADE",
    });
  }
}
