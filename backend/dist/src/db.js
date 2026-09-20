"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.models = exports.sequelize = exports.db = exports.SequelizeSingleton = void 0;
const sequelize_1 = require("sequelize");
const init_1 = require("../models/init");
const worker_threads_1 = require("worker_threads");
const console_1 = require("@b/utils/console");
const error_1 = require("@b/utils/error");
const db_port_1 = require("@b/api/admin/system/database/db-port");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
require("../types/models");
const SYNC_HASH_FILE = path_1.default.join(__dirname, process.env.NODE_ENV === "production" ? "../.." : "..", ".sync-hash");
const SYNC_MANIFEST_VERSION = 2;
function tableNameOf(value) {
    if (typeof value === "string")
        return value;
    if (value && typeof value.tableName === "string")
        return value.tableName;
    return String(value);
}
class SequelizeSingleton {
    constructor() {
        if (!process.env.DB_NAME || !process.env.DB_USER || !process.env.DB_HOST) {
            throw (0, error_1.createError)({ statusCode: 500, message: 'Missing required database environment variables. Please check your .env file.' });
        }
        let port;
        try {
            port = (0, db_port_1.resolveDatabasePort)(process.env.DB_PORT);
        }
        catch (error) {
            throw (0, error_1.createError)({
                statusCode: 500,
                message: `Invalid DB_PORT: ${error.message}. It must be a whole number between 1 and 65535, or left unset for MySQL's default of ${db_port_1.DEFAULT_MYSQL_PORT}.`,
            });
        }
        this.sequelize = new sequelize_1.Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD || '', {
            host: process.env.DB_HOST,
            dialect: "mysql",
            port,
            logging: false,
            dialectOptions: {
                charset: "utf8mb4",
            },
            pool: {
                max: Number(process.env.DB_POOL_MAX) || 25,
                min: Number(process.env.DB_POOL_MIN) || 2,
                acquire: Number(process.env.DB_POOL_ACQUIRE_MS) || 30000,
                idle: Number(process.env.DB_POOL_IDLE_MS) || 10000,
            },
            define: {
                charset: "utf8mb4",
                collate: "utf8mb4_unicode_ci",
            },
        });
        if (!this.sequelize) {
            throw (0, error_1.createError)({ statusCode: 500, message: "Failed to create Sequelize instance" });
        }
        this.models = this.initModels();
    }
    static getInstance() {
        if (!SequelizeSingleton.instance) {
            SequelizeSingleton.instance = new SequelizeSingleton();
        }
        return SequelizeSingleton.instance;
    }
    async initialize() {
        if (worker_threads_1.isMainThread) {
            await this.syncDatabase();
        }
    }
    getSequelize() {
        return this.sequelize;
    }
    initModels() {
        const models = (0, init_1.initModels)(this.sequelize);
        return models;
    }
    computeModelsHash() {
        const modelsDir = path_1.default.join(__dirname, "..", "models");
        const isProduction = process.env.NODE_ENV === "production";
        const fileExtension = isProduction ? ".js" : ".ts";
        const hash = crypto_1.default.createHash("md5");
        const walkDir = (dir) => {
            const entries = fs_1.default.readdirSync(dir, { withFileTypes: true });
            entries.sort((a, b) => a.name.localeCompare(b.name));
            for (const entry of entries) {
                const fullPath = path_1.default.join(dir, entry.name);
                if (entry.isDirectory()) {
                    walkDir(fullPath);
                }
                else if (entry.isFile() &&
                    path_1.default.extname(entry.name) === fileExtension &&
                    entry.name !== "init.ts" &&
                    entry.name !== "init.js" &&
                    !entry.name.includes("index")) {
                    const relativePath = path_1.default.relative(modelsDir, fullPath);
                    const content = fs_1.default.readFileSync(fullPath, "utf-8");
                    hash.update(relativePath);
                    hash.update(content);
                }
            }
        };
        walkDir(modelsDir);
        return hash.digest("hex");
    }
    getStoredHash() {
        try {
            if (fs_1.default.existsSync(SYNC_HASH_FILE)) {
                return fs_1.default.readFileSync(SYNC_HASH_FILE, "utf-8").trim();
            }
        }
        catch (_a) {
        }
        return null;
    }
    readManifest() {
        try {
            if (!fs_1.default.existsSync(SYNC_HASH_FILE))
                return null;
            const raw = fs_1.default.readFileSync(SYNC_HASH_FILE, "utf-8").trim();
            if (!raw.startsWith("{"))
                return null;
            const parsed = JSON.parse(raw);
            if ((parsed === null || parsed === void 0 ? void 0 : parsed.version) !== SYNC_MANIFEST_VERSION || !parsed.models)
                return null;
            return parsed;
        }
        catch (_a) {
            return null;
        }
    }
    storeManifest(models) {
        try {
            const manifest = { version: SYNC_MANIFEST_VERSION, models };
            fs_1.default.writeFileSync(SYNC_HASH_FILE, JSON.stringify(manifest), "utf-8");
        }
        catch (_a) {
        }
    }
    fingerprintModels() {
        var _a;
        const out = {};
        const modelManager = this.sequelize.modelManager;
        for (const model of modelManager.models) {
            const columns = {};
            const attributes = model.tableAttributes || {};
            for (const name of Object.keys(attributes).sort()) {
                const attribute = attributes[name];
                const field = attribute.field || name;
                columns[field] = SequelizeSingleton.fingerprintColumn(field, attribute);
            }
            out[model.name] = {
                table: tableNameOf(model.getTableName()),
                columns,
                indexes: SequelizeSingleton.md5(JSON.stringify((_a = model._indexes) !== null && _a !== void 0 ? _a : [])),
            };
        }
        return out;
    }
    static fingerprintColumn(field, attribute) {
        var _a, _b, _c;
        var _d, _e, _f, _g, _h;
        const references = attribute.references
            ? {
                model: tableNameOf((_e = (_d = (_a = attribute.references.model) === null || _a === void 0 ? void 0 : _a.tableName) !== null && _d !== void 0 ? _d : (_c = (_b = attribute.references.model) === null || _b === void 0 ? void 0 : _b.getTableName) === null || _c === void 0 ? void 0 : _c.call(_b)) !== null && _e !== void 0 ? _e : attribute.references.model),
                key: (_f = attribute.references.key) !== null && _f !== void 0 ? _f : "id",
                deferrable: attribute.references.deferrable
                    ? String(attribute.references.deferrable)
                    : null,
            }
            : null;
        return SequelizeSingleton.md5(JSON.stringify({
            field,
            type: SequelizeSingleton.fingerprintType(attribute.type),
            allowNull: attribute.allowNull !== false,
            defaultValue: SequelizeSingleton.fingerprintDefault(attribute.defaultValue),
            primaryKey: !!attribute.primaryKey,
            autoIncrement: !!attribute.autoIncrement,
            unique: attribute.unique && typeof attribute.unique === "object"
                ? JSON.stringify(attribute.unique)
                : (_g = attribute.unique) !== null && _g !== void 0 ? _g : false,
            comment: (_h = attribute.comment) !== null && _h !== void 0 ? _h : null,
            references,
            onDelete: attribute.onDelete ? String(attribute.onDelete).toUpperCase() : null,
            onUpdate: attribute.onUpdate ? String(attribute.onUpdate).toUpperCase() : null,
        }));
    }
    static fingerprintType(type) {
        var _a;
        if (type === null || type === undefined)
            return null;
        if (typeof type === "string")
            return type;
        if (typeof type.key === "string") {
            return {
                key: type.key,
                options: (_a = type.options) !== null && _a !== void 0 ? _a : null,
                values: Array.isArray(type.values) ? type.values : null,
            };
        }
        try {
            return String(type);
        }
        catch (_b) {
            return `unknown:${Math.random()}`;
        }
    }
    static fingerprintDefault(value) {
        if (value === undefined)
            return "\u0000undefined";
        if (value === null)
            return null;
        if (typeof value === "function")
            return `fn:${value.name || "anonymous"}`;
        if (typeof value !== "object")
            return value;
        if (typeof value.key === "string")
            return `type:${value.key}`;
        if ("val" in value)
            return `literal:${String(value.val)}`;
        try {
            return JSON.stringify(value);
        }
        catch (_a) {
            return `unserializable:${Math.random()}`;
        }
    }
    static md5(input) {
        return crypto_1.default.createHash("md5").update(input).digest("hex");
    }
    async syncSchema(options) {
        await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
        try {
            await this.syncWithForeignKeyRetries(() => this.sequelize.sync(options));
        }
        finally {
            await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
        }
        await this.dropRedundantConstraints();
        await this.relaxUniqueIndexes();
    }
    async syncChangedModels(changedModels, stored, current) {
        const modelManager = this.sequelize.modelManager;
        const wanted = new Set(changedModels);
        const sorted = modelManager.getModelsTopoSortedByForeignKey();
        const ordered = sorted ? [...sorted].reverse() : [...modelManager.models];
        const targets = ordered.filter((model) => wanted.has(model.name));
        for (const model of modelManager.models) {
            if (wanted.has(model.name) && !targets.includes(model))
                targets.push(model);
        }
        const stats = { applied: 0, skipped: 0 };
        await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 0");
        try {
            await this.withUnchangedColumnsSkipped(stored, current, stats, async () => {
                for (const model of targets) {
                    await this.syncWithForeignKeyRetries(() => model.sync({ alter: true }));
                }
            });
        }
        finally {
            await this.sequelize.query("SET FOREIGN_KEY_CHECKS = 1");
        }
        console_1.logger.info("DB", `Synced ${targets.length} changed model(s) — ${stats.applied} column statement(s) applied, ` +
            `${stats.skipped} unchanged skipped`);
        await this.dropRedundantConstraints();
        await this.relaxUniqueIndexes();
    }
    async withUnchangedColumnsSkipped(stored, current, stats, run) {
        var _a;
        if (((_a = process.env.DB_SYNC_DIFF) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "off")
            return run();
        const queryInterface = this.sequelize.getQueryInterface();
        const originalChangeColumn = queryInterface.changeColumn;
        const originalRemoveConstraint = queryInterface.removeConstraint;
        const originalGetForeignKeys = queryInterface.getForeignKeyReferencesForTable;
        const ownChangeColumn = Object.prototype.hasOwnProperty.call(queryInterface, "changeColumn");
        const ownRemoveConstraint = Object.prototype.hasOwnProperty.call(queryInterface, "removeConstraint");
        const unchanged = SequelizeSingleton.buildUnchangedColumnIndex(stored, current);
        const constraintColumns = new Map();
        const isUnchanged = (table, column) => { var _a; return ((_a = unchanged.get(table)) === null || _a === void 0 ? void 0 : _a.has(column)) === true; };
        queryInterface.changeColumn = async (tableName, attributeName, dataTypeOrOptions, options) => {
            if (isUnchanged(tableNameOf(tableName), attributeName)) {
                stats.skipped++;
                return;
            }
            stats.applied++;
            return originalChangeColumn.call(queryInterface, tableName, attributeName, dataTypeOrOptions, options);
        };
        queryInterface.removeConstraint = async (tableName, constraintName, options) => {
            const table = tableNameOf(tableName);
            if (!constraintColumns.has(table)) {
                const map = new Map();
                try {
                    const references = await originalGetForeignKeys.call(queryInterface, tableName, options);
                    for (const reference of references) {
                        if ((reference === null || reference === void 0 ? void 0 : reference.constraintName) && (reference === null || reference === void 0 ? void 0 : reference.columnName)) {
                            map.set(reference.constraintName, reference.columnName);
                        }
                    }
                }
                catch (_a) {
                }
                constraintColumns.set(table, map);
            }
            const column = constraintColumns.get(table).get(constraintName);
            if (column && isUnchanged(table, column)) {
                stats.skipped++;
                return;
            }
            return originalRemoveConstraint.call(queryInterface, tableName, constraintName, options);
        };
        try {
            return await run();
        }
        finally {
            if (ownChangeColumn)
                queryInterface.changeColumn = originalChangeColumn;
            else
                delete queryInterface.changeColumn;
            if (ownRemoveConstraint)
                queryInterface.removeConstraint = originalRemoveConstraint;
            else
                delete queryInterface.removeConstraint;
        }
    }
    static diffModels(stored, current) {
        const changed = [];
        for (const [name, fingerprint] of Object.entries(current)) {
            const previous = stored.models[name];
            if (!previous ||
                previous.table !== fingerprint.table ||
                previous.indexes !== fingerprint.indexes) {
                changed.push(name);
                continue;
            }
            const columns = Object.keys(fingerprint.columns);
            if (columns.length !== Object.keys(previous.columns).length ||
                columns.some((column) => previous.columns[column] !== fingerprint.columns[column])) {
                changed.push(name);
            }
        }
        return changed;
    }
    static buildUnchangedColumnIndex(stored, current) {
        const unchanged = new Map();
        const changed = new Map();
        for (const [name, fingerprint] of Object.entries(current)) {
            const previous = stored.models[name];
            const table = fingerprint.table;
            if (!unchanged.has(table))
                unchanged.set(table, new Set());
            if (!changed.has(table))
                changed.set(table, new Set());
            for (const [column, hash] of Object.entries(fingerprint.columns)) {
                const matches = previous && previous.table === table && previous.columns[column] === hash;
                (matches ? unchanged : changed).get(table).add(column);
            }
        }
        for (const [table, columns] of changed) {
            const safe = unchanged.get(table);
            if (safe)
                for (const column of columns)
                    safe.delete(column);
        }
        return unchanged;
    }
    async relaxUniqueIndexes() {
        const schema = process.env.DB_NAME;
        for (const spec of SequelizeSingleton.RELAXED_UNIQUE_INDEXES) {
            try {
                const rows = await this.sequelize.query(`SELECT NON_UNIQUE AS nonUnique
             FROM information_schema.STATISTICS
            WHERE TABLE_SCHEMA = :schema AND TABLE_NAME = :table AND INDEX_NAME = :index`, { replacements: { schema, table: spec.table, index: spec.index }, type: sequelize_1.QueryTypes.SELECT });
                if (!rows.length || rows.every((r) => Number(r.nonUnique) === 1))
                    continue;
                const cols = spec.columns.map((c) => `\`${c}\``).join(", ");
                await this.sequelize.query(`ALTER TABLE \`${spec.table}\` DROP INDEX \`${spec.index}\`, ADD INDEX \`${spec.index}\` (${cols})`);
                console_1.logger.info("DB", `Relaxed ${spec.table}.${spec.index} from UNIQUE to a plain index`);
            }
            catch (error) {
                console_1.logger.warn("DB", `Could not relax ${spec.table}.${spec.index}: ${(error === null || error === void 0 ? void 0 : error.message) || error}`);
            }
        }
    }
    async dropRedundantConstraints() {
        const schema = process.env.DB_NAME;
        const dupFks = await this.sequelize.query(`SELECT k.TABLE_NAME AS tableName, k.CONSTRAINT_NAME AS constraintName
         FROM information_schema.KEY_COLUMN_USAGE k
         JOIN (
           SELECT TABLE_NAME tn, COLUMN_NAME cn, REFERENCED_TABLE_NAME rt,
                  MIN(CONSTRAINT_NAME) keeper
             FROM information_schema.KEY_COLUMN_USAGE
            WHERE TABLE_SCHEMA = :schema AND REFERENCED_TABLE_NAME IS NOT NULL
            GROUP BY TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME
           HAVING COUNT(*) > 1
         ) d ON d.tn = k.TABLE_NAME AND d.cn = k.COLUMN_NAME
            AND d.rt = k.REFERENCED_TABLE_NAME
        WHERE k.TABLE_SCHEMA = :schema
          AND k.REFERENCED_TABLE_NAME IS NOT NULL
          AND k.CONSTRAINT_NAME <> d.keeper`, { replacements: { schema }, type: sequelize_1.QueryTypes.SELECT });
        const dupIdx = await this.sequelize.query(`WITH idx AS (
         SELECT TABLE_NAME tn, INDEX_NAME iname, NON_UNIQUE nu,
                GROUP_CONCAT(COLUMN_NAME ORDER BY SEQ_IN_INDEX) cols
           FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = :schema
          GROUP BY TABLE_NAME, INDEX_NAME, NON_UNIQUE
       )
       SELECT d.tn AS tableName, d.iname AS indexName
         FROM idx d
         JOIN idx b ON b.tn = d.tn
          AND b.iname = REGEXP_REPLACE(d.iname, '_[0-9]+$', '')
        WHERE d.iname REGEXP '_[0-9]+$'
          AND d.cols = b.cols AND d.nu = b.nu`, { replacements: { schema }, type: sequelize_1.QueryTypes.SELECT });
        let removed = 0;
        for (const fk of dupFks) {
            try {
                await this.sequelize.query(`ALTER TABLE \`${fk.tableName}\` DROP FOREIGN KEY \`${fk.constraintName}\``);
                removed++;
            }
            catch (_a) {
            }
        }
        for (const idx of dupIdx) {
            try {
                await this.sequelize.query(`ALTER TABLE \`${idx.tableName}\` DROP INDEX \`${idx.indexName}\``);
                removed++;
            }
            catch (_b) {
            }
        }
        if (removed > 0) {
            console_1.logger.info("DB", `Removed ${removed} redundant constraint(s) left behind by the alter sync`);
        }
    }
    async syncWithForeignKeyRetries(run, attempts = 3) {
        for (let attempt = 1; attempt <= attempts; attempt++) {
            try {
                await run();
                return;
            }
            catch (error) {
                if (!SequelizeSingleton.isBenignConstraintError(error) || attempt === attempts) {
                    if (!SequelizeSingleton.isBenignConstraintError(error))
                        throw error;
                    console_1.logger.error("DB", `Schema sync could not finish after ${attempts} attempts (${error === null || error === void 0 ? void 0 : error.message}). ` +
                        `The server is starting with the schema possibly behind the models. ` +
                        `If that message names a duplicate KEY, the index already exists and the ` +
                        `schema is fine — look for a second backend lane (dev:web alongside dev:cron) ` +
                        `or a stale nodemon syncing at the same moment. Otherwise look for duplicate ` +
                        `foreign keys — ` +
                        `SELECT TABLE_NAME, COLUMN_NAME, COUNT(*) FROM information_schema.KEY_COLUMN_USAGE ` +
                        `WHERE TABLE_SCHEMA=DATABASE() AND REFERENCED_TABLE_NAME IS NOT NULL ` +
                        `GROUP BY TABLE_NAME, COLUMN_NAME, REFERENCED_TABLE_NAME HAVING COUNT(*)>1 — ` +
                        `drop the duplicates and restart.`);
                    return;
                }
                console_1.logger.warn("DB", `Schema sync hit a foreign-key ordering conflict (${error === null || error === void 0 ? void 0 : error.message}); retrying (${attempt}/${attempts - 1}).`);
            }
        }
    }
    static isBenignConstraintError(error) {
        var _a, _b;
        var _c;
        if (!error)
            return false;
        if (error.name === "SequelizeUnknownConstraintError")
            return true;
        const code = ((_a = error === null || error === void 0 ? void 0 : error.parent) === null || _a === void 0 ? void 0 : _a.code) || ((_b = error === null || error === void 0 ? void 0 : error.original) === null || _b === void 0 ? void 0 : _b.code);
        if (code === "ER_CANT_DROP_FIELD_OR_KEY")
            return true;
        if (code === "ER_DUP_KEYNAME")
            return true;
        const message = String((_c = error === null || error === void 0 ? void 0 : error.message) !== null && _c !== void 0 ? _c : "");
        return (/Can't DROP (FOREIGN KEY|INDEX|CHECK)/i.test(message) ||
            /Constraint .* does not exist/i.test(message) ||
            /Duplicate key name/i.test(message));
    }
    async syncDatabase() {
        var _a;
        try {
            const syncMode = (_a = process.env.DB_SYNC) === null || _a === void 0 ? void 0 : _a.toLowerCase();
            if (syncMode === "none") {
                await this.sequelize.authenticate();
                return;
            }
            const current = this.fingerprintModels();
            if (syncMode === "force") {
                await this.syncSchema({ force: true });
                this.storeManifest(current);
                return;
            }
            if (syncMode === "always") {
                await this.syncSchema({ alter: true });
                this.storeManifest(current);
                return;
            }
            const stored = this.readManifest();
            if (!stored) {
                if (this.getStoredHash() === this.computeModelsHash()) {
                    this.storeManifest(current);
                    await this.sequelize.authenticate();
                    return;
                }
                await this.syncSchema({ alter: true });
                this.storeManifest(current);
                return;
            }
            const changedModels = SequelizeSingleton.diffModels(stored, current);
            if (changedModels.length === 0) {
                await this.sequelize.authenticate();
                return;
            }
            console_1.logger.info("DB", `Schema changed in ${changedModels.length} model(s): ` +
                changedModels.slice(0, 8).join(", ") +
                (changedModels.length > 8 ? `, +${changedModels.length - 8} more` : ""));
            await this.syncChangedModels(changedModels, stored, current);
            this.storeManifest(current);
        }
        catch (error) {
            console_1.logger.error("DB", "Connection failed");
            throw error;
        }
    }
}
exports.SequelizeSingleton = SequelizeSingleton;
SequelizeSingleton.RELAXED_UNIQUE_INDEXES = [
    { table: "wallet", index: "walletAddressLookupKey", columns: ["addressLookupKey"] },
    {
        table: "futures_insurance_ledger",
        index: "futures_insurance_ledger_position_once",
        columns: ["positionId", "type"],
    },
];
exports.db = SequelizeSingleton.getInstance();
exports.sequelize = exports.db.getSequelize();
exports.models = exports.db.models;
exports.default = exports.db;
