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

import { checkPermission } from "../utils/permissions";
import { useUserStore } from "@/store/user";
import { getSortableFields } from "../utils/sorting";

// 1) Initial State
const initialState = {
  model: "",
  modelConfig: {},

  data: [] as userAttributes[],
  page: 1,
  pageSize: 10,
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

  isCreateDrawerOpen: false,
  isEditDrawerOpen: false,
  selectedRow: null as any,

  availableSortingOptions: [] as { id: string; label: string }[],
  currentSortLabel: null as string | null,

  // Add apiEndpoint field if you want to store it
  apiEndpoint: "" as string,
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
      AnalyticsSlice
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
          const hasAccessPermission = checkPermission(user, permissions.access);
          const hasViewPermission = checkPermission(user, permissions.view);
          const hasCreatePermission = checkPermission(user, permissions.create);

          set({
            initialized: true,
            permissions,
            hasAccessPermission,
            hasViewPermission,
            hasCreatePermission,
            hasEditPermission: checkPermission(user, permissions.edit),
            hasDeletePermission: checkPermission(user, permissions.delete),
          });

          if (hasAccessPermission && hasViewPermission) {
            get().fetchData();
          }
        },

        reset: () => {
          set({ ...initialState });
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

        setCreateDrawerOpen: (isOpen: boolean) =>
          set({ isCreateDrawerOpen: isOpen }),

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
          if (config) set({ filters: config });
        },
      }),
      {
        name: "table-storage",
        partialize: (state) => ({
          // Persist whichever fields you want
          model: state.model,
          sorting: state.sorting,
          filters: state.filters,
          showDeleted: state.showDeleted,
          visibleColumns: state.visibleColumns,
          permissions: state.permissions,
          tableConfig: state.tableConfig,
          isCreateDrawerOpen: state.isCreateDrawerOpen,
          isEditDrawerOpen: state.isEditDrawerOpen,
          selectedRow: state.selectedRow,
          columns: state.columns,
          hasCreatePermission: state.hasCreatePermission,
          initialized: state.initialized,
          hasAccessPermission: state.hasAccessPermission,
          hasViewPermission: state.hasViewPermission,
          hasEditPermission: state.hasEditPermission,
          hasDeletePermission: state.hasDeletePermission,
          analyticsTab: state.analyticsTab,
          analyticsConfig: state.analyticsConfig,
          analyticsData: state.analyticsData,
          analyticsLoading: state.analyticsLoading,
          analyticsError: state.analyticsError,
          apiEndpoint: state.apiEndpoint,
        }),
      }
    )
  )
);
