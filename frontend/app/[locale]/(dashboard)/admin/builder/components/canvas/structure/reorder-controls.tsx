"use client";
import { ChevronUp, ChevronDown } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
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
  const t = useTranslations("dashboard");
  // Get color classes based on the color prop
  const getColorClasses = () => {
    switch (color) {
      case "purple":
        return "text-white hover:bg-purple-700";
      case "blue":
        return "text-white hover:bg-blue-600";
      case "green":
        return "text-white hover:bg-green-600";
      case "orange":
        return "text-white hover:bg-orange-600";
      default:
        return "text-white hover:bg-purple-700";
    }
  };

  const colorClasses = getColorClasses();

  return (
    <TooltipProvider>
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
            <TooltipContent>{t("move_up")}</TooltipContent>
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
            <TooltipContent>{t("move_down")}</TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  );
}
