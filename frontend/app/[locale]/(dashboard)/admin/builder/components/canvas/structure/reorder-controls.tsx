"use client";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTranslations } from "next-intl";

interface ReorderControlsProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  isFirst: boolean;
  isLast: boolean;
  color?: "purple" | "blue" | "green" | "orange";
}

export default function ReorderControls({
  onMoveUp,
  onMoveDown,
  isFirst,
  isLast,
  color = "purple",
}: ReorderControlsProps) {
  const tCommon = useTranslations("common");
  // Get color classes based on the color prop
  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return "text-primary-foreground hover:bg-primary";
      case "blue":
        return "text-primary-foreground hover:bg-primary";
      case "green":
        return "text-primary-foreground hover:bg-success";
      case "orange":
        return "text-primary-foreground hover:bg-warning";
      default:
        return "text-success-foreground hover:bg-primary";
    }
  };

  const colorClasses = getColorClasses();

  return (
      <div className="flex items-center">
        {/* Only render the up button if not the first item */}
        {!isFirst && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveUp();
                }}
                className={`p-1 ${colorClasses}`}
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tCommon("move_up")}</TooltipContent>
          </Tooltip>
        )}

        {/* Only render the down button if not the last item */}
        {!isLast && (
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onMoveDown();
                }}
                className={`p-1 ${colorClasses}`}
              >
                <ChevronDown className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{tCommon("move_down")}</TooltipContent>
          </Tooltip>
        )}
      </div>
  );
}
