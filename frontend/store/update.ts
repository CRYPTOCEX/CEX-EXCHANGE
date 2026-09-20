import { create } from "zustand";
import { $fetch } from "@/lib/api";

interface PendingUpdate {
  version: string;
  updateId: string;
  changelog?: string | null;
}

interface UpdateData {
  status: boolean;
  message: string;
  changelog: string | null;
  update_id: string;
  version: string;
  filesUpdated?: number;
  // Sequential update fields
  pendingUpdates?: PendingUpdate[];
  latestVersion?: string;
  isSequential?: boolean;
  totalPendingCount?: number;
  /**
   * "NO UPDATE" AND "COULD NOT ASK" ARE DIFFERENT ANSWERS, and this store was
   * throwing the difference away.
   *
   * `checkUpdate` in the backend has three ways to answer `status: false` — no
   * purchase code on the box, the licence server saying the product is current,
   * and a network failure caught at the bottom — and it already separates them
   * with `checkFailed` / `failureReason`. That was added FOR the bulk updater
   * (`store/bulk-update.ts:317`), whose loop would otherwise stop on a blip and
   * report the install as fully updated; the field was never declared here, so
   * the core update console read `status: false` alone and painted all three as
   * a green "You're up to date".
   *
   * The values already arrived at runtime — `checkForUpdates` spreads the whole
   * response — so this declaration is what makes them READABLE, not what makes
   * them present. The error branch below now sets them too, which it could not
   * do before: a `$fetch` failure was reported as being up to date, in the same
   * green panel, with a network-error sentence underneath it.
   */
  checkFailed?: boolean;
  failureReason?: string;
}

interface SystemUpdateStore {
  productId: string;
  productName: string;
  productVersion: string;
  licenseVerified: boolean;
  updateData: UpdateData;
  isUpdating: boolean;
  isUpdateChecking: boolean;
  /**
   * Wall-clock time of the last completed check, or null if none has run.
   *
   * `hasLicenseUpdate`-style flags reach the browser through a ~10-minute cache
   * on the licence server, so "no updates" regularly means "nobody has asked
   * recently". A screen that states a verdict without stating when it was
   * reached cannot be argued with. Set only in the browser, after a request
   * that only ever runs there, so it cannot desynchronise a server render.
   */
  lastCheckedAt: number | null;
  /**
   * Why the product could not be identified, or null.
   *
   * `fetchProductInfo` used to `console.error` and return, leaving
   * `productVersion` at "" — which is also the value before the first fetch. So
   * the page's pending branch was indistinguishable from total failure, and an
   * admin whose backend was down or restarting sat on a skeleton FOREVER with
   * no message and no retry. Every other console on this route group has a
   * failure branch; this one had the state and no way to detect it.
   */
  productInfoError: string | null;
  /**
   * Why the last install attempt failed, or null.
   *
   * `updateSystem` wrote the failure into `updateData.message` alongside a
   * `status` that was still `true`, so the page kept rendering "Version 5.1.2
   * is available / Update now" and the reason was never drawn anywhere. With
   * `silent: true` on the request there was no toast either — pressing Update
   * Now on a box whose licence had expired looked exactly like pressing it and
   * nothing happening.
   */
  updateError: string | null;
  /**
   * The last install that succeeded, or null.
   *
   * It has to live outside `updateData` because a successful install BUMPS
   * `productVersion`, which re-triggers the update check, which overwrites
   * `updateData` wholesale with the server's fresh answer — so the
   * "Update completed successfully. 240 files were updated." sentence written
   * into `updateData.message` was replaced a second later by the next check's
   * message. The only confirmation an operator got for the most consequential
   * button on the page flashed and vanished.
   */
  lastInstall: { version: string; filesUpdated: number } | null;
  setProductId: (id: string) => void;
  setProductName: (name: string) => void;
  setProductVersion: (version: string) => void;
  setLicenseVerified: (verified: boolean) => void;
  setUpdateData: (data: UpdateData) => void;
  setIsUpdating: (updating: boolean) => void;
  setIsUpdateChecking: (checking: boolean) => void;
  checkForUpdates: () => Promise<void>;
  updateSystem: () => Promise<void>;
  /**
   * Returns the outcome instead of swallowing it.
   *
   * It used to write a failure into `updateData.message` — a field the
   * unlicensed view does not render — and the underlying `$fetch` runs
   * `silent: true`, which suppresses the error toast as well. So a wrong or
   * already-used purchase code produced NOTHING: no message, no toast, no
   * state change. The button stopped spinning and the form sat there.
   */
  activateLicense: (
    purchaseCode: string,
    envatoUsername: string
  ) => Promise<{ ok: boolean; error?: string }>;
  verifyLicense: () => Promise<void>;
  fetchProductInfo: () => Promise<void>;
}

export const useSystemUpdateStore = create<SystemUpdateStore>((set, get) => ({
  productId: "",
  productName: "bicrypto",
  productVersion: "",
  licenseVerified: false,
  updateData: {
    status: false,
    message: "",
    changelog: null,
    update_id: "",
    version: "",
    filesUpdated: 0,
    pendingUpdates: [],
    latestVersion: "",
    isSequential: true,
    totalPendingCount: 0,
  },
  isUpdating: false,
  isUpdateChecking: false,
  lastCheckedAt: null,
  productInfoError: null,
  updateError: null,
  lastInstall: null,

  setProductId: (id) => set({ productId: id }),
  setProductName: (name) => set({ productName: name }),
  setProductVersion: (version) => set({ productVersion: version }),
  setLicenseVerified: (verified) => set({ licenseVerified: verified }),
  setUpdateData: (data) => set({ updateData: data }),
  setIsUpdating: (updating) => set({ isUpdating: updating }),
  setIsUpdateChecking: (checking) => set({ isUpdateChecking: checking }),

  checkForUpdates: async () => {
    const { productId, productVersion, setIsUpdateChecking, setUpdateData } =
      get();
    if (!productId || !productVersion) return;
    setIsUpdateChecking(true);

    const { data, error } = await $fetch({
      url: "/api/admin/system/update/check",
      method: "POST",
      body: { productId, currentVersion: productVersion },
      silent: true,
    });

    if (!error) {
      setUpdateData({
        ...data,
        message: data.message || "Update information retrieved.",
        pendingUpdates: data.pendingUpdates || [],
        latestVersion: data.latestVersion || data.version || productVersion,
        isSequential: data.isSequential ?? true,
        totalPendingCount: data.totalPendingCount || data.pendingUpdates?.length || 0,
        // Passed through rather than defaulted: the backend distinguishes "no
        // purchase code", "genuinely current" and "could not reach the licence
        // server", and only it knows which one this was.
        checkFailed: data.checkFailed ?? false,
        failureReason: data.failureReason,
      });
    } else {
      setUpdateData({
        status: false,
        message:
          "Unable to retrieve update information due to a network error.",
        changelog: null,
        update_id: "",
        version: "",
        pendingUpdates: [],
        latestVersion: productVersion,
        isSequential: true,
        totalPendingCount: 0,
        /* The request never reached the licence server, so this is the
           strongest possible form of "could not ask" — and it was previously
           the branch that rendered a green tick. */
        checkFailed: true,
        failureReason:
          error ||
          "The update check could not be completed — the backend did not answer.",
      });
    }
    set({ lastCheckedAt: Date.now() });
    setIsUpdateChecking(false);
  },

  updateSystem: async () => {
    const {
      productId,
      productName,
      updateData,
      setIsUpdating,
      setProductVersion,
      setUpdateData,
      checkForUpdates,
    } = get();

    setIsUpdating(true);
    // Cleared on START, not on success — otherwise a second attempt runs under
    // the banner from the first one and the operator cannot tell whether it is
    // the old failure or a new one.
    set({ updateError: null });

    const { data, error } = await $fetch({
      url: "/api/admin/system/update/download",
      method: "POST",
      body: {
        productId,
        updateId: updateData.update_id,
        version: updateData.version,
        product: productName,
      },
      silent: true,
    });

    if (!error && data) {
      const newVersion = updateData.version;
      setProductVersion(newVersion);
      const filesUpdated = data.data?.filesUpdated || 0;

      // Calculate remaining updates
      const remainingUpdates = (updateData.pendingUpdates || []).filter(
        (u) => u.version !== newVersion
      );
      const hasMoreUpdates = remainingUpdates.length > 0;

      setUpdateData({
        ...updateData,
        status: hasMoreUpdates, // Still has updates if there are more pending
        update_id: hasMoreUpdates ? remainingUpdates[0].updateId : "",
        version: hasMoreUpdates ? remainingUpdates[0].version : newVersion,
        changelog: hasMoreUpdates ? remainingUpdates[0].changelog || null : null,
        message: hasMoreUpdates
          ? `Update to v${newVersion} completed (${filesUpdated} files). ${remainingUpdates.length} more update${remainingUpdates.length > 1 ? 's' : ''} pending - please continue updating sequentially.`
          : filesUpdated > 0
            ? `Update completed successfully. ${filesUpdated} files were updated.`
            : "Update completed successfully.",
        filesUpdated: filesUpdated,
        pendingUpdates: remainingUpdates,
        totalPendingCount: remainingUpdates.length,
        // The licence server just answered a download, so whatever the previous
        // check reported, "could not ask" is no longer true. Without this the
        // spread above would carry a stale `checkFailed` onto a result the
        // server demonstrably produced.
        checkFailed: false,
        failureReason: undefined,
      });

      set({ lastInstall: { version: newVersion, filesUpdated } });

      // If there are more updates, re-check to get fresh data from server
      if (hasMoreUpdates) {
        // Small delay before checking for next update
        setTimeout(() => {
          checkForUpdates();
        }, 1000);
      }
    } else {
      const reason = error || "Failed to update system. Please try again later.";
      setUpdateData({ ...updateData, message: reason });
      // `status` deliberately stays as it was: the update IS still available,
      // the attempt is what failed, and clearing the offer would hide the retry.
      set({ updateError: reason });
    }

    setIsUpdating(false);
  },

  activateLicense: async (purchaseCode: string, envatoUsername: string) => {
    const { productId, setLicenseVerified } = get();
    const { data, error } = await $fetch({
      url: "/api/admin/system/license/activate",
      method: "POST",
      body: { productId, purchaseCode, envatoUsername },
      silent: true,
    });

    if (error) return { ok: false, error };

    setLicenseVerified(data.status);
    if (!data.status) {
      return {
        ok: false,
        error:
          data.message ||
          "That purchase code was not accepted. Check it against your MashDiv or Envato receipt and try again.",
      };
    }

    /*
     * A LICENCE THAT VERIFIES CHANGES WHAT THE UPDATER CAN SAY, so the stale
     * answer has to go with it. Before this the page kept whatever the last
     * check produced — for an unlicensed install that is the backend's
     * "No purchase code found" — and the licensed view it switched to would
     * have opened on it.
     */
    set({
      updateData: {
        status: false,
        message: "",
        changelog: null,
        update_id: "",
        version: "",
        pendingUpdates: [],
        latestVersion: get().productVersion,
        isSequential: true,
        totalPendingCount: 0,
        checkFailed: false,
      },
      lastCheckedAt: null,
      updateError: null,
    });
    return { ok: true };
  },

  verifyLicense: async () => {
    const { productId, setLicenseVerified } = get();
    if (!productId) return;

    const { data, error } = await $fetch({
      url: "/api/admin/system/license/verify",
      method: "POST",
      body: { productId },
      silent: true,
    });

    if (!error && data) {
      setLicenseVerified(data.status);
    } else {
      setLicenseVerified(false);
    }
  },

  fetchProductInfo: async () => {
    const { setProductId, setProductName, setProductVersion, verifyLicense } =
      get();
    // Cleared on entry so a Retry that succeeds does not leave the banner up.
    set({ productInfoError: null });
    const { data, error } = await $fetch({
      url: "/api/admin/system/product",
      silent: true,
    });
    if (!error && data?.version) {
      setProductId(data.id);
      setProductName(data.name);
      setProductVersion(data.version);
      // Automatically verify license after fetching product info
      await verifyLicense();
    } else {
      /*
       * A `console.error` was the whole of this branch, and `productVersion`
       * stays "" — which is ALSO the value before the first request. The page
       * could not tell the two apart, so a backend that is down, restarting, or
       * running from a directory where `package.json` does not resolve rendered
       * as a skeleton that never settled.
       *
       * `!data?.version` is part of the test rather than `error` alone: the
       * route answers 200 with a body it built from whichever `package.json` it
       * found, and a build without the expected fields comes back well-formed
       * and empty.
       */
      set({
        productInfoError:
          error ||
          "The backend answered without a product version. Check that package.json is readable from the server's working directory.",
      });
    }
  },
}));
