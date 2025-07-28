"use client";

import type React from "react";

import { useState, useEffect } from "react";
import {
  Palette,
  Type,
  AlignCenter,
  Move,
  AlignVerticalSpaceBetweenIcon as SpacingIcon,
  Square,
  BoxSelect,
  Filter,
} from "lucide-react";
import CollapsibleSection from "../../ui/collapsible-section";
import { Appearance } from "./appearance";
import { Alignment } from "./alignment";
import { Sizing } from "./sizing";
import { Spacing } from "./spacing";
import { Border } from "./border";
import { BoxShadow } from "./box-shadow";
import { Filters } from "./filters";
import { Typography } from "./typography";

// Define text-based element types
const TEXT_ELEMENTS = [
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

// Define media element types
const MEDIA_ELEMENTS = ["image", "gallery", "video"];

// Define container element types
const CONTAINER_ELEMENTS = ["container", "columns", "grid"];

interface DesignTabProps {
  settings: Record<string, any>;
  onSettingChange: (key: string, value: any) => void;
  structureType?: "section" | "row" | "column";
  elementType?: string;
}

// Modify the DesignTab component to include structure-specific design settings
export default function DesignTab({
  settings,
  onSettingChange,
  structureType,
  elementType,
}: DesignTabProps) {
  const [openSection, setOpenSection] = useState<string>("appearance");
  const [linkedPaddingVertical, setLinkedPaddingVertical] = useState(false);
  const [linkedPaddingHorizontal, setLinkedPaddingHorizontal] = useState(false);
  const [linkedMarginVertical, setLinkedMarginVertical] = useState(false);
  const [linkedMarginHorizontal, setLinkedMarginHorizontal] = useState(false);

  const [activeGradientProperty, setActiveGradientProperty] = useState<
    string | null
  >(null);

  // Initialize linked states based on settings
  useEffect(() => {
    // Check if padding values are all the same
    if (settings.paddingTop !== undefined) {
      const allPaddingSame =
        settings.paddingTop === settings.paddingRight &&
        settings.paddingTop === settings.paddingBottom &&
        settings.paddingTop === settings.paddingLeft;
      setLinkedPaddingVertical(allPaddingSame);
      setLinkedPaddingHorizontal(allPaddingSame);
    }

    // Check if margin values are all the same
    if (settings.marginTop !== undefined) {
      const allMarginSame =
        settings.marginTop === settings.marginRight &&
        settings.marginTop === settings.marginBottom &&
        settings.marginTop === settings.marginLeft;
      setLinkedMarginVertical(allMarginSame);
      setLinkedMarginHorizontal(allMarginSame);
    }

    // Check if any property has a gradient
    if (
      settings.backgroundColor &&
      typeof settings.backgroundColor === "object" &&
      "type" in settings.backgroundColor &&
      settings.backgroundColor.type === "gradient"
    ) {
      setActiveGradientProperty("backgroundColor");
    } else if (
      settings.color &&
      typeof settings.color === "object" &&
      "type" in settings.color &&
      settings.color.type === "gradient"
    ) {
      setActiveGradientProperty("color");
    } else if (
      settings.borderColor &&
      typeof settings.borderColor === "object" &&
      "type" in settings.borderColor &&
      settings.borderColor.type === "gradient"
    ) {
      setActiveGradientProperty("borderColor");
    } else if (
      settings.boxShadowColor &&
      typeof settings.boxShadowColor === "object" &&
      "type" in settings.boxShadowColor &&
      settings.boxShadowColor.type === "gradient"
    ) {
      setActiveGradientProperty("boxShadowColor");
    } else if (
      settings.hoverBackgroundColor &&
      typeof settings.hoverBackgroundColor === "object" &&
      "type" in settings.hoverBackgroundColor &&
      settings.hoverBackgroundColor.type === "gradient"
    ) {
      setActiveGradientProperty("hoverBackgroundColor");
    } else if (
      settings.hoverColor &&
      typeof settings.hoverColor === "object" &&
      "type" in settings.hoverColor &&
      settings.hoverColor.type === "gradient"
    ) {
      setActiveGradientProperty("hoverColor");
    } else if (
      settings.hoverBorderColor &&
      typeof settings.hoverBorderColor === "object" &&
      "type" in settings.hoverBorderColor &&
      settings.hoverBorderColor.type === "gradient"
    ) {
      setActiveGradientProperty("hoverBorderColor");
    } else {
      setActiveGradientProperty(null);
    }
  }, [settings]);

  const toggleSection = (section: string) =>
    setOpenSection((prev) => (prev === section ? "" : section));

  // Handle padding change with linked option
  const handlePaddingChange = (
    side: "Top" | "Right" | "Bottom" | "Left",
    value: number
  ) => {
    const key = `padding${side}`;

    if ((side === "Top" || side === "Bottom") && linkedPaddingVertical) {
      // Update vertical sides
      onSettingChange("paddingTop", value);
      onSettingChange("paddingBottom", value);
    } else if (
      (side === "Left" || side === "Right") &&
      linkedPaddingHorizontal
    ) {
      // Update horizontal sides
      onSettingChange("paddingLeft", value);
      onSettingChange("paddingRight", value);
    } else {
      // Update only the specified side
      onSettingChange(key, value);
    }
  };

  // Handle margin change with linked option
  const handleMarginChange = (
    side: "Top" | "Right" | "Bottom" | "Left",
    value: number
  ) => {
    const key = `margin${side}`;

    if ((side === "Top" || side === "Bottom") && linkedMarginVertical) {
      // Update vertical sides
      onSettingChange("marginTop", value);
      onSettingChange("marginBottom", value);
    } else if (
      (side === "Left" || side === "Right") &&
      linkedMarginHorizontal
    ) {
      // Update horizontal sides
      onSettingChange("marginLeft", value);
      onSettingChange("marginRight", value);
    } else {
      // Update only the specified side
      onSettingChange(key, value);
    }
  };

  // Toggle linking for padding
  const togglePaddingLink = (axis: "vertical" | "horizontal") => {
    if (axis === "vertical") {
      const newLinkedState = !linkedPaddingVertical;
      setLinkedPaddingVertical(newLinkedState);
      if (newLinkedState) {
        // Sync values when linking
        onSettingChange("paddingBottom", settings.paddingTop || 0);
      }
    } else {
      const newLinkedState = !linkedPaddingHorizontal;
      setLinkedPaddingHorizontal(newLinkedState);
      if (newLinkedState) {
        // Sync values when linking
        onSettingChange("paddingRight", settings.paddingLeft || 0);
      }
    }
  };

  // Toggle linking for margin
  const toggleMarginLink = (axis: "vertical" | "horizontal") => {
    if (axis === "vertical") {
      const newLinkedState = !linkedMarginVertical;
      setLinkedMarginVertical(newLinkedState);
      if (newLinkedState) {
        // Sync values when linking
        onSettingChange("marginBottom", settings.marginTop || 0);
      }
    } else {
      const newLinkedState = !linkedMarginHorizontal;
      setLinkedMarginHorizontal(newLinkedState);
      if (newLinkedState) {
        // Sync values when linking
        onSettingChange("marginRight", settings.marginLeft || 0);
      }
    }
  };

  // Define which sections should be shown based on the element/structure type
  const isTextElement =
    !structureType && elementType && TEXT_ELEMENTS.includes(elementType);
  const isMediaElement =
    !structureType && elementType && MEDIA_ELEMENTS.includes(elementType);
  const isContainerElement =
    !structureType && elementType && CONTAINER_ELEMENTS.includes(elementType);

  const sections: {
    id: string;
    title: string;
    icon: React.ReactNode;
    Component: React.FC<
      {
        settings: Record<string, any>;
        onSettingChange: (key: string, value: any) => void;
      } & any
    >;
    condition?: boolean;
    extraProps?: Record<string, any>;
  }[] = [
    {
      id: "appearance",
      title: "Appearance",
      icon: <Palette size={16} />,
      Component: Appearance,
      extraProps: {
        structureType,
        elementType,
        activeGradientProperty,
        setActiveGradientProperty,
      },
    },
    {
      id: "typography",
      title: "Typography",
      icon: <Type size={16} />,
      Component: Typography,
      // Only show typography for text elements, not for structure types or media elements
      condition: Boolean(isTextElement),
    },
    {
      id: "alignment",
      title: "Alignment",
      icon: <AlignCenter size={16} />,
      Component: Alignment,
      // Show alignment for text elements and container elements
      condition: Boolean(
        isTextElement ||
          isContainerElement ||
          structureType === "row" ||
          structureType === "column"
      ),
      extraProps: { structureType, elementType },
    },
    {
      id: "sizing",
      title: "Sizing",
      icon: <Move size={16} />,
      Component: Sizing,
      extraProps: { structureType, elementType },
    },
    {
      id: "spacing",
      title: "Spacing",
      icon: <SpacingIcon size={16} />,
      Component: Spacing,
      extraProps: {
        structureType,
        linkedPaddingVertical,
        linkedPaddingHorizontal,
        linkedMarginVertical,
        linkedMarginHorizontal,
        handlePaddingChange,
        handleMarginChange,
        togglePaddingLink,
        toggleMarginLink,
      },
    },
    {
      id: "border",
      title: "Border",
      icon: <Square size={16} />,
      Component: Border,
      extraProps: { activeGradientProperty, setActiveGradientProperty },
    },
    {
      id: "boxShadow",
      title: "Box Shadow",
      icon: <BoxSelect size={16} />,
      Component: BoxShadow,
      extraProps: { activeGradientProperty, setActiveGradientProperty },
    },
    {
      id: "filters",
      title: "Filters",
      icon: <Filter size={16} />,
      Component: Filters,
      // Only show filters for media elements
      condition: Boolean(isMediaElement),
    },
  ];

  return (
    <div className="space-y-0 max-w-full overflow-hidden">
      {sections
        .filter(({ condition }) => condition === undefined || condition)
        .map(({ id, title, icon, Component, extraProps }) => (
          <CollapsibleSection
            key={id}
            title={title}
            icon={icon}
            isOpen={openSection === id}
            onToggle={() => toggleSection(id)}
          >
            <div className="max-w-full overflow-x-hidden">
              <Component
                settings={settings}
                onSettingChange={onSettingChange}
                {...(extraProps || {})}
              />
            </div>
          </CollapsibleSection>
        ))}
    </div>
  );
}
