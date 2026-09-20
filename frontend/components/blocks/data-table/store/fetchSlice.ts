import { StateCreator } from "zustand";
import { TableStore } from "../types/table";
import { $fetch } from "@/lib/api";

export interface FetchSlice {
  data: userAttributes[];
  loading: boolean;
  paginationLoading: boolean;
  totalItemsLoading: boolean;
  error: string | null;
  /**
   * Rows supplied by the caller instead of by the API. `null` (the default) is
   * every real table — see the note on the short-circuit in `fetchData`.
   */
  staticRows: any[] | null;
  setStaticRows: (rows: any[] | null) => void;
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
  staticRows: null,

  setStaticRows: (staticRows) => set({ staticRows }),

  fetchData: async () => {
    const storeState = get();
    if (storeState.loading) return; // Avoid re-fetch if already loading

    /* CALLER-SUPPLIED ROWS — the design specimen, and nothing else so far.
       ----------------------------------------------------------------------
       `apiEndpoint` is required and the throw below is deliberate, so a table
       has always needed a live endpoint. The component specimen page
       (`/admin/design/specimen`) cannot have one: it exists to judge row
       height, striping and cell padding, and a real endpoint would make that
       judgement depend on whether the operator's database happens to have rows
       today — an empty table shows none of it. Standing up a fake admin
       endpoint to serve mock rows would be worse: a route, a permission and a
       controller, all shipped to production, to draw a swatch.

       Paginated in memory rather than returned whole, so the pagination bar
       renders with real numbers and is itself judgeable. Sorting and filtering
       are deliberately NOT applied — this is a rendering fixture, not a second
       query engine, and a divergent one would be worse than none. */
    if (storeState.staticRows) {
      const rows = storeState.staticRows;
      const size = storeState.pageSize || rows.length || 1;
      const start = ((storeState.page || 1) - 1) * size;
      set({
        data: rows.slice(start, start + size) as userAttributes[],
        totalItems: rows.length,
        totalPages: Math.max(1, Math.ceil(rows.length / size)),
        loading: false,
        paginationLoading: false,
        totalItemsLoading: false,
        error: null,
      });
      return;
    }

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
