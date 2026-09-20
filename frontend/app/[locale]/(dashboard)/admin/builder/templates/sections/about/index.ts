import { aboutSplitImageStory } from "./split-image-story";
import { aboutTimelineMilestones } from "./timeline-milestones";
import { aboutMissionVisionValues } from "./mission-vision-values";
import { aboutFoundersLetter } from "./founders-letter";
import { aboutNumberedPrinciples } from "./numbered-principles";
import { aboutPhotoGalleryStory } from "./photo-gallery-story";
import { aboutVideoEmbedStory } from "./video-embed-story";
import { aboutFullBleedImage } from "./full-bleed-image";
import { aboutQuoteCentered } from "./quote-centered";
import { aboutTwoColumnRich } from "./two-column-rich";

export const aboutTemplates = [
  aboutSplitImageStory,
  aboutTimelineMilestones,
  aboutMissionVisionValues,
  aboutFoundersLetter,
  aboutNumberedPrinciples,
  aboutPhotoGalleryStory,
  aboutVideoEmbedStory,
  aboutFullBleedImage,
  aboutQuoteCentered,
  aboutTwoColumnRich,
] as const;

export {
  aboutSplitImageStory,
  aboutTimelineMilestones,
  aboutMissionVisionValues,
  aboutFoundersLetter,
  aboutNumberedPrinciples,
  aboutPhotoGalleryStory,
  aboutVideoEmbedStory,
  aboutFullBleedImage,
  aboutQuoteCentered,
  aboutTwoColumnRich,
};
