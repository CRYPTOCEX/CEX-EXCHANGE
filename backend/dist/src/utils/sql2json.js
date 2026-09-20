"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const console_1 = require("./console");
const error_1 = require("./error");
function sql2json(sql, requiredTables) {
    const removeCommentsAndEmptyLines = (sql) => {
        return sql
            .replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, "$1")
            .replace(/^--.*[\r\n]/gm, "")
            .replace(/^\s*[\r\n]/gm, "")
            .replace(/;\s*[\r\n]/gm, ";;")
            .replace(/[\r\n]/gm, " ")
            .replace(/;;\s?/gm, ";\n");
    };
    const parseValues = (valuesPart, columns) => {
        const valuesRegex = /\(([^)]+)\)/g;
        const values = [];
        let match;
        while ((match = valuesRegex.exec(valuesPart)) !== null) {
            const valueSet = match[1];
            let current = "";
            let inString = false;
            let stringChar = "";
            const valuesArray = [];
            for (let i = 0; i < valueSet.length; i++) {
                const char = valueSet[i];
                if (inString) {
                    if (char === stringChar) {
                        inString = false;
                    }
                    current += char;
                }
                else {
                    if (char === '"' || char === "'") {
                        inString = true;
                        stringChar = char;
                        current += char;
                    }
                    else if (char === "," && !inString) {
                        valuesArray.push(current.trim());
                        current = "";
                    }
                    else {
                        current += char;
                    }
                }
            }
            valuesArray.push(current.trim());
            const record = {};
            columns.forEach((col, index) => {
                let value = valuesArray[index];
                if (value && value.toUpperCase() === "NULL") {
                    value = null;
                }
                else if (value && value.startsWith("{") && value.endsWith("}")) {
                    value = JSON.parse(value);
                }
                else {
                    value = lodash_1.default.trim(value, " `'\"");
                }
                record[col] = value;
            });
            values.push(record);
        }
        return values;
    };
    sql = removeCommentsAndEmptyLines(sql);
    const lines = sql.split(";\n");
    if (lines.length == 0)
        throw (0, error_1.createError)({ statusCode: 400, message: "Empty SQL" });
    const tables = {};
    let line;
    try {
        for (const currentLine of lines) {
            line = currentLine;
            const words = line.split(/\s+/);
            if (!words.length)
                continue;
            if (words.length >= 4 &&
                words[0].toUpperCase() == "INSERT" &&
                words[1].toUpperCase() == "INTO") {
                const tableName = lodash_1.default.trim(words[2], "`'\"");
                if (!requiredTables.has(tableName)) {
                    continue;
                }
                const valuesIndex = words.findIndex((word) => word.toUpperCase() === "VALUES");
                if (valuesIndex !== -1) {
                    const columnsPart = line.slice(line.indexOf("(") + 1, line.indexOf(")"));
                    const valuesPart = line.slice(line.indexOf("VALUES") + 6);
                    const columns = columnsPart
                        .split(",")
                        .map((col) => lodash_1.default.trim(col, " `'\""));
                    const values = parseValues(valuesPart, columns);
                    if (!tables[tableName]) {
                        tables[tableName] = {
                            table: tableName,
                            columns: columns,
                            values: [],
                        };
                    }
                    tables[tableName].values.push(...values);
                }
                else {
                    console_1.logger.debug("SQL2JSON", `Skipping INSERT line (no VALUES keyword found): ${line}`);
                }
            }
            else if (words.length >= 4 && words[0].toUpperCase() == "INSERT") {
                console_1.logger.debug("SQL2JSON", `Skipping INSERT line: ${line}`);
            }
        }
    }
    catch (error) {
        console_1.logger.error("SQL2JSON", `Error processing line: ${line}`);
        throw (0, error_1.createError)({ statusCode: 400, message: `Error: ${error.message} at line: ${line}` });
    }
    return tables;
}
exports.default = sql2json;
