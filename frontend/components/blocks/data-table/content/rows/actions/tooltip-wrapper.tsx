"use client";

import React from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface TooltipWrapperProps {
  children: React.ReactNode;
  disabled: boolean; // if true => show tooltip
  tooltipContent: string;
}

export function TooltipWrapper({
  children,
  disabled,
  tooltipContent,
}: TooltipWrapperProps) {
  // If not disabled => user has permission => no tooltip
  if (!disabled) return children;

  // If disabled => show tooltip
  return (
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent side="right">
          <p>{tooltipContent}</p>
        </TooltipContent>
      </Tooltip>
  );
}
