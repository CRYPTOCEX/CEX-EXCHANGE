"use client";

import { useCronStore } from "@/store/cron";
import { format } from "date-fns";
export function LogViewer() {
  const { logs } = useCronStore();
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
    <div className="border rounded-md h-[400px] bg-black overflow-auto">
      <div className="p-4">
        <div className="font-mono text-xs space-y-1">
          {logs.length === 0 ? (
            <div className="text-gray-400 p-4 text-center">
              No logs available
            </div>
          ) : (
            logs.map((log) => {
              return (
                <div key={log.id} className="text-gray-200">
                  <span className="text-gray-400">
                    [{format(new Date(log.timestamp), "HH:mm:ss")}]
                  </span>{" "}
                  <span className="text-purple-400">{log.cronName}:</span>{" "}
                  <span className={getLogTypeColor(log.type)}>
                    {log.message}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
