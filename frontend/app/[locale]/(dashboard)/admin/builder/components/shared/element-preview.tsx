"use client";
import { cn } from "@/lib/utils";
import {
  ImageIcon,
  Sparkles,
  Users,
  Star,
  Globe,
  Server,
  LinkIcon,
} from "lucide-react";
import { useTranslations } from "next-intl";

interface ElementPreviewProps {
  type: string;
  settings?: Record<string, any>;
  className?: string;
}

export default function ElementPreview({
  type,
  settings = {},
  className,
}: ElementPreviewProps) {
  const t = useTranslations("dashboard");
  // Helper to get icon component by name
  const getIconByName = (name: string, size = 16, color = "#7c3aed") => {
    const iconProps = { size, color, className: "inline-block" };

    switch (name) {
      case "sparkles":
        return <Sparkles {...iconProps} />;
      case "star":
        return <Star {...iconProps} />;
      case "users":
        return <Users {...iconProps} />;
      case "globe":
        return <Globe {...iconProps} />;
      case "server":
        return <Server {...iconProps} />;
      default:
        return <Star {...iconProps} />;
    }
  };

  // Render different preview based on element type - all made much more compact
  switch (type) {
    case "heading":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="font-bold text-sm text-zinc-800 dark:text-zinc-200">
            {t("section_title")}
          </div>
        </div>
      );

    case "text":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="text-xs text-zinc-600 dark:text-zinc-400 space-y-1 w-full">
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            <div className="w-5/6 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
          </div>
        </div>
      );

    case "list":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="space-y-1 w-full">
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-purple-500 mr-1 shrink-0"></div>
              <div className="w-4/5 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-purple-500 mr-1 shrink-0"></div>
              <div className="w-3/4 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
            </div>
          </div>
        </div>
      );

    case "quote":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="border-l-2 border-purple-500 pl-2 w-full">
            <div className="w-full h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-0.5"></div>
            <div className="w-5/6 h-1.5 bg-zinc-200 dark:bg-zinc-700 rounded mb-0.5"></div>
            <div className="w-1/3 h-1 bg-zinc-300 dark:bg-zinc-600 rounded ml-auto"></div>
          </div>
        </div>
      );

    case "image":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-md aspect-video flex items-center justify-center w-full">
            <ImageIcon className="h-4 w-4 text-zinc-400 dark:text-zinc-500" />
          </div>
        </div>
      );

    case "gallery":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="grid grid-cols-3 gap-1 w-full">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm aspect-square flex items-center justify-center"
              >
                <ImageIcon className="h-2 w-2 text-zinc-400 dark:text-zinc-500" />
              </div>
            ))}
          </div>
        </div>
      );

    case "icon":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          {getIconByName(
            settings.iconName || "sparkles",
            16,
            settings.color || "#7c3aed"
          )}
        </div>
      );

    case "divider":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="w-full h-px bg-zinc-200 dark:bg-zinc-700"></div>
        </div>
      );

    case "spacer":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="w-full h-4 border border-dashed border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center">
            <span className="text-[8px] text-zinc-400 dark:text-zinc-500">
              {t("Space")}
            </span>
          </div>
        </div>
      );

    case "columns":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="flex gap-1 w-full h-8">
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
                {'1'}
              </span>
            </div>
            <div className="flex-1 bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
                {'2'}
              </span>
            </div>
          </div>
        </div>
      );

    case "container":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm p-1 w-full h-8">
            <div className="w-full h-full bg-white dark:bg-zinc-800 border border-zinc-100 dark:border-zinc-600 rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
                {t("Container")}
              </span>
            </div>
          </div>
        </div>
      );

    case "card":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm overflow-hidden shadow-sm w-full h-10">
            <div className="bg-zinc-100 dark:bg-zinc-800 h-4 flex items-center justify-center">
              <ImageIcon className="h-2 w-2 text-zinc-400 dark:text-zinc-500" />
            </div>
            <div className="p-1">
              <div className="w-2/3 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm mb-0.5"></div>
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
            </div>
          </div>
        </div>
      );

    case "pricing":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm overflow-hidden shadow-sm p-1 w-full h-10">
            <div className="text-center mb-0.5">
              <div className="w-1/2 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm mx-auto mb-0.5"></div>
              <div className="w-1/3 h-1.5 bg-zinc-900 dark:bg-zinc-100 rounded-sm mx-auto"></div>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-green-500 mr-0.5 shrink-0"></div>
              <div className="w-4/5 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
            </div>
          </div>
        </div>
      );

    case "testimonial":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm p-1 w-full h-10">
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 rounded-full bg-zinc-200 dark:bg-zinc-700 mr-1 shrink-0"></div>
              <div className="w-8 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm"></div>
            </div>
            <div className="space-y-0.5">
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
              <div className="w-5/6 h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
            </div>
          </div>
        </div>
      );

    case "stats":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="flex justify-between w-full">
            {[1, 2, 3].map((i) => (
              <div key={i} className="text-center">
                <div className="w-3 h-3 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mx-auto mb-0.5">
                  {i === 1 && (
                    <Users className="h-1.5 w-1.5 text-purple-600 dark:text-purple-400" />
                  )}
                  {i === 2 && (
                    <Globe className="h-1.5 w-1.5 text-purple-600 dark:text-purple-400" />
                  )}
                  {i === 3 && (
                    <Server className="h-1.5 w-1.5 text-purple-600 dark:text-purple-400" />
                  )}
                </div>
                <div className="w-4 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm mx-auto"></div>
              </div>
            ))}
          </div>
        </div>
      );

    case "button":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="px-2 py-1 bg-purple-600 text-white rounded-sm text-[8px]">
            {t("Button")}
          </div>
        </div>
      );

    case "cta":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-sm p-1 text-center w-full h-8">
            <div className="w-3/4 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm mx-auto mb-0.5"></div>
            <div className="w-5/6 h-1 bg-zinc-400 dark:bg-zinc-500 rounded-sm mx-auto mb-1"></div>
            <div className="w-1/3 h-1.5 bg-purple-600 rounded-sm mx-auto"></div>
          </div>
        </div>
      );

    case "notification":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="bg-blue-50 border-l-2 border-blue-500 p-1 rounded-r-sm w-full h-6">
            <div className="flex justify-between mb-0.5">
              <div className="w-1/4 h-1 bg-blue-800 rounded-sm"></div>
              <div className="w-1 h-1 bg-blue-200 rounded-full"></div>
            </div>
            <div className="w-5/6 h-1 bg-blue-200 rounded-sm"></div>
          </div>
        </div>
      );

    case "feature":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="flex w-full h-8">
            <div className="w-3 h-3 rounded-full bg-purple-100 dark:bg-purple-900 flex items-center justify-center mr-1 shrink-0">
              <Star className="h-1.5 w-1.5 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="flex-1">
              <div className="w-8 h-1 bg-zinc-800 dark:bg-zinc-200 rounded-sm mb-0.5"></div>
              <div className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-sm"></div>
            </div>
          </div>
        </div>
      );

    case "animatedImageGrid":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="grid grid-cols-3 gap-0.5 w-full transform rotate-6 scale-90">
            {[1, 2, 3].map((col) => (
              <div key={col} className="space-y-0.5">
                {[1, 2].map((row) => (
                  <div
                    key={row}
                    className="bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-sm aspect-[4/3] flex items-center justify-center"
                  >
                    <ImageIcon className="h-2 w-2 text-zinc-400 dark:text-zinc-500" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      );

    case "link":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="flex items-center">
            <LinkIcon className="h-3 w-3 text-purple-600 mr-1" />
            <div className="text-xs text-purple-600 border-b border-purple-600 border-dashed">
              {t("link_text")}
            </div>
          </div>
        </div>
      );

    case "trendingMarkets":
      return (
        <div
          className={cn(
            "w-full h-full flex items-center justify-center",
            className
          )}
        >
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-1">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <div className="text-[6px]">{'BTC/USDT'}</div>
            </div>
            <div className="text-[6px] text-green-500">
              {'+2'}. {'5%'}
            </div>
            <div className="w-8 h-4">
              <svg viewBox="0 0 32 16" className="w-full h-full">
                <path
                  d="M1,8 Q8,3 16,10 T31,8"
                  fill="none"
                  stroke="#14b8a6"
                  strokeWidth="1"
                />
              </svg>
            </div>
          </div>
        </div>
      );

    default:
      return (
        <div
          className={cn(
            "w-full h-6 bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center",
            className
          )}
        >
          <span className="text-[8px] text-zinc-500 dark:text-zinc-400">
            {t("Preview")}
          </span>
        </div>
      );
  }
}
