import { TableState } from "../types/table";
import { $fetch } from "@/lib/api";
import { ImageUploadError, processImageUploads } from "./image";

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
  id?: string;
  apiEndpoint: string;
  data: any;
  isEdit: boolean;
  columns: ColumnDefinition[];
}) => {
  let processedData: any;

  // Uploads run BEFORE the create/update request, so a failure here means the
  // record was never written. It has its own catch because it is the one
  // failure the caller can attribute to a specific field.
  try {
    processedData = await processImageUploads(data, columns);
  } catch (error: any) {
    if (error instanceof ImageUploadError) {
      return {
        error: error.message,
        validationErrors: { [error.field]: error.message },
      };
    }
    console.error("Error processing image uploads:", error);
    return { error: error?.message || "An unexpected error occurred" };
  }

  try {
    const method = isEdit ? "PUT" : "POST";
    const url = isEdit ? `${apiEndpoint}/${id}` : apiEndpoint;

    const { error, validationErrors } = await $fetch({
      url,
      method,
      body: processedData,
    });

    /**
     * Field errors first, and gated on the errors themselves rather than on
     * the error STRING.
     *
     * This used to read `if (error !== "Validation error") return { error }`,
     * and nothing in `$fetch` ever produces that exact string — every failure
     * path sets the message from the server's own body. So the guard was
     * always true, the `validationErrors` branch below it was unreachable, and
     * a per-field rejection from the API arrived at the form as one anonymous
     * error that no caller rendered. `{ success: true }` was unreachable too.
     */
    if (validationErrors) {
      return { validationErrors, error };
    }
    if (error) {
      return { error };
    }
    return { success: true };
  } catch (error: any) {
    console.error("Error in handleSubmit:", error);
    return { error: error?.message || "An unexpected error occurred" };
  }
};
