import React from "react";
import MegaMenuPanel from "./mega-menu/panel";

interface PartialMegaMenuProps {
  menu: any;
}

/**
 * PartialMegaMenu:
 * Used when a root item has child items and at least one of these items also has children,
 * but we don't want tabs. It mimics the mega menu "content" panel layout without tab navigation.
 *
 * It creates a pseudo "category" object that passes into MegaMenuPanel, so we can reuse
 * the same UI logic from the mega menu scenario.
 */
export default function PartialMegaMenu({ menu }: PartialMegaMenuProps) {
  const [hoveredExtension, setHoveredExtension] = React.useState<any>(null);

  // Construct a pseudo-category object:
  const category = {
    ...menu,
    description: menu.description || `Explore ${menu.title}`,
  };

  return (
    <div onMouseLeave={() => setHoveredExtension(null)} className="p-4">
      {/* Use MegaMenuPanel to render the two-column structure (left list, right detail) */}
      <MegaMenuPanel
        category={category}
        hoveredExtension={hoveredExtension}
        setHoveredExtension={setHoveredExtension}
      />
    </div>
  );
}
