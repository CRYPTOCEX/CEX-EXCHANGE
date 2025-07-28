import React from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
export const columns: ColumnDefinition[] = [
  {
    key: "name",
    title: "Project",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Project name and participant count",
    render: (value: any, row: any) => {
      return (
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarImage src={row.icon || `/img/placeholder.svg`} />
            <AvatarFallback>{value?.slice(0, 2).toUpperCase()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-semibold">{value}</div>
            <div className="text-sm text-muted-foreground">
              {row.participants} participants
            </div>
          </div>
        </div>
      );
    },
  },
  {
    key: "symbol",
    title: "Token",
    type: "text",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Token symbol",
    render: (value: any) => value || "N/A",
  },
  {
    key: "targetAmount",
    title: "Target",
    type: "number",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Target funding amount",
    render: (value: any) => `$${Number(value).toLocaleString()}`,
  },
  {
    key: "progress",
    title: "Progress",
    type: "custom",
    description: "Funding progress",
    render: (_: any, row: any) => {
      const progress =
        row.targetAmount > 0
          ? Math.min(
              Math.round((row.currentRaised / row.targetAmount) * 100),
              100
            )
          : 0;
      return (
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="w-48">
                <div className="flex justify-between mb-1 text-xs">
                  <span className="font-medium">{progress}%</span>
                  <span className="text-muted-foreground">
                    ${Number(row.currentRaised).toLocaleString()} / $
                    {Number(row.targetAmount).toLocaleString()}
                  </span>
                </div>
                <Progress
                  value={progress}
                  className={`h-2 ${progress >= 100 ? "bg-green-500" : progress >= 75 ? "bg-blue-500" : ""}`}
                />
              </div>
            </TooltipTrigger>
            <TooltipContent>
              <div className="space-y-1 pb-2">
                <p className="font-medium">Funding Progress</p>
                <p className="text-xs">{progress}% of target raised</p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      );
    },
  },
  {
    key: "submittedAt",
    title: "Submitted",
    type: "date",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Date when the offering was submitted",
    render: (value: any) => {
      if (value) {
        const date = new Date(value);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {formatDistanceToNow(date, {
                  addSuffix: true,
                })}
              </TooltipTrigger>
              <TooltipContent>{format(date, "PPP p")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <span className="text-muted-foreground">Not submitted</span>;
    },
  },
  {
    key: "endDate",
    title: "End Date",
    type: "date",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Offering end date",
    render: (value: any) => {
      if (value) {
        const date = new Date(value);
        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger>
                {formatDistanceToNow(date, {
                  addSuffix: true,
                })}
              </TooltipTrigger>
              <TooltipContent>{format(date, "PPP p")}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      }
      return <span className="text-muted-foreground">No end date</span>;
    },
    expandedOnly: true,
  },
  {
    key: "currentPrice",
    title: "Current Price",
    type: "number",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Current token price with change",
    render: (value: any, row: any) => {
      if (value != null) {
        return (
          <div className="flex items-center gap-2">
            <span className="font-medium">
              ${Number(value).toLocaleString()}
            </span>
            {row.priceChange != null && (
              <div
                className={`flex items-center gap-1 text-sm ${row.priceChange >= 0 ? "text-green-600" : "text-red-600"}`}
              >
                {row.priceChange >= 0 ? (
                  <TrendingUp className="h-3 w-3" />
                ) : (
                  <TrendingDown className="h-3 w-3" />
                )}
                <span>
                  {row.priceChange >= 0 ? "+" : ""}
                  {row.priceChange}%
                </span>
              </div>
            )}
          </div>
        );
      }
      return <span className="text-muted-foreground">N/A</span>;
    },
    expandedOnly: true,
  },
  {
    key: "status",
    title: "Status",
    type: "select",
    sortable: true,
    searchable: true,
    filterable: true,
    description: "Current status of the offering",
    options: [
      {
        value: "ACTIVE",
        label: "Active",
        color: "success",
      },
      {
        value: "SUCCESS",
        label: "Success",
        color: "success",
      },
      {
        value: "FAILED",
        label: "Failed",
        color: "danger",
      },
      {
        value: "UPCOMING",
        label: "Upcoming",
        color: "info",
      },
      {
        value: "PENDING",
        label: "Pending",
        color: "warning",
      },
      {
        value: "REJECTED",
        label: "Rejected",
        color: "danger",
      },
    ],
    render: {
      type: "badge",
      config: {
        variant: (value: string) => {
          switch (value.toUpperCase()) {
            case "ACTIVE":
            case "SUCCESS":
              return "success";
            case "FAILED":
              return "danger";
            case "UPCOMING":
              return "info";
            case "PENDING":
              return "warning";
            case "REJECTED":
              return "danger";
            default:
              return "default";
          }
        },
      },
    },
  },
];
