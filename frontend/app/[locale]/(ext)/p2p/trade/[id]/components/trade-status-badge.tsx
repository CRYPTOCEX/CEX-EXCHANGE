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
  TimerOff,
} from "lucide-react";
import { normalizeP2PStatus, P2P_STATUS } from "@/utils/p2p-status";

interface TradeStatusBadgeProps {
  status: string;
}

export function TradeStatusBadge({ status }: TradeStatusBadgeProps) {
  const normalizedStatus = normalizeP2PStatus(status);

  const getStatusConfig = () => {
    switch (normalizedStatus) {
      case P2P_STATUS.PENDING:
      case P2P_STATUS.IN_PROGRESS:
        return {
          label: "Awaiting Payment",
          variant: "outline" as const,
          icon: Clock,
          color: "text-amber-700 dark:text-amber-400",
          bg: `bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400`,
          tooltip: "Waiting for buyer to send payment",
        };
      case P2P_STATUS.PAYMENT_SENT:
        return {
          label: "Payment Sent",
          variant: "outline" as const,
          icon: CheckCircle2,
          color: `text-blue-500`,
          bg: `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`,
          tooltip:
            "Payment has been confirmed, waiting for seller to release funds",
        };
      case P2P_STATUS.ESCROW_RELEASED:
        return {
          label: "Escrow Released",
          variant: "outline" as const,
          icon: CheckCircle2,
          color: "text-blue-700 dark:text-blue-400",
          bg: `bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400`,
          tooltip: "Funds have been released from escrow",
        };
      case P2P_STATUS.COMPLETED:
        return {
          label: "Completed",
          variant: "default" as const,
          icon: CheckCircle2,
          color: "text-green-700 dark:text-green-400",
          bg: `bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400`,
          tooltip: "Trade has been successfully completed",
        };
      case P2P_STATUS.DISPUTED:
        return {
          label: "Disputed",
          variant: "destructive" as const,
          icon: ShieldAlert,
          color: "text-red-700 dark:text-red-400",
          bg: `bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400`,
          tooltip: "Trade is under dispute and being reviewed by admins",
        };
      case P2P_STATUS.CANCELLED:
        return {
          label: "Cancelled",
          variant: "outline" as const,
          icon: Ban,
          color: "text-zinc-600 dark:text-zinc-400",
          bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          tooltip: "Trade has been cancelled",
        };
      case P2P_STATUS.EXPIRED:
        return {
          label: "Expired",
          variant: "outline" as const,
          icon: TimerOff,
          color: "text-zinc-600 dark:text-zinc-400",
          bg: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300",
          tooltip: "Trade has expired due to timeout",
        };
      default:
        return {
          label: "Unknown",
          variant: "outline" as const,
          icon: AlertCircle,
          color: "text-zinc-600 dark:text-zinc-400",
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
