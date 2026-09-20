"use client";

import React, { memo, useMemo } from "react";
import type { Element } from "@/types/builder";

// Optimized Spacer Element
export const SpacerElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  const height = settings.height || 50;
  const spacerStyle = useMemo(
    (): React.CSSProperties => ({
      height: `${height}px`,
    }),
    [height]
  );
  return (
    <div
      style={spacerStyle}
      className="w-full"
      data-element-id={element.id}
      data-element-type="spacer"
    />
  );
});
SpacerElement.displayName = "SpacerElement";

// Optimized Divider Element
export const DividerElement = memo(({ element }: { element: Element }) => {
  const settings = element.settings || {};
  /**
   * `borderColor` is accepted as an alias for `color`.
   *
   * A divider is visually a border, so 25 section templates set `borderColor` —
   * and this component read only `color`, so every one of them silently fell
   * back to the default and rendered a hairline in the literal colour "gray"
   * instead of the token they asked for. Aliasing here fixes the templates AND
   * any page already published with `borderColor` stored in its content, which
   * editing the templates alone could not do.
   *
   * The default is the border token rather than "gray" so an unstyled divider
   * follows the theme instead of sitting at a fixed mid-grey on both.
   */
  const {
    color,
    borderColor,
    thickness = 1,
    style = "solid",
  } = settings as {
    color?: string;
    borderColor?: string;
    thickness?: number;
    style?: string;
  };
  const line = color ?? borderColor ?? "hsl(var(--border))";
  const dividerStyle = useMemo(
    (): React.CSSProperties => ({
      borderBottom: `${thickness}px ${style} ${line}`,
    }),
    [thickness, style, line]
  );
  return (
    <div
      className="w-full"
      style={dividerStyle}
      data-element-id={element.id}
      data-element-type="divider"
    />
  );
});
DividerElement.displayName = "DividerElement";
