// actionsSlice.ts
import { StateCreator } from "zustand";
import { PendingAction, PendingDecision, TableStore } from "../types/table";
import { $fetch } from "@/lib/api";
import { toast } from "@/hooks/use-toast";

/**
 * WHY DESTRUCTIVE ACTIONS ARE A TWO-STEP HERE
 * ===========================================
 * `handleDelete`, `handleBulkDelete`, `handlePermanentDelete` and
 * `handleBulkPermanentDelete` used to issue their DELETE the instant they were
 * called, with nothing in between. The row menu fired on click; the bulk menu
 * was a plain `DropdownMenuItem onClick={() => handleBulkPermanentDelete(...)}`,
 * so ONE click purged every selected row with `force: true` and no undo.
 *
 * The same product gates DISCARDING AN UNSAVED SETTINGS DRAFT behind an
 * AlertDialog. An admin got a confirmation for throwing away a form and none for
 * permanently destroying 50 transaction records.
 *
 * So these handlers no longer perform anything: they RAISE a `pendingAction`,
 * and `DestructiveActionDialog` (mounted once by `DataTable`) is what calls
 * `confirmPendingAction`. Putting it in the store rather than at each call site
 * is what makes it cover the row menu, the bulk menu, all 30 core admin tables
 * and all 181 addon tables at once — none of which had to change.
 *
 * RESTORE IS NOT GATED. It is reversible and additive; a confirmation on it
 * would be the noise that teaches operators to click through confirmations.
 *
 * FAILURES ARE NOW VISIBLE. Both helpers used to `console.error` and return, so
 * a delete that 400ed looked exactly like a delete that worked — the row simply
 * stayed. See the support bulk-delete handler, which 400ed on EVERY call for
 * however long it shipped, because nothing surfaced it.
 */

export interface ActionsSlice {
  selectedRow: any | null;
  isCreateDrawerOpen: boolean;
  isEditDrawerOpen: boolean;

  /** Non-null while a destructive action is awaiting confirmation. */
  pendingAction: PendingAction | null;
  /** True while the confirmed action is in flight. */
  isActionPending: boolean;

  setSelectedRow: (row: any | null) => void;
  setCreateDrawerOpen: (open: boolean) => void;
  setEditDrawerOpen: (open: boolean) => void;

  handleView: (row: any) => void;

  handleDelete: (row: any) => Promise<void>;
  handleRestore: (row: any) => Promise<void>;
  handlePermanentDelete: (row: any) => Promise<void>;
  handleBulkDelete: (rows: any[]) => Promise<void>;
  handleBulkRestore: (rows: any[]) => Promise<void>;
  handleBulkPermanentDelete: (rows: any[]) => Promise<void>;

  cancelPendingAction: () => void;
  /**
   * Executes the pending action.
   *
   * `reason` is captured by the dialog and forwarded as a query param. It is
   * accepted-and-ignored by every current backend handler; the audit spine that
   * consumes it is P3 in plans/ADMIN-SYSTEM.md. It is sent as a PARAM rather
   * than a body field on purpose — several DELETE routes validate their body
   * against a schema, and an undeclared property there is a 400, not an
   * ignored extra.
   */
  confirmPendingAction: (reason?: string) => Promise<void>;

  /** Non-null while a queue decision is awaiting confirmation + reason. */
  pendingDecision: PendingDecision | null;
  /** Raises the decision dialog. Nothing is sent until it is confirmed. */
  requestDecision: (decision: PendingDecision) => void;
  cancelPendingDecision: () => void;
  /**
   * Sends the decision.
   *
   * The reason goes in the BODY here, unlike `confirmPendingAction` above, which
   * has to use a query param because several DELETE routes 400 on an undeclared
   * body property. The decision endpoints declare `reason` in their schema, and
   * the body is where it belongs: it is data the handler stores and forwards to
   * the customer, not a modifier on the request.
   */
  confirmPendingDecision: (reason: string) => Promise<void>;
}

export const createActionsSlice: StateCreator<
  TableStore,
  [],
  [],
  ActionsSlice
> = (set, get) => {
  const describe = (count: number) => {
    const itemTitle = get().tableConfig?.itemTitle || "record";
    return `${count} ${itemTitle}${count === 1 ? "" : "s"}`;
  };

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
      return true;
    } catch (err: any) {
      // A silent failure here is indistinguishable from success to the operator.
      toast.destructive({
        title: `Could not complete ${actionLabel}`,
        description: err?.message || "The server rejected the request.",
      });
      return false;
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
      return true;
    } catch (err: any) {
      toast.destructive({
        title: `Could not complete ${actionLabel}`,
        description: err?.message || "The server rejected the request.",
      });
      return false;
    }
  };

  const request = (action: PendingAction) => set({ pendingAction: action });

  return {
    selectedRow: null,
    isCreateDrawerOpen: false,
    isEditDrawerOpen: false,
    pendingAction: null,
    isActionPending: false,

    setSelectedRow: (row) => set({ selectedRow: row }),
    setCreateDrawerOpen: (open) => set({ isCreateDrawerOpen: open }),
    setEditDrawerOpen: (open) => set({ isEditDrawerOpen: open }),

    handleView: (row) => {
      const { tableConfig } = get();
      if (tableConfig.onViewClick) {
        tableConfig.onViewClick(row);
      }
    },

    // --- Destructive: raise a confirmation, do not act. -------------------
    handleDelete: async (row) => {
      request({ kind: "delete", rows: [row], count: 1, permanent: false });
    },

    handlePermanentDelete: async (row) => {
      request({ kind: "permanentDelete", rows: [row], count: 1, permanent: true });
    },

    handleBulkDelete: async (rows) => {
      if (!rows.length) return;
      request({ kind: "bulkDelete", rows, count: rows.length, permanent: false });
    },

    handleBulkPermanentDelete: async (rows) => {
      if (!rows.length) return;
      request({
        kind: "bulkPermanentDelete",
        rows,
        count: rows.length,
        permanent: true,
      });
    },

    // --- Restore is reversible, so it stays one click. --------------------
    handleRestore: async (row) => {
      const ok = await performSingleAction(row, { restore: true }, "restore");
      if (ok) toast.success({ title: "Record restored" });
    },

    handleBulkRestore: async (rows) => {
      if (!rows.length) return;
      const ok = await performBulkAction(rows, { restore: true }, "restore");
      if (ok) toast.success({ title: `Restored ${describe(rows.length)}` });
    },

    cancelPendingAction: () => set({ pendingAction: null }),

    confirmPendingAction: async (reason) => {
      const action = get().pendingAction;
      if (!action) return;

      set({ isActionPending: true });
      const params: Record<string, any> = {};
      if (action.permanent) params.force = true;
      if (reason && reason.trim()) params.reason = reason.trim();

      const verb = action.permanent ? "permanent delete" : "delete";
      const ok =
        action.kind === "delete" || action.kind === "permanentDelete"
          ? await performSingleAction(action.rows[0], params, verb)
          : await performBulkAction(action.rows, params, verb);

      if (ok) {
        toast.success({
          title: action.permanent
            ? `Permanently deleted ${describe(action.count)}`
            : `Deleted ${describe(action.count)}`,
        });
        // Leaving ids selected after they are gone makes the next bulk action
        // target rows that no longer exist.
        get().deselectAllRows?.();
      }
      set({ isActionPending: false, pendingAction: null });
    },

    // --- Queue decisions: approve / reject / close / assign ----------------
    pendingDecision: null,

    requestDecision: (decision) => set({ pendingDecision: decision }),

    cancelPendingDecision: () => set({ pendingDecision: null }),

    confirmPendingDecision: async (reason) => {
      const decision = get().pendingDecision;
      if (!decision) return;

      set({ isActionPending: true });
      try {
        const url = decision.endpoint || get().apiEndpoint;
        const { error } = await $fetch({
          url,
          method: decision.method || "PUT",
          body: {
            ids: decision.ids,
            ...(reason && reason.trim() ? { reason: reason.trim() } : {}),
            ...(decision.body || {}),
          },
        });
        if (error) throw new Error(error);

        await get().fetchData();
        toast.success({
          title: `${decision.label} — done`,
          description: `${decision.ids.length} ${
            decision.ids.length === 1 ? "record" : "records"
          } updated.`,
        });
        // The decided rows have moved out of the queue's filter; keeping them
        // selected would aim the next bulk action at rows no longer on screen.
        get().deselectAllRows?.();
      } catch (err: any) {
        toast.destructive({
          title: `Could not ${decision.verb}`,
          description: err?.message || "The server rejected the request.",
        });
      } finally {
        set({ isActionPending: false, pendingDecision: null });
      }
    },
  };
};
