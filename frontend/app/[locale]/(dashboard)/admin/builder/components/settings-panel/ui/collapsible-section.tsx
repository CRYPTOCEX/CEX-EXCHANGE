"use client";
import { useRef, useState, useEffect, useCallback } from "react";
import type React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  title: string;
  isOpen?: boolean;
  onToggle?: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode; // Add icon prop
}

export function CollapsibleSection({
  title,
  isOpen: isOpenProp,
  onToggle,
  children,
  icon,
}: CollapsibleSectionProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(isOpenProp || false);
  const [height, setHeight] = useState<number | undefined>(
    isOpen ? undefined : 0
  );

  // Use useCallback to memoize the toggle function
  const toggleSection = useCallback(() => {
    setIsOpen((prevOpen) => !prevOpen);
    if (onToggle) {
      onToggle();
    }
  }, [onToggle]);

  useEffect(() => {
    if (!contentRef.current) return;

    if (isOpen) {
      const contentHeight = contentRef.current.scrollHeight;
      setHeight(contentHeight);
    } else {
      setHeight(0);
    }
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(isOpenProp || false);
  }, [isOpenProp]);

  return (
    <div className="border-b border-gray-100 dark:border-zinc-800 w-full overflow-hidden">
      <button
        className="flex w-full items-center justify-between py-2 px-4 text-left text-sm font-medium text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white focus:outline-none"
        onClick={toggleSection}
        type="button"
      >
        <span className="flex items-center gap-2">
          {icon && (
            <span className="text-gray-500 dark:text-zinc-400">{icon}</span>
          )}
          {title}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-gray-500 dark:text-zinc-400 transition-transform duration-150",
            isOpen ? "rotate-180" : ""
          )}
        />
      </button>
      <div
        ref={contentRef}
        style={{ height: height !== undefined ? `${height}px` : "auto" }}
        className={cn(
          "overflow-hidden transition-height duration-150 ease-out",
          isOpen ? "opacity-100" : "opacity-0"
        )}
        onTransitionEnd={() => {
          if (isOpen && height !== undefined) {
            // After opening transition completes, set height to auto
            setHeight(undefined);
          }
        }}
      >
        <div className="px-4 pb-4 pt-2 w-full overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  );
}

export default CollapsibleSection;
