import { StateCreator } from "zustand";
import { TableStore } from "../types/table";

export type DataTableView = "overview" | "analytics" | "create" | "edit";

export interface FormState {
  isSubmitting: boolean;
  isDirty: boolean;
  onSubmit: (() => void) | null;
  onCancel: (() => void) | null;
}

export interface ViewState {
  currentView: DataTableView;
  previousView: DataTableView;
  editingRowId: string | null;
  formState: FormState;
}

export interface ViewActions {
  setView: (view: DataTableView) => void;
  goToCreate: () => void;
  goToEdit: (rowId: string) => void;
  goToOverview: () => void;
  goToAnalytics: () => void;
  goBack: () => void;
  resetView: () => void;
  setFormState: (state: Partial<FormState>) => void;
  resetFormState: () => void;
}

export type ViewSlice = ViewState & ViewActions;

const initialFormState: FormState = {
  isSubmitting: false,
  isDirty: false,
  onSubmit: null,
  onCancel: null,
};

export const createViewSlice: StateCreator<
  TableStore,
  [],
  [],
  ViewSlice
> = (set, get) => ({
  // Initial state
  currentView: "overview",
  previousView: "overview",
  editingRowId: null,
  formState: initialFormState,

  // Actions
  setView: (view) => {
    const current = get().currentView;
    set({
      previousView: current,
      currentView: view,
      // Clear editing row if not going to edit view
      editingRowId: view === "edit" ? get().editingRowId : null,
    });
  },

  goToCreate: () => {
    const current = get().currentView;
    set({
      previousView: current,
      currentView: "create",
      selectedRow: null,
      editingRowId: null,
    });
  },

  goToEdit: (rowId) => {
    const current = get().currentView;
    const data = get().data;
    const row = data.find((r: any) => r.id === rowId);
    set({
      previousView: current,
      currentView: "edit",
      selectedRow: row || null,
      editingRowId: rowId,
    });
  },

  goToOverview: () => {
    set({
      previousView: get().currentView,
      currentView: "overview",
      selectedRow: null,
      editingRowId: null,
    });
  },

  goToAnalytics: () => {
    set({
      previousView: get().currentView,
      currentView: "analytics",
    });
  },

  goBack: () => {
    const previous = get().previousView;
    // Don't go back to create/edit, default to overview
    const targetView = previous === "create" || previous === "edit" ? "overview" : previous;
    set({
      previousView: get().currentView,
      currentView: targetView,
      selectedRow: null,
      editingRowId: null,
    });
  },

  resetView: () => {
    set({
      currentView: "overview",
      previousView: "overview",
      selectedRow: null,
      editingRowId: null,
      formState: initialFormState,
    });
  },

  setFormState: (state) => {
    set({
      formState: { ...get().formState, ...state },
    });
  },

  resetFormState: () => {
    set({ formState: initialFormState });
  },
});
