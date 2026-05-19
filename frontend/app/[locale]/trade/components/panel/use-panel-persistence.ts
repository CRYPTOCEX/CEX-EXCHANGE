"use client";

import { useState, useEffect } from "react";

export interface PanelState {
  id: string;
  size: number;
  isCollapsed: boolean;
  collapseSide?: "start" | "end";
}

interface UsePanelPersistenceProps {
  groupId: string;
  initialPanels: PanelState[];
}

export function usePanelPersistence({
  groupId,
  initialPanels,
}: UsePanelPersistenceProps) {
  const [panels, setPanels] = useState<PanelState[]>(initialPanels);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load saved panel state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`panel-state-${groupId}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as PanelState[];
        setPanels(parsedState);
      }
      setIsLoaded(true);
    } catch (error) {
      console.error("Failed to load panel state:", error);
      setIsLoaded(true);
    }
  }, [groupId]);

  // Save panel state when it changes
  useEffect(() => {
    if (!isLoaded) return;

    try {
      localStorage.setItem(`panel-state-${groupId}`, JSON.stringify(panels));
    } catch (error) {
      console.error("Failed to save panel state:", error);
    }
  }, [groupId, panels, isLoaded]);

  const updatePanelSize = (id: string, size: number) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === id ? { ...panel, size } : panel))
    );
  };

  const updatePanelCollapsed = (
    id: string,
    isCollapsed: boolean,
    collapseSide?: "start" | "end"
  ) => {
    setPanels((prev) =>
      prev.map((panel) =>
        panel.id === id
          ? { ...panel, isCollapsed, ...(collapseSide && { collapseSide }) }
          : panel
      )
    );
  };

  // New function to update panel properties
  const updatePanel = (id: string, updates: Partial<PanelState>) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === id ? { ...panel, ...updates } : panel))
    );
  };

  const resetAllPanels = () => {
    setPanels(initialPanels);
  };

  return {
    panels,
    updatePanelSize,
    updatePanelCollapsed,
    updatePanel,
    resetAllPanels,
    isLoaded,
  };
}
