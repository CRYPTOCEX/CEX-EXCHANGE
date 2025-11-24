"use client";

import { useCronStore } from "@/store/cron";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow, format } from "date-fns";
interface CronDetailModalProps {
  cronName: string | null;
  isOpen: boolean;
  onClose: () => void;
}
export function CronDetailModal({
  cronName,
  isOpen,
  onClose,
}: CronDetailModalProps) {
  const { cronJobs, logs } = useCronStore();
  const cronJob = cronName
    ? cronJobs.find((job) => job.name === cronName)
    : null;
  const cronLogs = cronName
    ? logs.filter((log) => log.cronName === cronName)
    : [];
  if (!cronJob) return null;
  const formatPeriod = (ms: number) => {
    const seconds = ms / 1000;
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    return `${Math.floor(seconds / 86400)}d`;
  };
  const getStatusColor = (status: string | undefined) => {
    switch (status) {
      case "running":
        return "bg-blue-500";
      case "completed":
        return "bg-green-500";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-gray-500";
    }
  };
  const getLogTypeColor = (type: string) => {
    switch (type) {
      case "info":
        return "text-blue-500";
      case "warning":
        return "text-yellow-500";
      case "error":
        return "text-red-500";
      case "success":
        return "text-green-500";
      default:
        return "text-gray-500";
    }
  };
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="h-[90vh] flex flex-col p-0 gap-0" size="4xl">
        <DialogHeader className="p-6 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">{cronJob.title}</DialogTitle>
              <DialogDescription>{cronJob.description}</DialogDescription>
            </div>
            <Badge variant="outline" className="capitalize">
              {(cronJob.category || "normal").replace("_", " ")}
            </Badge>
          </div>
        </DialogHeader>

        <div className="px-6">
          <div className="grid grid-cols-3 gap-4 my-4">
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted-foreground">Status</div>
              <div className="flex items-center gap-2 mt-1">
                <div
                  className={`w-3 h-3 rounded-full ${getStatusColor(cronJob.status)}`}
                ></div>
                <div className="font-medium capitalize">
                  {cronJob.status || "idle"}
                </div>
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted-foreground">Period</div>
              <div className="font-medium mt-1">
                {formatPeriod(cronJob.period)}
              </div>
            </div>
            <div className="border rounded-md p-3">
              <div className="text-sm text-muted-foreground">Last Run</div>
              <div className="font-medium mt-1">
                {cronJob.lastRun
                  ? formatDistanceToNow(new Date(cronJob.lastRun), {
                      addSuffix: true,
                    })
                  : "Never"}
              </div>
            </div>
          </div>
        </div>

        <Tabs
          defaultValue="logs"
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="px-6 border-b">
            <TabsList>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-auto">
            <TabsContent
              value="logs"
              className="h-full p-6 pt-4 m-0 overflow-auto"
            >
              <div className="h-full border rounded-md bg-black p-4 overflow-auto">
                <div className="font-mono text-xs space-y-1">
                  {cronLogs.length === 0 ? (
                    <div className="text-gray-400 p-4 text-center">
                      No logs available for this cron job
                    </div>
                  ) : (
                    cronLogs.map((log) => {
                      return (
                        <div key={log.id} className="text-gray-200">
                          <span className="text-gray-400">
                            [{format(new Date(log.timestamp), "HH:mm:ss")}]
                          </span>{" "}
                          <span className={getLogTypeColor(log.type)}>
                            {log.message}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent
              value="schedule"
              className="h-full p-6 pt-4 m-0 overflow-auto"
            >
              <div className="h-full pr-4">
                <div className="border rounded-md p-4">
                  <h3 className="text-lg font-medium mb-4">
                    Schedule Information
                  </h3>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Frequency
                        </div>
                        <div className="font-medium">
                          Every {formatPeriod(cronJob.period)}
                        </div>
                      </div>
                      <div>
                        <div className="text-sm text-muted-foreground">
                          Next Run
                        </div>
                        <div className="font-medium">
                          {cronJob.nextScheduledRun
                            ? format(
                                new Date(cronJob.nextScheduledRun),
                                "MMM d, yyyy HH:mm:ss"
                              )
                            : "Not scheduled"}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-muted-foreground">
                        Function
                      </div>
                      <div className="font-mono bg-gray-100 dark:bg-gray-800 p-2 rounded mt-1">
                        {cronJob.function}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
