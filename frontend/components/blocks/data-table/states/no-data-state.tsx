import React from "react";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";
import {
  ShieldOff,
  FileX2,
  Search,
  AlertTriangle,
  Loader2,
} from "lucide-react";

interface NoDataStateProps {
  colSpan: number;
  type: "no-permission" | "no-results" | "filtered" | "error" | "loading";
  className?: string;
}

export function NoDataState({ colSpan, type, className }: NoDataStateProps) {
  const stateConfig = {
    "no-permission": {
      icon: ShieldOff,
      message: "You don't have permission to view this data",
      description: "Please contact your administrator for access",
    },
    "no-results": {
      icon: FileX2,
      message: "No data available",
      description: "There are no items to display at this time",
    },
    filtered: {
      icon: Search,
      message: "No matching results",
      description: "Try adjusting your search or filter criteria",
    },
    error: {
      icon: AlertTriangle,
      message: "An error occurred",
      description:
        "There was a problem fetching the data. Please try again later.",
    },
    loading: {
      icon: Loader2,
      message: "Loading data",
      description: "Please wait while we fetch the data.",
    },
  };

  const config = stateConfig[type];
  const Icon = config.icon;

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell
        colSpan={colSpan}
        className={cn("h-[400px] text-center", className)}
      >
        <div className="flex flex-col items-center justify-center h-full space-y-4">
          <div className="relative">
            <Icon
              className={cn(
                "h-12 w-12 text-muted-foreground",
                type === "loading" && "animate-spin"
              )}
            />
          </div>
          <div className="space-y-2 max-w-[250px] flex items-center justify-center flex-col">
            <p className="text-lg font-medium text-foreground text-center">
              {config.message}
            </p>
            <p className="text-sm text-muted-foreground text-center">
              {config.description}
            </p>
          </div>
        </div>
      </TableCell>
    </TableRow>
  );
}
