import { features3ColumnIcons } from "./3-column-icons";
import { features4ColumnGrid } from "./4-column-grid";
import { featuresAlternatingImage } from "./alternating-image";
import { featuresBentoGrid } from "./bento-grid";
import { featuresTabsLayout } from "./tabs-layout";
import { featuresTimelineVertical } from "./timeline-vertical";
import { featuresComparisonTable } from "./comparison-table";
import { featuresFeatureListCheck } from "./feature-list-check";
import { featuresIconCardsHover } from "./icon-cards-hover";
import { featuresZigzagDetailed } from "./zigzag-detailed";

export const featuresTemplates = [
  features3ColumnIcons,
  features4ColumnGrid,
  featuresAlternatingImage,
  featuresBentoGrid,
  featuresTabsLayout,
  featuresTimelineVertical,
  featuresComparisonTable,
  featuresFeatureListCheck,
  featuresIconCardsHover,
  featuresZigzagDetailed,
] as const;

export {
  features3ColumnIcons,
  features4ColumnGrid,
  featuresAlternatingImage,
  featuresBentoGrid,
  featuresTabsLayout,
  featuresTimelineVertical,
  featuresComparisonTable,
  featuresFeatureListCheck,
  featuresIconCardsHover,
  featuresZigzagDetailed,
};
