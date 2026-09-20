import { create } from "zustand";
import { persist } from "zustand/middleware";
import { createSelectors } from "../utils/selectors";

import {
  TableStore,
  Sorting,
  TablePermissions,
  TableConfig,
  KpiConfig,
} from "../types/table";

import { createPaginationSlice, PaginationSlice } from "./paginationSlice";
import { createFetchSlice, FetchSlice } from "./fetchSlice";
import { createSortingSlice, SortingSlice } from "./sortingSlice";
import { createFiltersSlice, FiltersSlice } from "./filtersSlice";
import { createSelectionSlice, SelectionSlice } from "./selectionSlice";
import { createActionsSlice, ActionsSlice } from "./actionsSlice";
import {
  createColumnVisibilitySlice,
  ColumnVisibilitySlice,
} from "./columnVisibilitySlice";
import { createPermissionsSlice, PermissionsSlice } from "./permissionsSlice";
import { createAnalyticsSlice, AnalyticsSlice } from "./analyticsSlice";
import { createViewSlice, ViewSlice } from "./viewSlice";
import { createViewModeSlice, ViewModeSlice } from "./viewModeSlice";

import { checkPermission } from "../utils/permissions";
import { useUserStore } from "@/store/user";
import { getSortableFields } from "../utils/sorting";

// 1) Initial State
const initialState = {
  model: "",
  modelConfig: {},

  data: [] as userAttributes[],
  page: 1,
  pageSize: 12,
  totalItems: 0,
  totalPages: 0,

  sorting: [] as Sorting[],
  filters: {},
  selectedRows: [] as string[],
  showDeleted: false,
  showDeletedLoading: false,

  columns: [] as ColumnDefinition[],
  visibleColumns: [] as string[],

  permissions: {
    access: "",
    view: "",
    create: "",
    edit: "",
    delete: "",
  } as TablePermissions,
  hasAccessPermission: false,
  hasViewPermission: false,
  hasCreatePermission: false,
  hasEditPermission: false,
  hasDeletePermission: false,
  initialized: false,

  tableConfig: {
    canCreate: true,
    canEdit: true,
    canDelete: true,
    canView: true,
    isParanoid: true,
    createLink: undefined,
    editLink: undefined,
    viewLink: undefined,
    onCreateClick: undefined,
    onEditClick: undefined,
    onViewClick: undefined,
  } as TableConfig,

  kpis: [] as KpiConfig[],

  loading: false,
  paginationLoading: false,
  totalItemsLoading: false,
  error: null as string | null,

  selectedRow: null as any,
  isCreateDrawerOpen: false,
  isEditDrawerOpen: false,

  availableSortingOptions: [] as { id: string; label: string }[],
  currentSortLabel: null as string | null,

  // Add apiEndpoint field if you want to store it
  apiEndpoint: "" as string,

  // View state (for create/edit views instead of drawers)
  currentView: "overview" as "overview" | "analytics" | "create" | "edit",
  previousView: "overview" as "overview" | "analytics" | "create" | "edit",
  editingRowId: null as string | null,

  // Form state for premium header integration
  formState: {
    isSubmitting: false,
    isDirty: false,
    onSubmit: null as (() => void) | null,
    onCancel: null as (() => void) | null,
  },

  // Design config for premium header
  designConfig: null as any,

  // View mode (table vs card)
  viewMode: "table" as "table" | "card",
  autoSwitchViewMode: true,
};

// 2) Create Store
export const useTableStore = createSelectors(
  create<
    TableStore &
      PaginationSlice &
      FetchSlice &
      SortingSlice &
      FiltersSlice &
      SelectionSlice &
      ActionsSlice &
      ColumnVisibilitySlice &
      PermissionsSlice &
      AnalyticsSlice &
      ViewSlice &
      ViewModeSlice
  >()(
    persist(
      (set, get, store) => ({
        ...initialState,

        // Slices
        ...createPaginationSlice(set, get, store),
        ...createFetchSlice(set, get, store),
        ...createSortingSlice(set, get, store),
        ...createFiltersSlice(set, get, store),
        ...createSelectionSlice(set, get, store),
        ...createActionsSlice(set, get, store),
        ...createColumnVisibilitySlice(set, get, store),
        ...createPermissionsSlice(set, get, store),
        ...createAnalyticsSlice(set, get, store),
        ...createViewSlice(set, get, store),
        ...createViewModeSlice(set, get, store),

        // Additional inline methods
        setShowDeleted: async (showDeleted) => {
          set({
            showDeletedLoading: true,
            totalItemsLoading: true,
            selectedRows: [],
          });
          set({ showDeleted });
          await get().fetchData();
          set({ showDeletedLoading: false, totalItemsLoading: false });
        },

        setPermissions: (permissions) => {
          const user = useUserStore.getState().user;
          /* An absent key is equivalent to `""`, and the two halves default in
             opposite directions: `access`/`view` open the table, so their
             absence ALLOWS, while the mutation keys gate a button, so their
             absence DENIES. This mirrors `initializePermissions` exactly —
             without the guards an unset `access` resolved to `false` here and
             `true` there, so the same props produced a working table via one
             entry point and an empty one via the other. */
          const hasAccessPermission = permissions.access
            ? checkPermission(user, permissions.access)
            : true;
          const hasViewPermission = permissions.view
            ? checkPermission(user, permissions.view)
            : true;
          const hasCreatePermission = permissions.create
            ? checkPermission(user, permissions.create)
            : false;

          set({
            initialized: true,
            permissions,
            hasAccessPermission,
            hasViewPermission,
            hasCreatePermission,
            hasEditPermission: permissions.edit
              ? checkPermission(user, permissions.edit)
              : false,
            hasDeletePermission: permissions.delete
              ? checkPermission(user, permissions.delete)
              : false,
          });

          if (hasAccessPermission && hasViewPermission) {
            get().fetchData();
          }
        },

        reset: () => {
          // Preserve viewMode across resets (user preference should persist)
          const currentViewMode = get().viewMode;
          set({ ...initialState, viewMode: currentViewMode });
        },

        setTableConfig: (config) => set({ tableConfig: config }),

        setPaginationLoading: (loading) => set({ paginationLoading: loading }),
        setTotalItemsLoading: (loading: boolean) =>
          set({ totalItemsLoading: loading }),
        setShowDeletedLoading: (loading: boolean) =>
          set({ showDeletedLoading: loading }),

        setColumns: (newColumns) => {
          const filteredKeys = newColumns
            .filter((col) => col.key !== "select" && col.key !== "actions")
            .map((col) => col.key);

          const sortFields = getSortableFields(newColumns);

          set({
            columns: newColumns,
            visibleColumns: filteredKeys,
            availableSortingOptions: sortFields,
          });
        },

        setKpis: (kpis) => set({ kpis }),

        setData: (data: userAttributes[]) => set({ data }),
        setLoading: (loading: boolean) => set({ loading }),
        setError: (error: string | null) => set({ error }),

        // Add a method to set the store's apiEndpoint
        setApiEndpoint: (endpoint: string) => {
          set({ apiEndpoint: endpoint });
        },

        setModel: (modelName: string) => {
          set({ model: modelName });
        },

        setModelConfig: (config?: Record<string, any>) => {
          set({ modelConfig: config });
          // MERGE, not overwrite. This used to be `set({ filters: config })`,
          // so a table that supplied both a `modelConfig` predicate and an
          // opening filter kept only whichever setter ran last and silently
          // queried on half its intended scope.
          if (config)
            set((state) => ({ filters: { ...state.filters, ...config } }));
        },

        setDesignConfig: (config: any) => {
          set({ designConfig: config });
        },
      }),
      {
        name: "table-storage",
        /**
         * Bumped when a key is REMOVED from `partialize`.
         *
         * Dropping a key from `partialize` only stops new writes — `persist`
         * still rehydrates whatever is already in `localStorage` and merges it
         * over the initial state. So when `analyticsData`, `analyticsConfig`,
         * `analyticsLoading` and `analyticsError` stopped being persisted,
         * every browser that had already stored them kept restoring them on
         * load: stale figures from another table, and in the worst case a
         * `analyticsLoading: true` that no fetch would ever resolve. The change
         * looked like it had not shipped, because for anyone with existing
         * storage it effectively had not.
         *
         * `migrate` runs once per browser and strips them.
         */
        version: 2,
        migrate: (persisted: any, from: number) => {
          if (!persisted || from >= 2) return persisted;
          const {
            analyticsData,
            analyticsConfig,
            analyticsLoading,
            analyticsError,
            ...rest
          } = persisted;
          return rest;
        },
        partialize: (state) => ({
          // Persist whichever fields you want
          model: state.model,
          sorting: state.sorting,
          filters: state.filters,
          showDeleted: state.showDeleted,
          visibleColumns: state.visibleColumns,
          permissions: state.permissions,
          tableConfig: state.tableConfig,
          selectedRow: state.selectedRow,
          columns: state.columns,
          hasCreatePermission: state.hasCreatePermission,
          initialized: state.initialized,
          hasAccessPermission: state.hasAccessPermission,
          hasViewPermission: state.hasViewPermission,
          hasEditPermission: state.hasEditPermission,
          hasDeletePermission: state.hasDeletePermission,
          analyticsTab: state.analyticsTab,
          /**
           * `analyticsConfig`, `analyticsData`, `analyticsLoading` and
           * `analyticsError` are deliberately NOT persisted.
           *
           * `useTableStore` is a module-level singleton with ONE
           * `table-storage` key shared by every table in the admin, and all
           * four of these are per-table request state:
           *
           *  - a persisted `analyticsError` re-rendered `ErrorState` from a
           *    PREVIOUS SESSION, before any fetch had been attempted;
           *  - a persisted `analyticsLoading: true` (written the moment a
           *    fetch starts, so any navigation mid-flight froze it) left the
           *    cards in skeleton on the next load, with nothing in flight to
           *    resolve them;
           *  - `analyticsData` and `analyticsConfig` belong to whichever table
           *    rendered last, so opening a different one painted its KPI values
           *    under this page's labels until the fetch returned.
           *
           * `index.tsx` sets the config from its prop and calls
           * `resetAnalyticsData()` on mount, so there is nothing to restore.
           * `analyticsTab` stays — a tab choice is a real preference.
           */
          apiEndpoint: state.apiEndpoint,
          // View mode (table vs card)
          viewMode: state.viewMode,
          autoSwitchViewMode: state.autoSwitchViewMode,
          // View state (don't persist create/edit views - always start at overview)
          // currentView: state.currentView,
          // previousView: state.previousView,
          // editingRowId: state.editingRowId,
        }),
      }
    )
  )
);
