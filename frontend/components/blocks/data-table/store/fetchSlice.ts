import { StateCreator } from "zustand";
import { TableStore } from "../types/table";
import { $fetch } from "@/lib/api";

export interface FetchSlice {
  data: userAttributes[];
  loading: boolean;
  paginationLoading: boolean;
  totalItemsLoading: boolean;
  error: string | null;
  fetchData: () => Promise<void>;
}

export const createFetchSlice: StateCreator<TableStore, [], [], FetchSlice> = (
  set,
  get
) => ({
  data: [],
  loading: false,
  paginationLoading: false,
  totalItemsLoading: false,
  error: null,

  fetchData: async () => {
    const storeState = get();
    if (storeState.loading) return; // Avoid re-fetch if already loading

    set({
      loading: true,
      paginationLoading: true,
      totalItemsLoading: true,
      error: null,
    });

    try {
      // Prepare query params
      const fetchParams: Record<string, any> = {
        page: storeState.page,
        perPage: storeState.pageSize,
      };

      // Sorting: use all sorting items and join them with commas.
      if (storeState.sorting.length > 0) {
        fetchParams.sortField = storeState.sorting.map((s) => s.id).join(",");
        fetchParams.sortOrder = storeState.sorting
          .map((s) => (s.desc ? "desc" : "asc"))
          .join(",");
      }

      // Show deleted
      if (storeState.showDeleted) {
        fetchParams.showDeleted = true;
      }

      // Filters
      if (Object.keys(storeState.filters).length > 0) {
        const processedFilters = Object.entries(storeState.filters).reduce(
          (acc, [key, value]) => {
            if (value !== undefined && value !== null) {
              if (typeof value === "object") {
                if ("value" in value && value.value !== "") {
                  acc[key] = {
                    value: value.value,
                    operator: value.operator || "equal",
                  };
                }
              } else {
                acc[key] = { value, operator: "contains" };
              }
            }
            return acc;
          },
          {} as Record<string, any>
        );

        if (Object.keys(processedFilters).length > 0) {
          fetchParams.filter = JSON.stringify(processedFilters);
        }
      }

      // Get apiEndpoint
      const { apiEndpoint } = storeState;
      if (!apiEndpoint) {
        throw new Error("No apiEndpoint is set in the store!");
      }

      // Destructure what $fetch returns: { data, error }
      const { data, error } = await $fetch({
        silent: true,
        url: apiEndpoint,
        params: fetchParams,
      });

      // If there's an error, throw
      if (error) {
        throw new Error(error);
      }

      // Check if data has 'items'
      if (!data || !data.items) {
        throw new Error("Invalid response from server");
      }

      // Save to state
      set({
        data: data.items,
        totalItems: data.pagination?.totalItems ?? 0,
        totalPages: data.pagination?.totalPages ?? 0,
      });
    } catch (err) {
      console.error("Error fetching data:", err);
      set({
        error:
          err instanceof Error
            ? err.message
            : "An error occurred while fetching data",
        data: [],
        totalItems: 0,
        totalPages: 0,
      });
    } finally {
      set({
        loading: false,
        paginationLoading: false,
        totalItemsLoading: false,
      });
    }
  },
});
