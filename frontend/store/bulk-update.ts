"use client";

import { create } from "zustand";
import { $fetch } from "@/lib/api";
import { useProductsStore, type Product } from "./products";

/**
 * "Update everything" for the add-ons manager.
 * ============================================================================
 *
 * Bringing an install up to date was an N x M manual job. The only update UI
 * was on the product DETAIL page (`admin/system/extension/[id]`), it moves ONE
 * product ONE version, and the licence server hands out updates SEQUENTIALLY —
 * `checkUpdate` in `backend/src/api/admin/system/utils.ts` returns a
 * `pendingUpdates` array and answers with `pendingUpdates[0]`, not the latest
 * release. So an operator four versions behind on nine add-ons had to open nine
 * pages and press Update thirty-six times, watching each one to know when the
 * next click was safe. That is the thing this store replaces.
 *
 * WHY THE LOOP IS HERE AND NOT ON THE SERVER
 * ------------------------------------------
 * The obvious alternative — one `POST /update/all` that walks everything —
 * is a single HTTP request holding a chain of remote downloads plus a zip
 * extraction over the app root, per version, per product. On a real install
 * that is minutes, which no proxy in front of the backend will hold open, and
 * a timeout mid-chain leaves the operator with no idea which product was
 * half-applied. Driving it from the client keeps every request the same short
 * one the detail page already makes, gives per-product progress for free, and
 * makes a failure land on the product that caused it instead of on the batch.
 *
 * It also means the existing audit trail keeps working unchanged: each
 * `update/download` is its own audited admin action.
 *
 * ORDERING IS NOT A STYLE CHOICE
 * ------------------------------
 * Products run one at a time, and versions within a product run one at a time.
 * `downloadUpdate` unzips into the shared application root and then writes the
 * row's `version` column; two of those in flight at once are two writers to the
 * same files. Concurrency here would buy wall-clock and cost determinism.
 */

const BATCH_URL = "/api/admin/system/update/check/batch";
const CHECK_URL = "/api/admin/system/update/check";
const DOWNLOAD_URL = "/api/admin/system/update/download";

/**
 * Ceiling on how many versions ONE product may walk in a single run.
 *
 * The loop's real termination condition is "the licence server stopped offering
 * a version we have not already applied" — see the progress guard below. This
 * cap exists for the case that condition cannot catch: a server that keeps
 * reporting an update whose download does not actually move the installed
 * version. Without it, that is an infinite loop of real downloads.
 */
const MAX_STEPS_PER_PRODUCT = 25;

export type BulkUpdateItemState =
  | "queued"
  | "checking"
  | "updating"
  | "done"
  | "failed"
  /** Stop was pressed while this product still had versions pending. */
  | "stopped"
  /** Stop was pressed before this product started. */
  | "skipped";

export interface BulkUpdateItem {
  productId: string;
  title: string;
  category: Product["category"];
  /** Installed version when the run started. Kept for the "1.2.0 -> 1.5.0" line. */
  startVersion: string;
  /** Installed version right now. Advances once per applied update. */
  currentVersion: string;
  /** Newest release the licence server knows about, from the pre-flight scan. */
  latestVersion: string | null;
  /** The version being downloaded at this instant, if any. */
  installingVersion: string | null;
  /** Versions actually applied by this run, in order. */
  applied: string[];
  state: BulkUpdateItemState;
  error: string | null;
}

export type BulkUpdatePhase =
  /** Never run, or reset. */
  | "idle"
  /** Asking the licence server what is out of date. */
  | "scanning"
  /** Walking the queue. */
  | "running"
  /** Queue drained (or stopped). `items` holds the outcome of each product. */
  | "finished"
  /** The pre-flight scan itself failed — nothing was attempted. */
  | "error";

interface BulkUpdateStore {
  phase: BulkUpdatePhase;
  items: BulkUpdateItem[];
  /** Pre-flight failure. Per-product failures live on the item. */
  error: string | null;
  stopRequested: boolean;
  isOpen: boolean;

  start: (products: Product[]) => Promise<void>;
  requestStop: () => void;
  setOpen: (open: boolean) => void;
  reset: () => void;
}

/**
 * The licence server answers in snake_case; parts of the pipeline re-emit it in
 * camelCase (compare `batch.post.ts`'s documented response with what
 * `fetchAllProductsUpdates` actually passes through). Both spellings are read
 * rather than picking one and hoping — `backend/.../utils.ts` reads both too.
 */
/**
 * Numeric-segment version compare, matching what the backend does in two
 * places (`compareVersions` in utils.ts, `hasNewerVersion` in the extension
 * listing). Kept deliberately identical: a stricter parser here would disagree
 * with the badge the operator is looking at when they press the button.
 */
function isNewer(candidate: string | null, installed: string): boolean {
  if (!candidate || !installed) return false;
  const a = candidate.split(".").map((part) => parseInt(part, 10) || 0);
  const b = installed.split(".").map((part) => parseInt(part, 10) || 0);
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    if ((a[i] || 0) > (b[i] || 0)) return true;
    if ((a[i] || 0) < (b[i] || 0)) return false;
  }
  return false;
}

function normalizeBatchRow(row: any): {
  productId: string | null;
  latestVersion: string | null;
  updateAvailable: boolean;
} {
  return {
    productId: row?.product_id ?? row?.productId ?? null,
    latestVersion: row?.latest_version ?? row?.latestVersion ?? null,
    updateAvailable: Boolean(row?.update_available ?? row?.updateAvailable),
  };
}

export const useBulkUpdateStore = create<BulkUpdateStore>((set, get) => {
  const patchItem = (index: number, patch: Partial<BulkUpdateItem>) =>
    set((state) => ({
      items: state.items.map((item, i) =>
        i === index ? { ...item, ...patch } : item
      ),
    }));

  return {
    phase: "idle",
    items: [],
    error: null,
    stopRequested: false,
    isOpen: false,

    setOpen: (isOpen) => set({ isOpen }),
    requestStop: () => set({ stopRequested: true }),
    reset: () =>
      set({ phase: "idle", items: [], error: null, stopRequested: false }),

    start: async (products) => {
      const { phase } = get();
      if (phase === "scanning" || phase === "running") return;

      set({
        phase: "scanning",
        items: [],
        error: null,
        stopRequested: false,
        isOpen: true,
      });

      /*
       * PRE-FLIGHT: one forced batch check.
       *
       * The `hasLicenseUpdate` flag already on each product row cannot be
       * trusted for this: it comes from `fetchAllProductsUpdates()` through a
       * TEN MINUTE cache (`PRODUCT_UPDATES_TTL`), so a release published in the
       * last ten minutes reads as "up to date" and a product updated in another
       * tab reads as "update available". `check/batch` passes `force: true`,
       * which is the only path that bypasses that cache.
       */
      const { data, error } = await $fetch({
        url: BATCH_URL,
        method: "POST",
        body: {},
        silent: true,
      });

      if (error) {
        set({ phase: "error", error });
        return;
      }

      const rows: any[] = Array.isArray(data?.products) ? data.products : [];

      /*
       * An EMPTY product list is not "everything is current".
       *
       * `fetchAllProductsUpdates` returns `products: []` for three different
       * degraded outcomes — no main-product licence on the box, the licence API
       * unreachable, or the request throwing — and every one of them is
       * reported as `status: true` with a message. Treating that as "nothing to
       * do" would show a green "all up to date" for an install that is four
       * versions behind and simply could not phone home. A real answer always
       * carries at least the main product.
       */
      if (rows.length === 0) {
        set({
          phase: "error",
          error:
            data?.message && data.message !== "Batch update check completed"
              ? `Could not read the release list from the licence server (${data.message}). Nothing was changed.`
              : "Could not read the release list from the licence server. Nothing was changed.",
        });
        return;
      }

      const latestByProductId = new Map(
        rows
          .map(normalizeBatchRow)
          .filter((row) => row.productId)
          .map((row) => [row.productId as string, row])
      );

      /*
       * An add-on qualifies when it is LICENSED and the licence server says a
       * newer release exists. Unlicensed products are not merely skipped for
       * tidiness — `checkUpdate` reads `lic/<productId>.lic` for the purchase
       * code and returns "No purchase code found" without one, so queueing them
       * would spend a round trip per product to be told what the licence flag
       * already said.
       */
      const items: BulkUpdateItem[] = products
        .filter((product) => product.licenseVerified && product.productId)
        .map((product) => ({
          product,
          row: latestByProductId.get(product.productId),
        }))
        /*
         * `updateAvailable` OR a newer `latestVersion`, because the two are not
         * the same test and the UI already shows the second one: the extension
         * listing ignores the server's `update_available` flag and derives its
         * "Update" badge by comparing `latest_version` against the installed
         * version itself. Queueing on only the flag would let a product the
         * operator can SEE flagged be silently passed over. The extra entry
         * costs one check round trip and then reports "already current".
         */
        .filter(
          ({ product, row }) =>
            row &&
            (row.updateAvailable ||
              isNewer(row.latestVersion, product.version || "0.0.1"))
        )
        .map(({ product, row }) => ({
          productId: product.productId,
          title: product.title || product.name || product.productId,
          category: product.category,
          startVersion: product.version || "0.0.1",
          currentVersion: product.version || "0.0.1",
          latestVersion: row?.latestVersion ?? null,
          installingVersion: null,
          applied: [],
          state: "queued" as const,
          error: null,
        }));

      if (items.length === 0) {
        set({ phase: "finished", items: [] });
        return;
      }

      set({ phase: "running", items });

      for (let index = 0; index < items.length; index++) {
        if (get().stopRequested) {
          patchItem(index, { state: "skipped" });
          continue;
        }

        const item = items[index];
        let currentVersion = item.startVersion;
        const applied: string[] = [];
        let failure: string | null = null;

        for (let step = 0; step < MAX_STEPS_PER_PRODUCT; step++) {
          if (get().stopRequested) break;

          patchItem(index, { state: "checking", installingVersion: null });

          const { data: check, error: checkError } = await $fetch({
            url: CHECK_URL,
            method: "POST",
            body: { productId: item.productId, currentVersion },
            silent: true,
          });

          if (checkError) {
            failure = checkError;
            break;
          }

          /*
           * `checkUpdate` catches its own network failures and answers with the
           * SAME "you have the latest version" body it uses for a genuine
           * up-to-date product, so a blip is indistinguishable from success on
           * `status` alone. It now sets `checkFailed` to separate the two —
           * without this, one unreachable moment ends the loop early and the
           * run reports an install as fully updated when it is not.
           */
          if (check?.checkFailed) {
            failure =
              check.failureReason || "The update check could not be completed.";
            break;
          }

          // Nothing left to apply — this is the normal way the loop ends.
          if (!check?.status || !check?.update_id || !check?.version) break;

          /*
           * PROGRESS GUARD. `checkUpdate` derives the next version from the
           * licence server's `pendingUpdates`, and `downloadUpdate` writes the
           * new version to the product row — so a healthy chain always moves
           * forward. If it does not (server repeats a version, or the row write
           * silently no-ops), stop rather than re-download the same zip until
           * the step cap runs out.
           */
          if (check.version === currentVersion || applied.includes(check.version)) {
            break;
          }

          patchItem(index, {
            state: "updating",
            installingVersion: check.version,
          });

          const { error: downloadError } = await $fetch({
            url: DOWNLOAD_URL,
            method: "POST",
            body: {
              productId: item.productId,
              updateId: check.update_id,
              version: check.version,
              product: item.title,
              type: item.category,
            },
            silent: true,
          });

          if (downloadError) {
            failure = downloadError;
            break;
          }

          applied.push(check.version);
          currentVersion = check.version;
          patchItem(index, {
            currentVersion,
            applied: [...applied],
            installingVersion: null,
          });
        }

        patchItem(index, {
          installingVersion: null,
          error: failure,
          state: failure
            ? "failed"
            : get().stopRequested
              ? "stopped"
              : "done",
        });
      }

      set({ phase: "finished" });

      // Installed versions moved; the list behind the dialog is now wrong.
      // Note this also re-reads the batch check, which `downloadUpdate`
      // invalidated server-side after each applied update.
      await useProductsStore.getState().refreshProducts();
    },
  };
});
