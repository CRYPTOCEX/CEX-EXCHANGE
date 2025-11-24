import type { HoverableElementType } from "./context/builder-hover-context";

export type ResizeDirection =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "padding-top"
  | "padding-right"
  | "padding-bottom"
  | "padding-left"
  | "margin-top"
  | "margin-right"
  | "margin-bottom"
  | "margin-left"
  | null;

export interface ResizeProps {
  direction: ResizeDirection;
  onMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  className?: string;
  style?: React.CSSProperties;
}

export interface PaddingProps {
  settings: Record<string, any>;
  isSelected: boolean;
  isHovered: boolean | ((type: HoverableElementType, id: string) => boolean);
  type?: string;
  id?: string;
  resizeDirection: ResizeDirection;
  getPaddingHandleStyle: (
    direction: "top" | "right" | "bottom" | "left"
  ) => React.CSSProperties;
  handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  linkedPaddingVertical: boolean;
  linkedPaddingHorizontal: boolean;
  togglePaddingLink: (
    axis: "vertical" | "horizontal",
    direction?: "top" | "right" | "bottom" | "left",
    e?: React.MouseEvent
  ) => void;
}

export interface MarginProps {
  settings: Record<string, any>;
  isSelected: boolean;
  isHovered: boolean | ((type: HoverableElementType, id: string) => boolean);
  type?: string;
  id?: string;
  resizeDirection: ResizeDirection;
  getMarginHandleStyle: (
    direction: "top" | "right" | "bottom" | "left"
  ) => React.CSSProperties;
  handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
  linkedMarginVertical: boolean;
  linkedMarginHorizontal: boolean;
  toggleMarginLink: (
    axis: "vertical" | "horizontal",
    direction?: "top" | "right" | "bottom" | "left",
    e?: React.MouseEvent
  ) => void;
}

export interface ResizableBaseProps {
  id: string;
  isSelected: boolean;
  onSelect: () => void;
  settings: Record<string, any>;
  updateSettings: (key: string, value: any) => void;
  isStructure?: boolean;
  structureType?: "section" | "row" | "column";
  children: (props: {
    elementRef: React.RefObject<HTMLDivElement | null>;
    isResizing: boolean;
    resizeDirection: ResizeDirection;
    showTooltip: boolean;
    tooltipContent: string;
    tooltipPosition: { x: number; y: number };
    getCursorStyle: () => string;
    getPaddingHandleStyle: (
      direction: "top" | "right" | "bottom" | "left"
    ) => React.CSSProperties;
    getMarginHandleStyle: (
      direction: "top" | "right" | "bottom" | "left"
    ) => React.CSSProperties;
    handleMouseDown: (e: React.MouseEvent, direction: ResizeDirection) => void;
    linkedPaddingVertical: boolean;
    linkedPaddingHorizontal: boolean;
    togglePaddingLink: (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => void;
    linkedMarginVertical: boolean;
    linkedMarginHorizontal: boolean;
    toggleMarginLink: (
      axis: "vertical" | "horizontal",
      direction?: "top" | "right" | "bottom" | "left",
      e?: React.MouseEvent
    ) => void;
  }) => React.ReactNode;
}

export interface MeasurementLabelProps {
  direction: "top" | "right" | "bottom" | "left";
  value: number;
  isActive: boolean;
  isLinked: boolean;
  variant: "padding" | "margin";
  toggleLink: (
    axis: "vertical" | "horizontal",
    direction: "top" | "right" | "bottom" | "left",
    e: React.MouseEvent
  ) => void;
}
