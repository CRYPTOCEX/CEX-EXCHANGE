"use client";

import type React from "react";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
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
import { useTranslations } from "next-intl";

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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
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
    // One active treatment for every rail button. The old version keyed off the
    // English tooltip text — so it broke under translation — and handed three of
    // the buttons status tones (success/warning) for states that are not a
    // status at all. Inactive was `text-subtle-foreground`, the dimmest ink on
    // the ramp, which is what made these icons hard to see.
    const getButtonStyle = () =>
      isActive
        ? "bg-primary/10 text-primary-ink"
        : "text-muted-foreground hover:text-foreground hover:bg-surface-3";

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
      tooltip: t("field_library"),
      onClick: () => onSidebarButtonClick("fields"),
      isActive: isSidebarActive("fields"),
    },
    {
      icon: <GalleryVerticalEnd className="h-5 w-5" />,
      tooltip: t("level_presets"),
      onClick: () => onSidebarButtonClick("presets"),
      isActive: isSidebarActive("presets"),
    },
    {
      icon: <Settings className="h-5 w-5" />,
      tooltip: t("level_settings"),
      onClick: () => onSidebarButtonClick("settings"),
      isActive: isSidebarActive("settings"),
    },
    {
      icon: <Shield className="h-5 w-5" />,
      tooltip: t("verification_services"),
      onClick: onToggleVerificationServices,
      isActive: showVerificationServices,
    },
    {
      icon: <Boxes className="h-5 w-5" />,
      tooltip: tCommon("features_limits"),
      onClick: onToggleFeatures,
      isActive: showFeatureManagement,
    },
  ];

  const utilityButtons = [
    {
      icon: <HelpCircle className="h-5 w-5" />,
      tooltip: t("guide"),
      onClick: onToggleGuide,
      isActive: showGuide,
    },
    {
      icon: isFullscreen ? (
        <Minimize2 className="h-5 w-5" />
      ) : (
        <Maximize2 className="h-5 w-5" />
      ),
      tooltip: isFullscreen ? tCommon("exit_fullscreen") : tCommon("fullscreen"),
      onClick: onToggleFullscreen,
    },
    {
      icon: isDarkMode ? (
        <Sun className="h-5 w-5" />
      ) : (
        <Moon className="h-5 w-5" />
      ),
      tooltip: isDarkMode ? tCommon("light_mode") : tCommon("dark_mode"),
      onClick: toggleTheme,
    },
  ];

  return (
      <div className="w-12 border-r border-border bg-card flex flex-col items-center py-2 gap-1">
        {sidebarButtons.map((button, index) => (
          <IconButton key={`sidebar-${index}`} {...button} />
        ))}
        <div className="flex-1"></div>
        {utilityButtons.map((button, index) => (
          <IconButton key={`utility-${index}`} {...button} />
        ))}
      </div>
  );
}
