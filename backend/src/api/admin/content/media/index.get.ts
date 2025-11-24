import { crudParameters } from "@b/utils/constants";
import { cacheInitialized, initMediaWatcher, mediaCache } from "./utils";
import { operatorMap } from "../../system/log/utils";

export const metadata: OperationObject = {
  summary: "Fetches media files based on category and date",
  operationId: "fetchMediaFiles",
  tags: ["Admin", "Content", "Media"],
  parameters: crudParameters,
  responses: {
    200: {
      description: "Media entries for the given category and date",
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
      description:
        "Bad request if the category or date are not specified or filter parsing fails",
    },
    404: { description: "Not found if the media file does not exist" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
  permission: "view.content.media",
};

export default async (data: any) => {
  // Ensure media cache is initialized
  if (!cacheInitialized) await initMediaWatcher();

  const { query } = data;
  const page = query.page ? parseInt(query.page) : 1;
  const perPage = query.perPage ? parseInt(query.perPage) : 10;
  const sortField = query.sortField || "name";
  const sortOrder = query.sortOrder || "asc";

  // For media files, treat width and height as numeric
  const numericFields = ["width", "height"];

  // Parse the filter payload (e.g. filter: {"id": {"value": "17", "operator": "startsWith"}})
  let filters: Record<string, any> = {};
  try {
    filters = query.filter ? JSON.parse(query.filter) : {};
  } catch (error) {
    console.error("Error parsing filter:", error);
    // Optionally: return a 400 error here.
  }

  // 1) Convert the raw filter param into nested + direct filter objects
  const rawFilter = parseFilterParam(query.filter, numericFields);
  const { directFilters } = buildNestedFilters(rawFilter);

  // 2) Filter the in-memory mediaCache
  const filteredMedia = mediaCache.filter((file) => {
    // Only include image files
    if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file.path)) return false;

    // Check each direct filter
    return Object.entries(directFilters).every(([key, filterValue]) => {
      if (
        filterValue &&
        typeof filterValue === "object" &&
        "operator" in filterValue
      ) {
        // The user specified an operator: e.g. { value: "17", operator: "startsWith" }
        const { value, operator } = filterValue;
        const opFunc = operatorMap[operator];
        if (typeof opFunc !== "function") return true; // skip if no operator func

        // If it's a numeric field, parse both sides as numbers
        if (numericFields.includes(key)) {
          const recordVal = Number(file[key]);
          const filterVal = parseFloat(value);
          return opFunc({ [key]: recordVal }, key, filterVal);
        } else {
          // Otherwise, treat them as strings (or whatever your operator expects)
          return opFunc(file, key, value);
        }
      } else {
        // Fallback: simple equality check
        // For numeric fields, parse as number
        if (numericFields.includes(key)) {
          return Number(file[key]) === Number(filterValue);
        } else {
          return file[key] == filterValue;
        }
      }
    });
  });

  // 3) Sort the filtered media by the specified sortField + sortOrder
  filteredMedia.sort((a, b) => {
    // If it's numeric, parse as number to avoid string-sorting
    const aVal = numericFields.includes(sortField)
      ? Number(a[sortField])
      : a[sortField];
    const bVal = numericFields.includes(sortField)
      ? Number(b[sortField])
      : b[sortField];

    if (aVal < bVal) return sortOrder === "asc" ? -1 : 1;
    if (aVal > bVal) return sortOrder === "asc" ? 1 : -1;
    return 0;
  });

  // 4) Paginate
  const totalItems = filteredMedia.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const offset = (page - 1) * perPage;
  const paginatedItems = filteredMedia.slice(offset, offset + perPage);

  return {
    items: paginatedItems,
    pagination: {
      totalItems,
      currentPage: page,
      perPage,
      totalPages,
    },
  };
};

// -----------------------------------
// Helper Functions
// -----------------------------------

export function parseFilterParam(
  filterParam: string | string[] | undefined,
  numericFields: string[]
): { [key: string]: any } {
  const parsedFilters: { [key: string]: any } = {};
  if (!filterParam) return parsedFilters;

  let filtersObject = {};
  if (typeof filterParam === "string") {
    try {
      filtersObject = JSON.parse(filterParam);
    } catch (error) {
      console.error("Error parsing filter param:", error);
      return parsedFilters;
    }
  }

  // Copy the filter structure into parsedFilters
  Object.entries(filtersObject as { [key: string]: any }).forEach(
    ([key, value]) => {
      const keyParts = key.split(".");
      let current = parsedFilters;
      keyParts.slice(0, -1).forEach((part) => {
        current[part] = current[part] || {};
        current = current[part];
      });
      // Assign value directly
      current[keyParts[keyParts.length - 1]] = value;
    }
  );

  return parsedFilters;
}

function buildNestedFilters(filters: { [key: string]: any }) {
  const nestedFilters: { [key: string]: any } = {};
  const directFilters: { [key: string]: any } = {};

  Object.entries(filters).forEach(([fullKey, value]) => {
    // If it's a boolean or an operator-based object => direct
    if (
      typeof value === "boolean" ||
      (typeof value === "object" && "operator" in value && "value" in value)
    ) {
      directFilters[fullKey] = value;
    } else {
      // Otherwise, it's a nested filter
      const keys = fullKey.split(".");
      let current = nestedFilters;
      for (let i = 0; i < keys.length - 1; i++) {
        const k = keys[i];
        current[k] = current[k] || {};
        current = current[k];
      }
      current[keys[keys.length - 1]] = value;
    }
  });

  return { nestedFilters: applyOperatorMapping(nestedFilters), directFilters };
}

function applyOperatorMapping(filters: { [key: string]: any }): {
  [key: string]: any;
} {
  const whereClause: { [key: string]: any } = {};

  const processFilters = (
    currentFilters: { [key: string]: any },
    parentObject: { [key: string]: any }
  ) => {
    Object.entries(currentFilters).forEach(([key, value]) => {
      if (
        value &&
        typeof value === "object" &&
        value.operator &&
        operatorMap[value.operator]
      ) {
        // Keep operator + value as is
        parentObject[key] = { operator: value.operator, value: value.value };
      } else if (value && typeof value === "object" && !value.operator) {
        // Recurse deeper
        parentObject[key] = {};
        processFilters(value, parentObject[key]);
      } else {
        parentObject[key] = value;
      }
    });
  };

  processFilters(filters, whereClause);
  return whereClause;
}
