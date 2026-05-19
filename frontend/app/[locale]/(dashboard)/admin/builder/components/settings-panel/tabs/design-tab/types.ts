export interface DesignComponentProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  structureType?: "section" | "row" | "column";
  elementType?: string;
}

export interface AppearanceProps extends DesignComponentProps {
  activeGradientProperty: string | null;
  setActiveGradientProperty: (property: string | null) => void;
}

export interface AlignmentProps extends DesignComponentProps {
  structureType?: "section" | "row" | "column";
  elementType?: string;
}

export interface SizingProps extends DesignComponentProps {
  structureType?: "section" | "row" | "column";
  elementType?: string;
}

export interface SpacingProps extends DesignComponentProps {
  linkedPaddingVertical: boolean;
  linkedPaddingHorizontal: boolean;
  linkedMarginVertical: boolean;
  linkedMarginHorizontal: boolean;
  handlePaddingChange: (
    side: "Top" | "Right" | "Bottom" | "Left",
    value: number
  ) => void;
  handleMarginChange: (
    side: "Top" | "Right" | "Bottom" | "Left",
    value: number
  ) => void;
  togglePaddingLink: (axis: "vertical" | "horizontal") => void;
  toggleMarginLink: (axis: "vertical" | "horizontal") => void;
}

export interface BorderProps extends DesignComponentProps {
  activeGradientProperty: string | null;
  setActiveGradientProperty: (property: string | null) => void;
}

export interface BoxShadowProps extends DesignComponentProps {
  activeGradientProperty: string | null;
  setActiveGradientProperty: (property: string | null) => void;
}

export interface FiltersProps extends DesignComponentProps {}

export interface TransformProps extends DesignComponentProps {}

export interface TypographyProps extends DesignComponentProps {}

export const TEXT_ELEMENTS = [
  "heading",
  "text",
  "button",
  "list",
  "link",
  "icon",
  "quote",
  "card",
  "pricing",
  "cta",
  "notification",
  "feature",
  "testimonial",
  "stats",
];

export const MEDIA_ELEMENTS = ["image", "gallery", "video"];

export const CONTAINER_ELEMENTS = ["container", "columns", "grid"];
