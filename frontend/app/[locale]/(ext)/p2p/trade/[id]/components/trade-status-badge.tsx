"use client";

import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Ban,
  ShieldAlert,
} from "lucide-react";

interface TradeStatusBadgeProps {
  status: string;
}

export function TradeStatusBadge({ status }: TradeStatusBadgeProps) {
  const getStatusConfig = () => {
    switch (status) {
      case "created":
        return {
          label: "Created",
          variant: "outline" as const,
          icon: Clock,
          color: "text-blue-500",
          bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          tooltip: "Trade has been created and is waiting for the next step",
        };
      case "funded":
        return {
          label: "Funded",
          variant: "outline" as const,
          icon: CheckCircle2,
          color: "text-blue-500",
          bg: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
          tooltip: "Escrow has been funded and is ready for payment",
        };
      case "waiting_payment":
        return {
          label: "Awaiting Payment",
          variant: "outline" as const,
          icon: Clock,
          color: "text-yellow-500",
          bg: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
          tooltip: "Waiting for buyer to send payment",
        };
      case "payment_confirmed":
        return {
          label: "Payment Confirmed",
          variant: "outline" as const,
          icon: CheckCircle2,
          color: "text-purple-500",
          bg: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
          tooltip:
            "Payment has been confirmed, waiting for seller to release funds",
        };
      case "completed":
        return {
          label: "Completed",
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-500",
          bg: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
          tooltip: "Trade has been successfully completed",
        };
      case "disputed":
        return {
          label: "Disputed",
          variant: "destructive" as const,
          icon: ShieldAlert,
          color: "text-red-500",
          bg: "",
          tooltip: "Trade is under dispute and being reviewed by admins",
        };
      case "cancelled":
        return {
          label: "Cancelled",
          variant: "outline" as const,
          icon: Ban,
          color: "text-gray-500",
          bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          tooltip: "Trade has been cancelled",
        };
      default:
        return {
          label: "Unknown",
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-gray-500",
          bg: "",
          tooltip: "Unknown status",
        };
    }
  };

  const config = getStatusConfig();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Badge variant={config.variant} className={config.bg}>
            <config.icon className={`h-3 w-3 mr-1 ${config.color}`} />
            {config.label}
          </Badge>
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
