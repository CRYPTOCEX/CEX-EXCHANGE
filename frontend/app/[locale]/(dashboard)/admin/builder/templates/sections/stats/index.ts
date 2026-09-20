import type { Section } from "@/types/builder";
import { statsFourColumnCounters } from "./four-column-counters";
import { statsAnimatedCounters } from "./animated-counters";
import { statsWorldMapDots } from "./world-map-dots";
import { statsVerticalSplit } from "./vertical-split";
import { statsIconPlusNumber } from "./icon-plus-number";
import { statsBeforeAfter } from "./before-after";
import { statsTradingStats } from "./trading-stats";
import { statsGrowthChart } from "./growth-chart";
import { statsMinimalCentered } from "./minimal-centered";
import { statsBentoNumbers } from "./bento-numbers";

export {
  statsFourColumnCounters,
  statsAnimatedCounters,
  statsWorldMapDots,
  statsVerticalSplit,
  statsIconPlusNumber,
  statsBeforeAfter,
  statsTradingStats,
  statsGrowthChart,
  statsMinimalCentered,
  statsBentoNumbers,
};

export const statsTemplates: Section[] = [
  statsFourColumnCounters,
  statsAnimatedCounters,
  statsWorldMapDots,
  statsVerticalSplit,
  statsIconPlusNumber,
  statsBeforeAfter,
  statsTradingStats,
  statsGrowthChart,
  statsMinimalCentered,
  statsBentoNumbers,
];
