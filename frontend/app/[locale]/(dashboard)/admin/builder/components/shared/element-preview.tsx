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
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const tDashboard = useTranslations("dashboard");
  // Helper to get icon component by name
  const getIconByName = (name: string, size = 16, color = "hsl(var(--primary))") => {
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
          <div className="font-bold text-sm text-foreground">
            {tDashboard("section_title")}
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
          <div className="text-xs text-muted-foreground space-y-1 w-full">
            <div className="w-full h-1.5 bg-muted rounded"></div>
            <div className="w-5/6 h-1.5 bg-muted rounded"></div>
            <div className="w-full h-1.5 bg-muted rounded"></div>
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
              <div className="w-1 h-1 rounded-full bg-primary mr-1 shrink-0"></div>
              <div className="w-4/5 h-1.5 bg-muted rounded"></div>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-primary mr-1 shrink-0"></div>
              <div className="w-3/4 h-1.5 bg-muted rounded"></div>
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
          <div className="border-l-2 border-primary pl-2 w-full">
            <div className="w-full h-1.5 bg-muted rounded mb-0.5"></div>
            <div className="w-5/6 h-1.5 bg-muted rounded mb-0.5"></div>
            <div className="w-1/3 h-1 bg-muted rounded ml-auto"></div>
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
          <div className="bg-muted border border-border-strong rounded-md aspect-video flex items-center justify-center w-full">
            <ImageIcon className="h-4 w-4 text-subtle-foreground" />
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
                className="bg-muted border border-border-strong rounded-sm aspect-square flex items-center justify-center"
              >
                <ImageIcon className="h-2 w-2 text-subtle-foreground" />
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
            settings.color || "hsl(var(--primary))"
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
          <div className="w-full h-px bg-muted"></div>
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
          <div className="w-full h-4 border border-dashed border-border-strong rounded-sm flex items-center justify-center">
            <span className="text-[8px] text-subtle-foreground">
              {t("space")}
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
            <div className="flex-1 bg-muted border border-border-strong rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-subtle-foreground">
                1
              </span>
            </div>
            <div className="flex-1 bg-muted border border-border-strong rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-subtle-foreground">
                2
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
          <div className="bg-muted border border-border-strong rounded-sm p-1 w-full h-8">
            <div className="w-full h-full bg-muted border border-border rounded-sm flex items-center justify-center">
              <span className="text-[8px] text-subtle-foreground">
                {t("container")}
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
          <div className="bg-card border border-border-strong rounded-lg overflow-hidden w-full h-10">
            <div className="bg-muted h-4 flex items-center justify-center">
              <ImageIcon className="h-2 w-2 text-subtle-foreground" />
            </div>
            <div className="p-1">
              <div className="w-2/3 h-1 bg-muted rounded-sm mb-0.5"></div>
              <div className="w-full h-1 bg-muted rounded-sm"></div>
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
          <div className="bg-card border border-border-strong rounded-lg overflow-hidden p-1 w-full h-10">
            <div className="text-center mb-0.5">
              <div className="w-1/2 h-1 bg-muted rounded-sm mx-auto mb-0.5"></div>
              <div className="w-1/3 h-1.5 bg-surface-2 rounded-sm mx-auto"></div>
            </div>
            <div className="flex items-center">
              <div className="w-1 h-1 rounded-full bg-success mr-0.5 shrink-0"></div>
              <div className="w-4/5 h-1 bg-muted rounded-sm"></div>
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
          <div className="bg-card border border-border-strong rounded-lg p-1 w-full h-10">
            <div className="flex items-center mb-1">
              <div className="w-3 h-3 rounded-full bg-muted mr-1 shrink-0"></div>
              <div className="w-8 h-1 bg-muted rounded-sm"></div>
            </div>
            <div className="space-y-0.5">
              <div className="w-full h-1 bg-muted rounded-sm"></div>
              <div className="w-5/6 h-1 bg-muted rounded-sm"></div>
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
                <div className="w-3 h-3 rounded-full bg-primary flex items-center justify-center mx-auto mb-0.5">
                  {i === 1 && (
                    <Users className="h-1.5 w-1.5 text-primary" />
                  )}
                  {i === 2 && (
                    <Globe className="h-1.5 w-1.5 text-primary" />
                  )}
                  {i === 3 && (
                    <Server className="h-1.5 w-1.5 text-primary" />
                  )}
                </div>
                <div className="w-4 h-1 bg-muted rounded-sm mx-auto"></div>
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
          <div className="px-2 py-1 bg-primary text-primary-foreground rounded-sm text-[8px]">
            {t("button")}
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
          <div className="bg-muted border border-border-strong rounded-sm p-1 text-center w-full h-8">
            <div className="w-3/4 h-1 bg-muted rounded-sm mx-auto mb-0.5"></div>
            <div className="w-5/6 h-1 bg-muted rounded-sm mx-auto mb-1"></div>
            <div className="w-1/3 h-1.5 bg-primary rounded-sm mx-auto"></div>
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
          <div className="bg-primary/10 border-l-2 border-primary p-1 rounded-r-sm w-full h-6">
            <div className="flex justify-between mb-0.5">
              <div className="w-1/4 h-1 bg-primary rounded-sm"></div>
              <div className="w-1 h-1 bg-primary rounded-full"></div>
            </div>
            <div className="w-5/6 h-1 bg-primary rounded-sm"></div>
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
            <div className="w-3 h-3 rounded-full bg-primary/10 flex items-center justify-center mr-1 shrink-0">
              <Star className="h-1.5 w-1.5 text-primary-ink" />
            </div>
            <div className="flex-1">
              <div className="w-8 h-1 bg-muted rounded-sm mb-0.5"></div>
              <div className="w-full h-1 bg-muted rounded-sm"></div>
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
                    className="bg-muted border border-border-strong rounded-sm aspect-[4/3] flex items-center justify-center"
                  >
                    <ImageIcon className="h-2 w-2 text-subtle-foreground" />
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
            <LinkIcon className="h-3 w-3 text-primary mr-1" />
            <div className="text-xs text-primary border-b border-primary border-dashed">
              {tCommon("link_text")}
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
              <div className="w-2 h-2 rounded-full bg-primary"></div>
              <div className="text-[6px]">BTC/USDT</div>
            </div>
            <div className="text-[6px] text-success">
              +2. 5%
            </div>
            <div className="w-8 h-4">
              <svg viewBox="0 0 32 16" className="w-full h-full">
                <path
                  d="M1,8 Q8,3 16,10 T31,8"
                  fill="none"
                  stroke="hsl(var(--up))"
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
            "w-full h-6 bg-muted flex items-center justify-center",
            className
          )}
        >
          <span className="text-[8px] text-subtle-foreground">
            {tCommon("preview")}
          </span>
        </div>
      );
  }
}
