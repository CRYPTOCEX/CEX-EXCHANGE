"use client";

import type React from "react";

import { useState } from "react";
import {
  Code,
  Paintbrush,
  Database,
  FilterX,
  Eye,
  ContrastIcon as Transition,
  Move,
  ScrollText,
  Activity,
  Move3d,
} from "lucide-react";
import CollapsibleSection from "../../ui/collapsible-section";
import { CssIdClasses } from "./css-id-classes";
import { CustomCss } from "./custom-css";
import { Attributes } from "./attributes";
import { Conditions } from "./conditions";
import { Visibility } from "./visibility";
import { Transitions } from "./transitions";
import { Animations } from "./animations";
import { Position } from "./position";
import { ScrollEffects } from "./scroll-effects";
import { Transform } from "../design-tab/transform";
import type { AdvancedTabProps } from "./types";

// Define element type constants for conditional rendering
const TEXT_ELEMENTS = [
  "heading",
  "text",
  "button",
  "list",
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

export default function AdvancedTab({
  elementId,
  settings,
  onSettingChange,
  structureType,
  elementType,
}: AdvancedTabProps) {
  const [openSection, setOpenSection] = useState<string | undefined>(
    "cssIdClasses"
  );

  const toggleSection = (section: string) => {
    setOpenSection((prev) => (prev === section ? undefined : section));
  };

  // Move sections array inside the component to access elementId
  const sections: {
    id: string;
    title: string;
    icon: React.ReactNode;
    Component: React.FC<any>;
    condition?: boolean;
    extraProps?: Record<string, any>;
  }[] = [
    {
      id: "cssIdClasses",
      title: "CSS ID & Classes",
      icon: <Code size={16} />,
      Component: CssIdClasses,
      extraProps: { elementId },
    },
    {
      id: "customCss",
      title: "Custom CSS",
      icon: <Paintbrush size={16} />,
      Component: CustomCss,
    },
    {
      id: "attributes",
      title: "Attributes",
      icon: <Database size={16} />,
      Component: Attributes,
    },
    {
      id: "conditions",
      title: "Conditions",
      icon: <FilterX size={16} />,
      Component: Conditions,
    },
    {
      id: "visibility",
      title: "Visibility",
      icon: <Eye size={16} />,
      Component: Visibility,
    },
    {
      id: "transitions",
      title: "Transitions & Hover",
      icon: <Transition size={16} />,
      Component: Transitions,
      // Transitions make sense for most elements except spacers
      condition: elementType !== "spacer",
    },
    {
      id: "animations",
      title: "Animations",
      icon: <Activity size={16} />,
      Component: Animations,
      // Animations are useful for most elements except spacers and dividers
      condition: elementType !== "spacer" && elementType !== "divider",
    },
    {
      id: "position",
      title: "Position",
      icon: <Move size={16} />,
      Component: Position,
      // Position is useful for all elements
      condition: true,
    },
    {
      id: "transform",
      title: "Transform",
      icon: <Move3d size={16} />,
      Component: Transform,
      // Transform is useful for most elements except spacers and dividers
      condition: elementType !== "spacer" && elementType !== "divider",
    },
    {
      id: "scrollEffects",
      title: "Scroll Effects",
      icon: <ScrollText size={16} />,
      Component: ScrollEffects,
      // Scroll effects are most useful for sections and visible elements, not for spacers or dividers
      condition:
        structureType === "section" ||
        (typeof elementType === "string" &&
          elementType !== "spacer" &&
          elementType !== "divider"),
    },
  ];

  return (
    <div className="space-y-0">
      {sections
        .filter(({ condition }) =>
          condition === undefined ? true : !!condition
        )
        .map(({ id, title, icon, Component, extraProps }) => (
          <CollapsibleSection
            key={id}
            title={title}
            icon={icon}
            isOpen={openSection === id}
            onToggle={() => toggleSection(id)}
          >
            <Component
              settings={settings}
              onSettingChange={onSettingChange}
              {...(extraProps || {})}
            />
          </CollapsibleSection>
        ))}
    </div>
  );
}
