"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Layers,
  GalleryVerticalEnd,
  Settings,
  Maximize2,
  Minimize2,
  HelpCircle,
  Sun,
  Moon,
  Shield,
  Boxes,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface VerticalIconBarProps {
  activeSidebar: "fields" | "presets" | "settings";
  leftSidebarOpen: boolean;
  showFeatureManagement: boolean;
  showGuide: boolean;
  showVerificationServices: boolean;
  isFullscreen: boolean;
  onSidebarButtonClick: (sidebar: "fields" | "presets" | "settings") => void;
  onToggleGuide: () => void;
  onToggleFullscreen: () => void;
  onToggleFeatures: () => void;
  onToggleVerificationServices: () => void;
}

type IconButtonProps = {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  tooltipSide?: "top" | "right" | "bottom" | "left";
};

export function VerticalIconBar({
  activeSidebar,
  leftSidebarOpen,
  showFeatureManagement,
  showGuide,
  showVerificationServices,
  isFullscreen,
  onSidebarButtonClick,
  onToggleGuide,
  onToggleFullscreen,
  onToggleFeatures,
  onToggleVerificationServices,
}: VerticalIconBarProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);

  useEffect(() => {
    if (typeof document !== "undefined") {
      setIsDarkMode(document.documentElement.classList.contains("dark"));
    }
  }, []);

  const toggleTheme = () => {
    if (typeof document !== "undefined") {
      if (isDarkMode) {
        document.documentElement.classList.remove("dark");
        localStorage.setItem("theme", "light");
      } else {
        document.documentElement.classList.add("dark");
        localStorage.setItem("theme", "dark");
      }
      setIsDarkMode(!isDarkMode);
    }
  };

  const isSidebarActive = (sidebar: "fields" | "presets" | "settings") => {
    return (
      activeSidebar === sidebar &&
      leftSidebarOpen &&
      !showFeatureManagement &&
      !showGuide &&
      !showVerificationServices
    );
  };

  const IconButton = ({
    icon,
    tooltip,
    onClick,
    isActive = false,
    tooltipSide = "right",
  }: IconButtonProps) => {
    const getButtonStyle = () => {
      if (!isActive)
        return "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300";
      if (tooltip === "Field Library")
        return "bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400";
      if (tooltip === "Level Presets")
        return "bg-purple-50 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400";
      if (tooltip === "Level Settings")
        return "bg-gray-50 text-gray-600 dark:bg-zinc-800 dark:text-zinc-300";
      if (tooltip === "Features & Limits")
        return "bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400";
      if (tooltip === "Verification Services")
        return "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400";
      if (tooltip === "Guide")
        return "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400";
      return "text-gray-500 dark:text-zinc-400 hover:text-gray-700 dark:hover:text-zinc-300";
    };

    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            className={cn("h-9 w-9 rounded-md", getButtonStyle())}
          >
            {icon}
          </Button>
        </TooltipTrigger>
        <TooltipContent side={tooltipSide}>
          <p>{tooltip}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  const sidebarButtons = [
    {
      icon: <Layers className="h-5 w-5" />,
      tooltip: "Field Library",
      onClick: () => onSidebarButtonClick("fields"),
      isActive: isSidebarActive("fields"),
    },
    {
      icon: <GalleryVerticalEnd className="h-5 w-5" />,
      tooltip: "Level Presets",
      onClick: () => onSidebarButtonClick("presets"),
      isActive: isSidebarActive("presets"),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      tooltip: "Level Settings",
      onClick: () => onSidebarButtonClick("settings"),
      isActive: isSidebarActive("settings"),
    },
    {
      icon: <Shield className="h-5 w-5" />,
      tooltip: "Verification Services",
      onClick: onToggleVerificationServices,
      isActive: showVerificationServices,
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      tooltip: "Features & Limits",
      onClick: onToggleFeatures,
      isActive: showFeatureManagement,
    },
  ];

  const utilityButtons = [
    {
      icon: <HelpCircle className="h-5 w-5" />,
      tooltip: "Guide",
      onClick: onToggleGuide,
      isActive: showGuide,
    },
    {
      icon: isFullscreen ? (
        <Minimize2 className="h-5 w-5" />
      ) : (
        <Maximize2 className="h-5 w-5" />
      ),
      tooltip: isFullscreen ? "Exit Fullscreen" : "Fullscreen",
      onClick: onToggleFullscreen,
    },
    {
      icon: isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      ),
      tooltip: isDarkMode ? "Light Mode" : "Dark Mode",
      onClick: toggleTheme,
    },
  ];

  return (
    <TooltipProvider>
      <div className="w-12 border-r border-gray-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex flex-col items-center py-2 gap-1">
        {sidebarButtons.map((button, index) => (
          <IconButton key={`sidebar-${index}`} {...button} />
        ))}
        <div className="flex-1"></div>
        {utilityButtons.map((button, index) => (
          <IconButton key={`utility-${index}`} {...button} />
        ))}
      </div>
    </TooltipProvider>
  );
}
