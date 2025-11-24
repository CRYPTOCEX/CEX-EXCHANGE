import { create } from "zustand";

// Define types
export interface CronJob {
  name: string;
  title: string;
  description: string;
  period: number;
  function: string;
  lastRun: Date | null;
  lastRunError: string | null;
  category: string;
  status: "idle" | "running" | "completed" | "failed";
  progress: number;
  executionTime?: number;
  successRate?: number;
  lastExecutions?: {
    timestamp: Date;
    duration: number;
    status: "completed" | "failed";
  }[];
  resourceUsage?: {
    cpu: number;
    memory: number;
  };
  nextScheduledRun?: Date;
}

interface CronLog {
  id: string;
  cronName: string;
  timestamp: Date;
  message: string;
  type: "info" | "warning" | "error" | "success";
}

interface TimelineEvent {
  id: string;
  cronName: string;
  eventType: "started" | "completed" | "failed" | "scheduled";
  timestamp: Date;
  duration?: number;
}

interface CronState {
  // State
  cronJobs: CronJob[];
  logs: CronLog[];
  timelineEvents: TimelineEvent[];
  isConnected: boolean;
  activeTab: "all" | "idle" | "running" | "completed" | "failed";
  searchQuery: string;

  // Actions
  setCronJobs: (jobs: CronJob[]) => void;
  updateCronJob: (name: string, data: Partial<CronJob>) => void;
  addLog: (log: CronLog) => void;
  addTimelineEvent: (event: TimelineEvent) => void;
  setIsConnected: (connected: boolean) => void;
  setActiveTab: (tab: CronState["activeTab"]) => void;
  setSearchQuery: (query: string) => void;

  // Derived state
  getFilteredJobs: () => CronJob[];
}

export const useCronStore = create<CronState>((set, get) => ({
  // Initial state
  cronJobs: [],
  logs: [],
  timelineEvents: [],
  isConnected: false,
  activeTab: "all",
  searchQuery: "",

  // Actions
  setCronJobs: (jobs) => {
    set({ cronJobs: jobs });
  },

  updateCronJob: (name, data) => {
    set((state) => ({
      cronJobs: state.cronJobs.map((job) =>
        job.name === name ? { ...job, ...data } : job
      ),
    }));
  },

  addLog: (log) => {
    set((state) => ({
      logs: [log, ...state.logs].slice(0, 1000),
    }));
  },

  addTimelineEvent: (event) => {
    set((state) => ({
      timelineEvents: [event, ...state.timelineEvents].slice(0, 100),
    }));
  },

  setIsConnected: (connected) => {
    set({ isConnected: connected });
  },

  setActiveTab: (tab) => {
    set({ activeTab: tab });
  },

  setSearchQuery: (query) => {
    set({ searchQuery: query });
  },

  // Derived state
  getFilteredJobs: () => {
    const { cronJobs, activeTab, searchQuery } = get();

    // Filter by status
    let filtered = [...cronJobs];
    if (activeTab !== "all") {
      filtered = filtered.filter((job) => job.status === activeTab);
    }

    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (job) =>
          job.name.toLowerCase().includes(query) ||
          job.title.toLowerCase().includes(query) ||
          job.description.toLowerCase().includes(query)
      );
    }

    return filtered;
  },
}));

// Helper function to handle WebSocket messages
export function handleWebSocketMessage(message: any) {
  const { type, cronName, data, timestamp } = message;
  const store = useCronStore.getState();

  switch (type) {
    case "init":
      if (data.cronJobs && Array.isArray(data.cronJobs)) {
        store.setCronJobs(data.cronJobs);
      }
      break;

    case "status":
      store.updateCronJob(cronName, { status: data.status });

      // Add timeline event
      if (data.status === "running") {
        store.addTimelineEvent({
          id: Date.now().toString(),
          cronName,
          eventType: "started",
          timestamp: new Date(timestamp),
        });
      } else if (data.status === "completed" || data.status === "failed") {
        store.addTimelineEvent({
          id: Date.now().toString(),
          cronName,
          eventType: data.status === "completed" ? "completed" : "failed",
          timestamp: new Date(timestamp),
          duration: data.duration || Math.floor(Math.random() * 5000) + 1000,
        });
      }

      // Add log
      store.addLog({
        id: Date.now().toString(),
        cronName,
        timestamp: new Date(timestamp),
        message: `Status changed to ${data.status}`,
        type: data.status === "failed" ? "error" : "info",
      });
      break;

    case "progress":
      store.updateCronJob(cronName, { progress: data.progress });
      break;

    case "log":
      store.addLog({
        id: Date.now().toString(),
        cronName,
        timestamp: new Date(timestamp),
        message: data.message,
        type: data.logType || "info",
      });
      break;

    case "timelineEvents":
      if (data.timelineEvents && Array.isArray(data.timelineEvents)) {
        data.timelineEvents.forEach((event: TimelineEvent) => {
          store.addTimelineEvent(event);
        });
      }
      break;
  }
}
