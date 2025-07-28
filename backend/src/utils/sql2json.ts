import _ from "lodash";

interface InsertStatement {
  table: string;
  columns: string[];
  values: Record<string, any>[];
}

interface Tables {
  [key: string]: InsertStatement;
}

function sql2json(sql: string, requiredTables: Set<string>): Tables {
  const removeCommentsAndEmptyLines = (sql: string): string => {
    return sql
      .replace(/(?:\/\*(?:[\s\S]*?)\*\/)|(?:([\s;])+\/\/(?:.*)$)/gm, "$1")
      .replace(/^--.*[\r\n]/gm, "")
      .replace(/^\s*[\r\n]/gm, "")
      .replace(/;\s*[\r\n]/gm, ";;")
      .replace(/[\r\n]/gm, " ")
      .replace(/;;\s?/gm, ";\n");
  };

  const parseValues = (
    valuesPart: string,
    columns: string[]
  ): Record<string, any>[] => {
    const valuesRegex = /\(([^)]+)\)/g;
    const values: Record<string, any>[] = [];
    let match: RegExpExecArray | null;

    while ((match = valuesRegex.exec(valuesPart)) !== null) {
      const valueSet = match[1];
      let current: string = "";
      let inString: boolean = false;
      let stringChar: string = "";
      const valuesArray: string[] = [];

      for (let i = 0; i < valueSet.length; i++) {
        const char = valueSet[i];

        if (inString) {
          if (char === stringChar) {
            inString = false;
          }
          current += char;
        } else {
          if (char === '"' || char === "'") {
            inString = true;
            stringChar = char;
            current += char;
          } else if (char === "," && !inString) {
            valuesArray.push(current.trim());
            current = "";
          } else {
            current += char;
          }
        }
      }
      valuesArray.push(current.trim());

      const record: Record<string, any> = {};
      columns.forEach((col, index) => {
        let value: any = valuesArray[index];
        if (value && value.toUpperCase() === "NULL") {
          value = null;
        } else if (value && value.startsWith("{") && value.endsWith("}")) {
          value = JSON.parse(value);
        } else {
          value = _.trim(value, " `'\"");
        }
        record[col] = value;
      });
      values.push(record);
    }

    return values;
  };

  sql = removeCommentsAndEmptyLines(sql);
  const lines: string[] = sql.split(";\n");
  if (lines.length == 0) throw new Error("Empty SQL");

  const tables: Tables = {};
  let line: string | undefined;

  try {
    for (const currentLine of lines) {
      line = currentLine;
      const words: string[] = line.split(/\s+/);
      if (!words.length) continue;

      if (
        words.length >= 4 &&
        words[0].toUpperCase() == "INSERT" &&
        words[1].toUpperCase() == "INTO"
      ) {
        const tableName: string = _.trim(words[2], "`'\"");
        if (!requiredTables.has(tableName)) {
          continue;
        }

        const valuesIndex: number = words.findIndex(
          (word) => word.toUpperCase() === "VALUES"
        );
        if (valuesIndex !== -1) {
          const columnsPart: string = line.slice(
            line.indexOf("(") + 1,
            line.indexOf(")")
          );
          const valuesPart: string = line.slice(line.indexOf("VALUES") + 6);

          const columns: string[] = columnsPart
            .split(",")
            .map((col) => _.trim(col, " `'\""));
          const values: Record<string, any>[] = parseValues(
            valuesPart,
            columns
          );

          if (!tables[tableName]) {
            tables[tableName] = {
              table: tableName,
              columns: columns,
              values: [],
            };
          }

          tables[tableName].values.push(...values);
        } else {
          console.log(
            `Skipping INSERT line (no VALUES keyword found): ${line}`
          );
        }
      } else if (words.length >= 4 && words[0].toUpperCase() == "INSERT") {
        console.log(`Skipping INSERT line: ${line}`);
      }
    }
  } catch (error) {
    console.log(`Error processing line: ${line}`);
    throw new Error(`Error: ${error.message}\n...${line}`);
  }

  return tables;
}

export default sql2json;
