import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { TimeframeOption } from "./timeframe-options";

interface TimeframeButtonProps {
  timeframe: TimeframeOption;
  isActive: boolean;
  isDesktop: boolean;
  onClick: () => void;
}

export const TimeframeButton: React.FC<TimeframeButtonProps> = ({
  timeframe,
  isActive,
  isDesktop,
  onClick,
}) => (
  <Button
    variant={isActive ? "outline" : "ghost"}
    size={"sm"}
    className={cn(
      "text-sm whitespace-nowrap sm:px-4",
      isActive ? "" : "hover:bg-muted/10",
      !isDesktop && "px-0"
    )}
    onClick={onClick}
  >
    {isDesktop ? timeframe.label : timeframe.shortLabel}
  </Button>
);
