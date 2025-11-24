import React from "react";
import { Progress } from "@/components/ui/progress";
import { SidebarClose, LayoutTemplate } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useTranslations } from "next-intl";

interface DocumentationHeaderProps {
  progress: number;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  isMobile: boolean;
}

export function DocumentationHeader({
  progress,
  isSidebarOpen,
  toggleSidebar,
  isMobile,
}: DocumentationHeaderProps) {
  const t = useTranslations("components/blocks/docs/DocumentationHeader");
  return (
    <>
      <div className="rounded-t-md sticky top-0 z-10 flex items-center justify-between border-b bg-background px-6 py-3">
        <div className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          <h1 className="text-xl font-semibold">
            {isMobile ? "Docs" : "Documentation"}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {Math.round(progress)} {t("%_complete")}
          </span>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <SidebarClose
              className={cn(
                "h-5 w-5 transition-transform",
                !isSidebarOpen && "rotate-180"
              )}
            />
          </Button>
        </div>
      </div>
      <Progress value={progress} className="h-1 rounded-none" />
    </>
  );
}
