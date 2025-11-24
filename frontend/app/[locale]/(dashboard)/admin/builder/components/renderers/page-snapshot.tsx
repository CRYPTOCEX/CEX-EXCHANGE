"use client";
import { useRef, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { useBuilderStore } from "@/store/builder-store";
import type { Section } from "@/types/builder";
import SectionRenderer from "./section-renderer";
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
      console.warn(`PageSnapshot: No valid sections for page ${pageId}`);
      return;
    }

    console.log(`PageSnapshot: Processing page ${pageId} with ${sections.length} sections`);
    console.log(`PageSnapshot: Sections:`, sections.map(s => ({ id: s.id, type: s.type || 'unknown' })));

    // Check if we already have snapshots
    const builderState = useBuilderStore.getState();
    const existingSnapshots = builderState.pageSnapshots?.[pageId];

    if (existingSnapshots?.card && existingSnapshots?.preview) {
      if (onSnapshotGenerated) {
        onSnapshotGenerated(existingSnapshots);
      }
      return;
    }

    const generateSnapshot = async () => {
      if (!pageRef.current) return;

      setIsGenerating(true);
      console.log(`Generating snapshots for page ${pageId}`);

      try {
        // Wait for DOM to render
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Generate snapshot with optimized settings
        const dataUrl = await toPng(pageRef.current, {
          backgroundColor: isDarkMode ? "#09090b" : "#ffffff",
          width: 600,
          height: 400,
          style: {
            transform: "scale(0.3)",
            transformOrigin: "top left",
          },
          quality: 0.8,
          pixelRatio: 1.5,
          skipFonts: true,
          fontEmbedCSS: "",
          filter: (node) => {
            // Simple filter to exclude problematic elements
            if (node.tagName) {
              const tagName = node.tagName.toLowerCase();
              const excludedTags = ['script', 'style', 'iframe', 'object', 'embed'];
              if (excludedTags.includes(tagName)) {
                return false;
              }
            }
            return true;
          }
        });

        const snapshots = { card: dataUrl, preview: dataUrl };

        // Update store
        const builderStore = useBuilderStore.getState();
        if (typeof builderStore.setPageSnapshots === 'function') {
          builderStore.setPageSnapshots(pageId, snapshots);
        }

        if (onSnapshotGenerated) {
          onSnapshotGenerated(snapshots);
        }

        console.log(`PageSnapshot: Generated snapshots for page ${pageId}`);
      } catch (error) {
        console.error("PageSnapshot generation failed:", error);
        
        // Create fallback snapshots
        const fallbackSnapshots = {
          card: `/placeholder.svg?height=400&width=600&text=${encodeURIComponent('Preview')}`,
          preview: `/placeholder.svg?height=400&width=600&text=${encodeURIComponent('Preview')}`
        };

        if (onSnapshotGenerated) {
          onSnapshotGenerated(fallbackSnapshots);
        }
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
