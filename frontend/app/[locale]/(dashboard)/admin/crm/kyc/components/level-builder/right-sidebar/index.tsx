"use client";
import { motion } from "framer-motion";
import { useState, useRef, useEffect } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { FieldEditor } from "./field-editor";
import { Header } from "./header";
import { FieldSummary } from "./field-summary";
import { NoFieldSelected } from "./no-field-selected";

interface RightSidebarProps {
  selectedField: KycField | null;
  setSelectedField: (field: KycField | null) => void;
  handleUpdateField: (field: KycField) => void;
  activeFields: KycField[];
  setRightSidebarOpen: (open: boolean) => void;
  handleAddField?: (type: KycFieldType) => void;
  levelNumber: number;
}

export function RightSidebar({
  selectedField,
  setSelectedField,
  handleUpdateField,
  activeFields,
  setRightSidebarOpen,
  levelNumber,
}: RightSidebarProps) {
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [sidebarHeight, setSidebarHeight] = useState<number>(0);
  const headerRef = useRef<HTMLDivElement>(null);
  const summaryRef = useRef<HTMLDivElement>(null);

  // Calculate the sidebar height on mount and window resize
  useEffect(() => {
    const updateHeight = () => {
      if (sidebarRef.current) {
        setSidebarHeight(sidebarRef.current.clientHeight);
      }
    };

    // Initial calculation
    updateHeight();

    // Update on resize
    window.addEventListener("resize", updateHeight);
    return () => window.removeEventListener("resize", updateHeight);
  }, []);

  // Calculate the available height for the scroll area
  const [scrollAreaHeight, setScrollAreaHeight] = useState<number>(0);

  useEffect(() => {
    const calculateScrollHeight = () => {
      const headerHeight = headerRef.current?.clientHeight || 0;
      const summaryHeight = summaryRef.current?.clientHeight || 0;

      // Calculate available height (subtract header and summary from total sidebar height)
      const availableHeight =
        sidebarHeight - headerHeight - (selectedField ? summaryHeight : 0);
      setScrollAreaHeight(Math.max(availableHeight, 300)); // Set a minimum height
    };

    calculateScrollHeight();
    // Recalculate when sidebar height changes or when selectedField changes
    window.addEventListener("resize", calculateScrollHeight);
    return () => window.removeEventListener("resize", calculateScrollHeight);
  }, [sidebarHeight, selectedField]);

  return (
    <motion.div
      ref={sidebarRef}
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 350, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="border-l border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 overflow-hidden relative h-full"
    >
      <div className="h-full flex flex-col">
        {/* Header */}
        <Header
          levelNumber={levelNumber}
          onClose={() => setRightSidebarOpen(false)}
          headerRef={headerRef}
        />

        {/* Content */}
        <div className="flex-1 overflow-hidden">
          {selectedField ? (
            <div className="flex flex-col h-full">
              {/* Field summary */}
              <FieldSummary
                field={selectedField}
                onClose={() => setSelectedField(null)}
                summaryRef={summaryRef}
              />

              {/* Field editor */}
              <ScrollArea
                className="flex-1"
                style={{ height: `${scrollAreaHeight}px` }}
              >
                <div className="p-4">
                  <FieldEditor
                    field={selectedField}
                    onUpdate={handleUpdateField}
                    onCancel={() => setSelectedField(null)}
                    allFields={activeFields}
                  />
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <ScrollArea
                className="flex-1"
                style={{ height: `${scrollAreaHeight}px` }}
              >
                <NoFieldSelected />
              </ScrollArea>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
}
