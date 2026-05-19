"use client";

import { useState, useEffect } from "react";

interface PanelState {
  id: string;
  size: number;
  isCollapsed: boolean;
}

export function usePanelState(
  panelGroupId: string,
  initialPanels: PanelState[]
) {
  const [panels, setPanels] = useState<PanelState[]>(initialPanels);

  // Load saved panel state on mount
  useEffect(() => {
    try {
      const savedState = localStorage.getItem(`panel-state-${panelGroupId}`);
      if (savedState) {
        const parsedState = JSON.parse(savedState) as PanelState[];
        setPanels(parsedState);
      }
    } catch (error) {
      console.error("Failed to load panel state:", error);
    }
  }, [panelGroupId]);

  // Save panel state when it changes
  useEffect(() => {
    try {
      localStorage.setItem(
        `panel-state-${panelGroupId}`,
        JSON.stringify(panels)
      );
    } catch (error) {
      console.error("Failed to save panel state:", error);
    }
  }, [panelGroupId, panels]);

  const updatePanelSize = (id: string, size: number) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === id ? { ...panel, size } : panel))
    );
  };

  const updatePanelCollapsed = (id: string, isCollapsed: boolean) => {
    setPanels((prev) =>
      prev.map((panel) => (panel.id === id ? { ...panel, isCollapsed } : panel))
    );
  };

  return { panels, updatePanelSize, updatePanelCollapsed };
}
