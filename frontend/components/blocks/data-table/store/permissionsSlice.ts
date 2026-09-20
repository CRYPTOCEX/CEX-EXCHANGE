import { StateCreator } from "zustand";
import { TableStore, TablePermissions } from "../types/table";
import { checkPermission } from "../utils/permissions";
import { useUserStore } from "@/store/user";

export interface PermissionsState {
  initialized: boolean;
  permissions: TablePermissions;
  hasAccessPermission: boolean;
  hasViewPermission: boolean;
  hasCreatePermission: boolean;
  hasEditPermission: boolean;
  hasDeletePermission: boolean;
}

export interface PermissionsSlice extends PermissionsState {
  initializePermissions: (permissions?: TablePermissions) => void;
  setPermissions: (permissions?: TablePermissions) => void;
}

export const createPermissionsSlice: StateCreator<
  TableStore,
  [],
  [],
  PermissionsSlice
> = (set, get) => ({
  initialized: false,
  permissions: {
    access: "",
    view: "",
    create: "",
    edit: "",
    delete: "",
  },
  hasAccessPermission: false,
  hasViewPermission: false,
  hasCreatePermission: false,
  hasEditPermission: false,
  hasDeletePermission: false,

  initializePermissions: (
    permissions: TablePermissions = {
      access: "",
      view: "",
      create: "",
      edit: "",
      delete: "",
    }
  ) => {
    const user = useUserStore.getState().user;

    // If no permission is provided for access or view, default to granting permission
    const hasAccessPermission = permissions.access
      ? checkPermission(user, permissions.access)
      : true;
    const hasViewPermission = permissions.view
      ? checkPermission(user, permissions.view)
      : true;

    // For the other permissions, default to false if not provided
    set({
      initialized: true,
      permissions,
      hasAccessPermission,
      hasViewPermission,
      hasCreatePermission: permissions.create
        ? checkPermission(user, permissions.create)
        : false,
      hasEditPermission: permissions.edit
        ? checkPermission(user, permissions.edit)
        : false,
      hasDeletePermission: permissions.delete
        ? checkPermission(user, permissions.delete)
        : false,
    });

    // If both access and view permissions are granted, attempt to fetch data
    if (hasAccessPermission && hasViewPermission) {
      const { fetchData } = get();
      if (typeof fetchData === "function") {
        fetchData();
      } else {
        console.error("fetchData is not defined on the TableStore.");
      }
    }
  },

  setPermissions: (
    permissions: TablePermissions = {
      access: "",
      view: "",
      create: "",
      edit: "",
      delete: "",
    }
  ) => {
    const user = useUserStore.getState().user;
    set({
      permissions,
      hasAccessPermission: permissions.access
        ? checkPermission(user, permissions.access)
        : true,
      hasViewPermission: permissions.view
        ? checkPermission(user, permissions.view)
        : true,
      hasCreatePermission: permissions.create
        ? checkPermission(user, permissions.create)
        : false,
      hasEditPermission: permissions.edit
        ? checkPermission(user, permissions.edit)
        : false,
      hasDeletePermission: permissions.delete
        ? checkPermission(user, permissions.delete)
        : false,
    });
  },
});
