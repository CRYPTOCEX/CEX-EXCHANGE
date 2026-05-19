import { cva } from "class-variance-authority";

/**
 * Header classes for horizontal layout.
 * Supports different navbar types.
 */
export const headerVariants = cva("z-50", {
  variants: {
    navbarType: {
      sticky: "sticky top-0 z-50",
      floating: "has-sticky-header rounded-md sticky top-6 px-6",
      default: "",
      hidden: "",
    },
  },
  defaultVariants: {
    navbarType: "default",
  },
});

/**
 * Footer classes for horizontal layout.
 */
export const footerVariants = cva("", {
  variants: {
    footerType: {
      sticky: "sticky bottom-0",
      default: "",
    },
  },
  defaultVariants: {
    footerType: "default",
  },
});

export function mapNavbarType(
  navbarType: string
): "default" | "sticky" | "floating" | "hidden" {
  if (navbarType === "sticky") return "sticky";
  if (navbarType === "floating") return "floating";
  if (navbarType === "hidden") return "hidden";
  return "default";
}

export function mapFooterType(footerType: string): "default" | "sticky" {
  return footerType === "sticky" ? "sticky" : "default";
}
