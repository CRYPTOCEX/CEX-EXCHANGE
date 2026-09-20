import { heroCenteredGradient } from "./centered-gradient";
import { heroSplitImageRight } from "./split-image-right";
import { heroSplitImageLeft } from "./split-image-left";
import { heroVideoBackground } from "./video-background";
import { heroAnimatedGradient } from "./animated-gradient";
import { heroGlassOverlay } from "./glass-overlay";
import { heroScreenshotShowcase } from "./screenshot-showcase";
import { heroTerminalCode } from "./terminal-code";
import { heroNumbersHighlight } from "./numbers-highlight";
import { heroMinimalTypography } from "./minimal-typography";

export const heroTemplates = [
  heroCenteredGradient,
  heroSplitImageRight,
  heroSplitImageLeft,
  heroVideoBackground,
  heroAnimatedGradient,
  heroGlassOverlay,
  heroScreenshotShowcase,
  heroTerminalCode,
  heroNumbersHighlight,
  heroMinimalTypography,
] as const;

export {
  heroCenteredGradient,
  heroSplitImageRight,
  heroSplitImageLeft,
  heroVideoBackground,
  heroAnimatedGradient,
  heroGlassOverlay,
  heroScreenshotShowcase,
  heroTerminalCode,
  heroNumbersHighlight,
  heroMinimalTypography,
};
