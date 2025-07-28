import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { $fetch } from "@/lib/api";

export type Target = {
  id: string;
  avatar: string;
  email: string;
  firstName: string;
  lastName: string;
  status: string;
};

export type Template = {
  id: string;
  name: string;
};

interface Campaign {
  name: string;
  subject: string;
  speed: number;
  templateId: string;
  status: string;
}

interface CampaignState {
  campaignId: string;
  campaign: Campaign;
  templates: Template[];
  items: Target[];
  open: boolean;
  users: Target[];
  selectedUsers: Target[];
  userFilter: string;
  totalUsersInDatabase: number;
  userPagination: {
    totalItems: number;
    totalPages: number;
    perPage: number;
    currentPage: number;
  };
  isLoading: boolean;
  statusFilter: string;
  targetPagination: { currentPage: number; perPage: number };

  // setters
  setCampaignId: (id: string) => void;
  setCampaign: (campaign: Campaign) => void;
  setTemplates: (templates: Template[]) => void;
  setItems: (items: Target[]) => void;
  setOpen: (open: boolean) => void;
  setUsers: (users: Target[]) => void;
  setSelectedUsers: (users: Target[]) => void;
  setUserFilter: (filter: string) => void;
  setTotalUsersInDatabase: (total: number) => void;
  setUserPagination: (pagination: CampaignState["userPagination"]) => void;
  setIsLoading: (isLoading: boolean) => void;
  setStatusFilter: (status: string) => void;
  setTargetPagination: (pagination: CampaignState["targetPagination"]) => void;

  // actions
  fetchTemplates: () => Promise<void>;
  fetchCampaign: () => Promise<void>;
  fetchUsers: (
    filter?: string,
    page?: number,
    perPage?: number,
    fetchAll?: boolean
  ) => Promise<void>;
  handleAddAllUsers: () => Promise<void>;
  handleSelectUser: (user: Target) => void;
  handleAddUsers: () => void;
  handleRemoveTarget: (targetId: string) => void;
  handleCreateCampaign: () => Promise<void>;
  handleUpdateCampaign: () => Promise<void>;
  handleUpdateStatus: (status: string) => Promise<void>;
}

export const useCampaignStore = create<CampaignState>()(
  devtools((set, get) => ({
    // State initialization
    campaignId: "",
    campaign: {
      name: "",
      subject: "",
      speed: 1,
      templateId: "",
      status: "PENDING",
    },
    templates: [],
    items: [],
    open: false,
    users: [],
    selectedUsers: [],
    userFilter: "",
    totalUsersInDatabase: 0,
    userPagination: {
      totalItems: 0,
      totalPages: 0,
      perPage: 20,
      currentPage: 1,
    },
    isLoading: false,
    statusFilter: "All",
    targetPagination: { currentPage: 1, perPage: 6 },

    // Setters
    setCampaignId: (id) => set({ campaignId: id }),
    setCampaign: (campaign) => set({ campaign }),
    setTemplates: (templates) => set({ templates }),
    setItems: (items) => set({ items }),
    setOpen: (open) => set({ open }),
    setUsers: (users) => set({ users }),
    setSelectedUsers: (users) => set({ selectedUsers: users }),
    setUserFilter: (filter) => set({ userFilter: filter }),
    setTotalUsersInDatabase: (total) => set({ totalUsersInDatabase: total }),
    setUserPagination: (pagination) => set({ userPagination: pagination }),
    setIsLoading: (isLoading) => set({ isLoading }),
    setStatusFilter: (status) => set({ statusFilter: status }),
    setTargetPagination: (pagination) => set({ targetPagination: pagination }),

    // Actions
    fetchTemplates: async () => {
      try {
        const { data, error } = await $fetch({
          url: "/api/admin/mailwizard/template/options",
          silent: true,
        });
        if (!error && data) {
          set({ templates: data });
          if (!get().campaign.templateId && data.length > 0) {
            set((state) => ({
              campaign: { ...state.campaign, templateId: data[0].id },
            }));
          }
        } else {
          console.error("Failed to fetch templates:", error);
        }
      } catch (err) {
        console.error("Error fetching templates:", err);
      }
    },
    fetchCampaign: async () => {
      const campaignId = get().campaignId;
      try {
        const { data, error } = await $fetch({
          url: `/api/admin/mailwizard/campaign/${campaignId}`,
          silent: true,
        });
        if (!error && data) {
          set({
            campaign: {
              name: data.name,
              subject: data.subject,
              speed: data.speed,
              templateId: data.templateId,
              status: data.status || "PENDING",
            },
          });

          let targetsData: any[] = [];
          if (data.targets) {
            if (typeof data.targets === "string") {
              try {
                targetsData = JSON.parse(data.targets);
              } catch (parseError) {
                console.error("Error parsing targets:", parseError);
              }
            } else if (Array.isArray(data.targets)) {
              targetsData = data.targets;
            }
          }
          const targets = targetsData.map((target: Target) => ({
            ...target,
            status: target.status || "PENDING",
          }));
          set({ items: targets });
        } else {
          console.error("Failed to fetch campaign details:", error);
        }
      } catch (err) {
        console.error("Error fetching campaign details:", err);
      }
    },
    fetchUsers: async (
      filter = "",
      page = 1,
      perPage = 10,
      fetchAll = false
    ) => {
      const filterObject = {
        firstName: { value: filter, operator: "startsWith" },
      };
      const { data, error } = await $fetch({
        url: "/api/admin/crm/user",
        params: fetchAll
          ? { all: "true" }
          : { filter: JSON.stringify(filterObject), page, perPage },
        silent: true,
      });
      if (!error) {
        if (fetchAll) {
          set({
            users: data.data,
            selectedUsers: data.data,
            totalUsersInDatabase: data.data.length,
          });
        } else {
          set({
            users: data.items,
            userPagination: data.pagination,
            totalUsersInDatabase: data.pagination.totalItems,
          });
        }
      }
    },
    handleAddAllUsers: async () => {
      set({ isLoading: true });
      try {
        await get().fetchUsers("", 1, 10, true);
        set((state) => ({
          selectedUsers: [...state.selectedUsers, ...state.users],
        }));
      } finally {
        set({ isLoading: false });
      }
    },
    handleSelectUser: (user: Target) => {
      set((state) => {
        const exists = state.selectedUsers.some((u) => u.id === user.id);
        return {
          selectedUsers: exists
            ? state.selectedUsers.filter((u) => u.id !== user.id)
            : [...state.selectedUsers, user],
        };
      });
    },
    handleAddUsers: () => {
      set((state) => {
        const merged = [...state.items];
        state.selectedUsers.forEach((user) => {
          if (!merged.some((item) => item.id === user.id)) {
            merged.push({ ...user, status: "PENDING" });
          }
        });
        return { items: merged, open: false };
      });
    },
    handleRemoveTarget: (targetId: string) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== targetId),
      }));
    },
    handleCreateCampaign: async () => {
      set({ isLoading: true });
      try {
        const { campaign, items } = get();
        // POST request to create a new campaign.
        const { data, error } = await $fetch({
          url: `/api/admin/mailwizard/campaign`,
          method: "POST",
          body: {
            name: campaign.name,
            subject: campaign.subject,
            speed: campaign.speed,
            templateId: campaign.templateId,
            targets: JSON.stringify(items),
          },
        });
        if (!error) {
          // Optionally, redirect to the edit page of the newly created campaign
          window.location.href = `/admin/mailwizard/campaign/${data.id}`;
        } else {
          console.error("Failed to create campaign:", error);
        }
      } catch (err) {
        console.error("Error creating campaign:", err);
      } finally {
        set({ isLoading: false });
      }
    },
    handleUpdateCampaign: async () => {
      set({ isLoading: true });
      try {
        const { campaign, items, campaignId } = get();
        const { data, error } = await $fetch({
          url: `/api/admin/mailwizard/campaign/${campaignId}`,
          method: "PUT",
          body: {
            name: campaign.name,
            subject: campaign.subject,
            speed: campaign.speed,
            templateId: campaign.templateId,
            targets: JSON.stringify(items),
          },
        });
        if (!error) {
          window.location.href = "/admin/mailwizard/campaign";
        } else {
          console.error("Failed to update campaign:", error);
        }
      } finally {
        set({ isLoading: false });
      }
    },
    handleUpdateStatus: async (status: string) => {
      set({ isLoading: true });
      try {
        const campaignId = get().campaignId;
        const { error } = await $fetch({
          url: `/api/admin/mailwizard/campaign/${campaignId}/status`,
          method: "PUT",
          body: { status },
        });
        if (!error) {
          set((state) => ({
            campaign: { ...state.campaign, status },
          }));
        } else {
          console.error("Failed to update campaign status:", error);
        }
      } catch (err) {
        console.error("Error updating campaign status:", err);
      } finally {
        set({ isLoading: false });
      }
    },
  }))
);
