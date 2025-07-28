"use client";
import type React from "react";
import { createContext, useContext, useState, useCallback } from "react";

export type HoverableElementType = "section" | "row" | "column" | "element";
type HoverState = {
  type: HoverableElementType | null;
  id: string | null;
};

interface BuilderHoverContextType {
  hoveredElement: HoverState;
  setHoveredElement: (type: HoverableElementType, id: string | null) => void;
  clearHover: () => void;
  isHovered: (type: HoverableElementType, id: string) => boolean;
}

const BuilderHoverContext = createContext<BuilderHoverContextType | undefined>(
  undefined
);

export function BuilderHoverProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [hoveredElement, setHoveredElementState] = useState<HoverState>({
    type: null,
    id: null,
  });

  const setHoveredElement = useCallback(
    (type: HoverableElementType, id: string | null) => {
      setHoveredElementState({ type, id });
    },
    []
  );

  const clearHover = useCallback(() => {
    setHoveredElementState({ type: null, id: null });
  }, []);

  const isHovered = useCallback(
    (type: HoverableElementType, id: string) => {
      return hoveredElement.type === type && hoveredElement.id === id;
    },
    [hoveredElement]
  );

  return (
    <BuilderHoverContext.Provider
      value={{ hoveredElement, setHoveredElement, clearHover, isHovered }}
    >
      {children}
    </BuilderHoverContext.Provider>
  );
}

export function useBuilderHover() {
  const context = useContext(BuilderHoverContext);
  if (context === undefined) {
    throw new Error(
      "useBuilderHover must be used within a BuilderHoverProvider"
    );
  }
  return context;
}
