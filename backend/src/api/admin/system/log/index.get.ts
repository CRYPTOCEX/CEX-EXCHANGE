// File: /server/api/admin/logs/index.get.ts

import { crudParameters } from "@b/utils/constants";
import { promises as fs } from "fs";
import { join } from "path";
import { operatorMap } from "./utils";
import { sanitizePath } from "@b/utils/validation";

export const metadata: OperationObject = {
  summary: "Fetches log files based on category and date",
  operationId: "fetchLogFiles",
  tags: ["Admin", "Logs"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Log entries for the given category and date",
      content: {
        "application/json": {
          schema: {
            type: "object",
            properties: {
              items: {
                type: "array",
                items: { type: "object", additionalProperties: true },
              },
              pagination: {
                type: "object",
                properties: {
                  totalItems: { type: "number" },
                  currentPage: { type: "number" },
                  perPage: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
            },
          },
        },
      },
    },
    400: {
      description: "Bad request if the category or date are not specified",
    },
    404: { description: "Not found if the log file does not exist" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "view.system.log",
};

export default async (data: Handler) => {
  const { query } = data;
  return getFilteredLogs(query);
};

/**
 * Reads a log file based on a date (defaulting to today), then applies filtering,
 * sorting (by a specified field and order), and pagination to return a structured response.
 */
export async function getFilteredLogs(query: any) {
  // Pagination defaults
  const page = query.page ? parseInt(query.page) : 1;
  const perPage = query.perPage ? parseInt(query.perPage) : 10;
  const sortField = query.sortField || "timestamp";
  const sortOrder = query.sortOrder || "asc";

  // Parse filter parameter if provided
  let filters: Record<string, any> = {};
  try {
    filters = query.filter ? JSON.parse(query.filter) : {};
  } catch (error) {
    console.error("Error parsing filter:", error);
  }

  // Use a 'date' filter (if provided) to choose the log file; default to today's date.
  const date = filters.date?.value || new Date().toISOString().split("T")[0];
  delete filters.date; // Remove date from filters so it isn't applied on log entries

  // Sanitize the date to prevent local file inclusion vulnerabilities
  const sanitizedDate = sanitizePath(date);
  const logFilePath = join(process.cwd(), "logs", `${sanitizedDate}.log`);

  let fileData: string;
  try {
    fileData = await fs.readFile(logFilePath, { encoding: "utf8" });
  } catch (error: any) {
    console.error(`Error reading log file: ${error.message}`);
    if (error.code === "ENOENT") {
      return {
        items: [],
        pagination: {
          totalItems: 0,
          currentPage: page,
          perPage,
          totalPages: 0,
        },
      };
    }
    throw error;
  }

  // Split file data into individual lines and parse each line as JSON.
  // Each log entry gets an 'id' based on its index.
  let logs = fileData
    .split("\n")
    .filter((line) => line.trim())
    .map((line, index) => {
      try {
        const parsedLine = JSON.parse(line);
        return { id: index.toString(), ...parsedLine };
      } catch (parseError) {
        console.error(`Error parsing log line: ${line}`);
        return null;
      }
    })
    .filter(Boolean) as Record<string, any>[];

  // Apply filters using the operator functions from operatorMap.
  logs = logs.filter((log) =>
    Object.entries(filters).every(([key, filter]) => {
      let filterValue: any, operator: string;
      if (typeof filter === "object" && filter.operator) {
        operator = filter.operator;
        filterValue = filter.value;
      } else {
        operator = "equal";
        filterValue = filter;
      }
      const operation = operatorMap[operator];
      return typeof operation === "function"
        ? operation(log, key, filterValue)
        : log[key] == filterValue;
    })
  );

  // Sort logs by the provided sortField and sortOrder.
  logs.sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // Paginate the results.
  const totalItems = logs.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const offset = (page - 1) * perPage;
  const paginatedItems = logs.slice(offset, offset + perPage);

  return {
    items: paginatedItems,
    pagination: {
      totalItems,
      currentPage: page,
      perPage,
      totalPages,
    },
  };
}
