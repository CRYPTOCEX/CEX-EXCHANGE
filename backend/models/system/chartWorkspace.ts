import * as Sequelize from "sequelize";
import { DataTypes, Model } from "sequelize";
import { ANY_UUID_VERSION } from "@b/utils/model-validators";

/**
 * A CHART WORKSPACE, KEPT AGAINST THE ACCOUNT RATHER THAN THE BROWSER.
 * ============================================================================
 *
 * Everything the chart persists - drawings, indicators, templates, alerts,
 * favourites, saved strategies, the settings sheet, the per-symbol viewport -
 * lived in `localStorage` and nowhere else. Two consequences, and the second is
 * the one people actually complain about:
 *
 *  - Two accounts sharing one browser shared one workspace. That is fixed on
 *    the client by scoping every key to the user id, and it did not need a
 *    table.
 *  - A trader who signs in on a second machine, a second browser, or a private
 *    window gets the default chart rather than theirs, and clearing site data
 *    loses months of markup with no way back. THAT needs a server copy, and
 *    this is it.
 *
 * KEY-VALUE ON PURPOSE. The chart already writes about a dozen distinct blobs
 * under stable string keys, several of them per-symbol
 * (`binary-chart-drawings-BTC/USDT`), and it invents new ones as tools are
 * added. Modelling each as a column would mean a migration every time the chart
 * learns to remember something, and modelling drawings relationally would mean
 * the server understanding 132 tool schemas that only the client can interpret.
 * The server's job here is durability, not comprehension.
 *
 * `LONGTEXT`, because a heavily marked-up symbol runs to tens of kilobytes and
 * `TEXT` truncates at 64KB - silently, in MySQL's default non-strict mode,
 * which would corrupt exactly the biggest and most valuable workspaces. The API
 * layer caps the size before it gets here.
 */
export default class chartWorkspace
  extends Model<chartWorkspaceAttributes, chartWorkspaceCreationAttributes>
  implements chartWorkspaceAttributes
{
  id!: string;
  userId!: string;
  key!: string;
  value!: string | null;
  /**
   * Bumped by the server on every write.
   *
   * A monotonic counter rather than a timestamp: two devices whose clocks
   * disagree by a few seconds would otherwise take turns declaring each other
   * stale, and the one running slow would lose every edit it made.
   */
  version!: number;
  createdAt?: Date;
  updatedAt?: Date;

  public static initModel(
    sequelize: Sequelize.Sequelize
  ): typeof chartWorkspace {
    return chartWorkspace.init(
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
          comment: "Owner of this workspace entry",
          validate: {
            notNull: { msg: "userId: User ID cannot be null" },
            isUUID: { args: ANY_UUID_VERSION, msg: "userId: Must be a valid UUID" },
          },
        },
        key: {
          type: DataTypes.STRING(191),
          allowNull: false,
          comment:
            "Client-side storage key, e.g. binary-chart-drawings-BTC/USDT",
          validate: {
            notEmpty: { msg: "key: Key cannot be empty" },
          },
        },
        value: {
          /* See the class comment: TEXT truncates at 64KB and a marked-up
             symbol exceeds that, so the biggest workspaces would be the ones
             silently corrupted. */
          type: DataTypes.TEXT("long"),
          allowNull: true,
          comment: "Opaque JSON written by the chart client",
        },
        version: {
          type: DataTypes.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: "Monotonic write counter, for last-write detection",
        },
      },
      {
        sequelize,
        modelName: "chartWorkspace",
        tableName: "chart_workspace",
        timestamps: true,
        /* NOT paranoid. A deleted entry is a key the user cleared, and keeping
           a soft-deleted row would collide with the unique index the moment
           they set that key again - see the paranoid+UNIQUE trap. */
        paranoid: false,
        indexes: [
          {
            name: "PRIMARY",
            unique: true,
            using: "BTREE",
            fields: [{ name: "id" }],
          },
          {
            /* One row per key per user, which is what makes the write an
               upsert rather than an append. Without it a client that retries a
               failed save silently accumulates duplicate rows and the read
               picks whichever the engine returns first. */
            name: "chartWorkspaceUserKeyUnique",
            unique: true,
            using: "BTREE",
            fields: [{ name: "userId" }, { name: "key" }],
          },
        ],
      }
    );
  }

  public static associate(models: any) {
    chartWorkspace.belongsTo(models.user, {
      as: "user",
      foreignKey: "userId",
      onDelete: "CASCADE",
    });
  }
}
