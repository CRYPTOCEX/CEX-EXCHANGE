import { crudParameters } from "@b/utils/constants";
import {
  cacheInitialized,
  initMediaWatcher,
  mediaCache,
  operatorMap,
} from "@b/api/admin/content/media/utils";
import { logger } from "@b/utils/console";

export const metadata: OperationObject = {
  summary: "Fetches user's own media files",
  operationId: "fetchUserMediaFiles",
  tags: ["User", "Media"],
  parameters: [
    ...crudParameters,
    {
      name: "uploadDir",
      in: "query",
      description: "The upload directory to filter by",
      schema: { type: "string" },
    },
  ],
  responses: {
    200: {
      description: "Media entries for the user",
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
    401: { description: "Unauthorized" },
    500: { description: "Internal server error" },
  },
  requiresAuth: true,
};

export default async (data: any) => {
  const { query, user, ctx } = data;

  if (!user) {
    throw new Error("User not authenticated");
  }

  ctx?.step("Initializing media cache");
  if (!cacheInitialized) await initMediaWatcher();

  ctx?.step("Parsing query parameters");
  const page = query.page ? parseInt(query.page) : 1;
  const perPage = query.perPage ? parseInt(query.perPage) : 50;
  const sortField = query.sortField || "dateModified";
  const sortOrder = query.sortOrder || "desc";
  const uploadDir = query.uploadDir || "";

  // For media files, treat width and height as numeric
  const numericFields = ["width", "height"];

  // Build filter criteria
  ctx?.step("Building filter criteria");
  const rawFilter = parseFilterParam(query.filter, numericFields);
  const { directFilters } = buildNestedFilters(rawFilter);

  // Filter the in-memory mediaCache - ONLY show files in the specified upload directory
  ctx?.step("Filtering user media files");
  const filteredMedia = mediaCache.filter((file) => {
    // Only include image files
    if (!/\.(jpg|jpeg|png|gif|webp)$/i.test(file.path)) return false;

    // Filter by upload directory if specified
    // Note: uploadDir uses hyphens (e.g., "blog-posts") but upload endpoint converts them to slashes
    if (uploadDir) {
      const normalizedDir = uploadDir.replace(/-/g, "/");
      const expectedPath = `/uploads/${normalizedDir}/`;
      if (!file.path.startsWith(expectedPath)) return false;
    }

    // Check each direct filter
    return Object.entries(directFilters).every(([key, filterValue]) => {
      if (
        filterValue &&
        typeof filterValue === "object" &&
        "operator" in filterValue
      ) {
        const { value, operator } = filterValue;
        const opFunc = operatorMap[operator];
        if (typeof opFunc !== "function") return true;

        if (numericFields.includes(key)) {
          const recordVal = Number(file[key]);
          const filterVal = parseFloat(value);
          return opFunc({ [key]: recordVal }, key, filterVal);
        } else {
          return opFunc(file, key, value);
        }
      } else {
        if (numericFields.includes(key)) {
          return Number(file[key]) === Number(filterValue);
        } else {
          return file[key] == filterValue;
        }
      }
    });
  });

  // Sort the filtered media
  ctx?.step("Sorting results");
  filteredMedia.sort((a, b) => {
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

  // Paginate
  ctx?.step("Paginating results");
  const totalItems = filteredMedia.length;
  const totalPages = Math.ceil(totalItems / perPage);
  const offset = (page - 1) * perPage;
  const paginatedItems = filteredMedia.slice(offset, offset + perPage);

  ctx?.success(
    `Retrieved ${paginatedItems.length} media file(s) (page ${page} of ${totalPages})`
  );
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

// Helper Functions
function parseFilterParam(
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
      logger.error("USER_MEDIA", "Error parsing filter param", error);
      return parsedFilters;
    }
  }

  Object.entries(filtersObject as { [key: string]: any }).forEach(
    ([key, value]) => {
      const keyParts = key.split(".");
      let current = parsedFilters;
      keyParts.slice(0, -1).forEach((part) => {
        current[part] = current[part] || {};
        current = current[part];
      });
      current[keyParts[keyParts.length - 1]] = value;
    }
  );

  return parsedFilters;
}

function buildNestedFilters(filters: { [key: string]: any }) {
  const nestedFilters: { [key: string]: any } = {};
  const directFilters: { [key: string]: any } = {};

  Object.entries(filters).forEach(([fullKey, value]) => {
    if (
      typeof value === "boolean" ||
      (typeof value === "object" && "operator" in value && "value" in value)
    ) {
      directFilters[fullKey] = value;
    } else {
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

  return { nestedFilters, directFilters };
}
