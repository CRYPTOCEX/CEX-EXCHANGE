"use client";
import { Button } from "@/components/ui/button";
import { useBuilderStore } from "@/store/builder-store";
import { Monitor, Smartphone, Tablet } from "lucide-react";

export default function DevicePreview() {
  const viewMode = useBuilderStore((state) => state.viewMode);
  const setViewMode = useBuilderStore((state) => state.setViewMode);

  return (
    <div className="flex items-center border rounded-md dark:border-zinc-700">
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-l-md rounded-r-none ${viewMode === "desktop" ? "bg-muted dark:bg-zinc-800" : ""}`}
        onClick={() => setViewMode("desktop")}
        title="Desktop"
      >
        <Monitor className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-none border-l border-r dark:border-zinc-700 ${viewMode === "tablet" ? "bg-muted dark:bg-zinc-800" : ""}`}
        onClick={() => setViewMode("tablet")}
        title="Tablet"
      >
        <Tablet className="h-4 w-4" />
      </Button>
      <Button
        variant="ghost"
        size="icon"
        className={`h-8 w-8 rounded-r-md rounded-l-none ${viewMode === "mobile" ? "bg-muted dark:bg-zinc-800" : ""}`}
        onClick={() => setViewMode("mobile")}
        title="Mobile"
      >
        <Smartphone className="h-4 w-4" />
      </Button>
    </div>
  );
}
