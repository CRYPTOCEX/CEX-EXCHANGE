import { team3ColumnPhotos } from "./3-column-photos";
import { team4ColumnCompact } from "./4-column-compact";
import { teamLeadershipSpotlight } from "./leadership-spotlight";
import { teamWithSocialLinks } from "./with-social-links";
import { teamMasonryTeam } from "./masonry-team";
import { teamScrollableRow } from "./scrollable-row";
import { teamFoundersFeature } from "./founders-feature";
import { teamDepartmentsTabbed } from "./departments-tabbed";
import { teamMinimalList } from "./minimal-list";
import { teamCardHoverReveal } from "./card-hover-reveal";

export const teamTemplates = [
  team3ColumnPhotos,
  team4ColumnCompact,
  teamLeadershipSpotlight,
  teamWithSocialLinks,
  teamMasonryTeam,
  teamScrollableRow,
  teamFoundersFeature,
  teamDepartmentsTabbed,
  teamMinimalList,
  teamCardHoverReveal,
] as const;

export {
  team3ColumnPhotos,
  team4ColumnCompact,
  teamLeadershipSpotlight,
  teamWithSocialLinks,
  teamMasonryTeam,
  teamScrollableRow,
  teamFoundersFeature,
  teamDepartmentsTabbed,
  teamMinimalList,
  teamCardHoverReveal,
};
