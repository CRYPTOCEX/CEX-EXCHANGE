import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { DocumentationTableOfContents } from "./DocumentationTableOfContents";

interface DocumentationSidebarProps {
  isSidebarOpen: boolean;
  docs: DocSection[];
  activeSection: string;
  readSections: Set<string>;
  onSectionClick: (sectionId: string) => void;
}

export function DocumentationSidebar({
  isSidebarOpen,
  docs,
  activeSection,
  readSections,
  onSectionClick,
}: DocumentationSidebarProps) {
  return (
    <aside
      className={cn(
        "border-r overflow-hidden transition-all duration-300",
        isSidebarOpen ? "w-[280px]" : "w-0"
      )}
    >
      <ScrollArea className="h-[calc(100vh-200px)] pb-8">
        <div className="p-4">
          <DocumentationTableOfContents
            docs={docs}
            activeSection={activeSection}
            readSections={readSections}
            onSectionClick={onSectionClick}
          />
        </div>
      </ScrollArea>
    </aside>
  );
}
