import { TableState } from "../types/table";
import { $fetch } from "@/lib/api";
import { processImageUploads } from "./image";

/**
 * Creates an API URL with query parameters based on the table state.
 */
export const createApiUrl = (
  apiEndpoint: string,
  state: Partial<TableState>
): string => {
  const params = new URLSearchParams({
    page: state.page?.toString() || "1",
    perPage: state.pageSize?.toString() || "10",
    sortField: state.sortField || "",
    sortOrder: state.sortOrder || "",
    filter: JSON.stringify(state.filters || {}),
    showDeleted: (state.showDeleted || false).toString(),
  });
  return `${apiEndpoint}?${params.toString()}`;
};

/**
 * Fetches table data from the given API endpoint using the table state.
 */
export const fetchTableData = async (
  apiEndpoint: string,
  state: Partial<TableState>
) => {
  const url = createApiUrl(apiEndpoint, state);
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error("Failed to fetch data");
  }
  return response.json();
};

/**
 * Handles form submission by processing image uploads and then sending the data
 * via a POST (for create) or PUT (for edit) request.
 */
export const handleSubmit = async ({
  id,
  apiEndpoint,
  data,
  isEdit,
  columns,
}: {
  id: string;
  apiEndpoint: string;
  data: any;
  isEdit: boolean;
  columns: ColumnDefinition[];
}) => {
  try {
    // Process any image fields before submission.
    const processedData = await processImageUploads(data, columns);

    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${apiEndpoint}/${id}` : apiEndpoint;

    const { error, validationErrors } = await $fetch({
      url,
      method,
      body: processedData,
    });

    if (error !== "Validation error") {
      return { error: error };
    }
    if (validationErrors) {
      return { validationErrors: validationErrors };
    }
    return { success: true };
  } catch (error) {
    console.error("Error in handleSubmit:", error);
    return { error: "An unexpected error occurred" };
  }
};
