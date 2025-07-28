// actionsSlice.ts
import { StateCreator } from "zustand";
import { TableStore } from "../types/table";
import { $fetch } from "@/lib/api";

export interface ActionsSlice {
  isCreateDrawerOpen: boolean;
  isEditDrawerOpen: boolean;
  selectedRow: any | null;

  setCreateDrawerOpen: (isOpen: boolean) => void;
  setEditDrawerOpen: (isOpen: boolean) => void;
  setSelectedRow: (row: any | null) => void;

  handleCreate: () => void;
  handleEdit: (row: any) => void;
  handleView: (row: any) => void;

  handleDelete: (row: any) => Promise<void>;
  handleRestore: (row: any) => Promise<void>;
  handlePermanentDelete: (row: any) => Promise<void>;
  handleBulkDelete: (rows: any[]) => Promise<void>;
  handleBulkRestore: (rows: any[]) => Promise<void>;
  handleBulkPermanentDelete: (rows: any[]) => Promise<void>;
}

export const createActionsSlice: StateCreator<
  TableStore,
  [],
  [],
  ActionsSlice
> = (set, get) => {
  // Helper for single record actions.
  const performSingleAction = async (
    row: any,
    params: Record<string, any> = {},
    actionLabel: string
  ) => {
    try {
      const apiEndpoint = get().apiEndpoint;
      const { error } = await $fetch({
        url: `${apiEndpoint}/${row.id}`,
        method: "DELETE",
        params,
      });
      if (error) {
        throw new Error(error);
      }
      await get().fetchData();
    } catch (err) {
      console.error(`Error ${actionLabel} item:`, err);
    }
  };

  // Helper for bulk actions.
  const performBulkAction = async (
    ids: any[],
    params: Record<string, any> = {},
    actionLabel: string
  ) => {
    try {
      const apiEndpoint = get().apiEndpoint;
      const { error } = await $fetch({
        url: apiEndpoint,
        method: "DELETE",
        params: { ...params },
        body: { ids },
      });
      if (error) {
        throw new Error(error);
      }
      await get().fetchData();
    } catch (err) {
      console.error(`Error ${actionLabel} items:`, err);
    }
  };

  return {
    isCreateDrawerOpen: false,
    isEditDrawerOpen: false,
    selectedRow: null,

    setCreateDrawerOpen: (isOpen) => set({ isCreateDrawerOpen: isOpen }),
    setEditDrawerOpen: (isOpen) => set({ isEditDrawerOpen: isOpen }),
    setSelectedRow: (row) => set({ selectedRow: row }),

    handleCreate: () => {
      set({ isCreateDrawerOpen: true });
    },

    handleEdit: (row) => {
      set({
        selectedRow: row,
        isEditDrawerOpen: true,
      });
    },

    handleView: (row) => {
      const { tableConfig } = get();
      if (tableConfig.onViewClick) {
        tableConfig.onViewClick(row);
      }
    },

    handleDelete: async (row) => {
      await performSingleAction(row, {}, "deleting");
    },

    handleRestore: async (row) => {
      await performSingleAction(row, { restore: true }, "restoring");
    },

    handlePermanentDelete: async (row) => {
      await performSingleAction(row, { force: true }, "permanently deleting");
    },

    handleBulkDelete: async (rows) => {
      await performBulkAction(rows, {}, "bulk deleting");
    },

    handleBulkRestore: async (rows) => {
      await performBulkAction(rows, { restore: true }, "bulk restoring");
    },

    handleBulkPermanentDelete: async (rows) => {
      await performBulkAction(
        rows,
        { force: true },
        "bulk permanently deleting"
      );
    },
  };
};
