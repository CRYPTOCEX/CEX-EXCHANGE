"use client";
import { useRef, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { useBuilderStore } from "@/store/builder-store";
import type { Section } from "@/types/builder";
import SectionRenderer from "./renderers/section-renderer";
import { useTheme } from "next-themes";

interface PageSnapshotProps {
  pageId: string;
  sections: Section[];
  onSnapshotGenerated?: (snapshots: { card: string; preview: string }) => void;
}

export function PageSnapshot({
  pageId,
  sections,
  onSnapshotGenerated,
}: PageSnapshotProps) {
  const pageRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";

  useEffect(() => {
    if (isGenerating) return;

    // Validate sections
    if (!Array.isArray(sections) || sections.length === 0) {
      return;
    }

    const generateSnapshot = async () => {
      if (!pageRef.current) return;

      setIsGenerating(true);

      try {
        // Reduced wait time for better performance
        await new Promise((resolve) => setTimeout(resolve, 100));

        // Generate snapshot with optimized settings for speed
        const dataUrl = await toPng(pageRef.current, {
          backgroundColor: isDarkMode ? "#09090b" : "#ffffff",
          width: 600,
          height: 400,
          style: {
            transform: "scale(0.3)",
            transformOrigin: "top left",
          },
          quality: 0.8, // Reduced quality for speed
          pixelRatio: 1.5, // Reduced pixel ratio for speed
          skipFonts: true,
          fontEmbedCSS: "",
        });

        const snapshots = { card: dataUrl, preview: dataUrl };

        // Update store
        useBuilderStore.getState().setPageSnapshots(pageId, snapshots);

        if (onSnapshotGenerated) {
          onSnapshotGenerated(snapshots);
        }
      } catch (error) {
        console.error("PageSnapshot generation failed:", error);
      } finally {
        setIsGenerating(false);
      }
    };

    generateSnapshot();
  }, [pageId, sections, onSnapshotGenerated, isDarkMode, isGenerating]);

  return (
    <div className="absolute -top-[9999px] -left-[9999px] pointer-events-none">
      <div
        ref={pageRef}
        className="w-[1200px] min-h-screen bg-background text-foreground"
        style={{
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
        data-snapshot="true"
      >
        <div className="space-y-0">
          {sections.map((section) => (
            <SectionRenderer key={section.id} section={section} />
          ))}
        </div>
      </div>
    </div>
  );
}
