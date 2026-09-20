import { newsletterCenteredSimple } from "./centered-simple";
import { newsletterSplitImage } from "./split-image";
import { newsletterGradientBand } from "./gradient-band";
import { newsletterDarkCard } from "./dark-card";
import { newsletterWithBadgePerks } from "./with-badge-perks";
import { newsletterInlineFooterStyle } from "./inline-footer-style";
import { newsletterModalPopupPreview } from "./modal-popup-preview";
import { newsletterPhoneCapture } from "./phone-capture";
import { newsletterTwoStepQuiz } from "./two-step-quiz";
import { newsletterMinimalBordered } from "./minimal-bordered";

export const newsletterTemplates = [
  newsletterCenteredSimple,
  newsletterSplitImage,
  newsletterGradientBand,
  newsletterDarkCard,
  newsletterWithBadgePerks,
  newsletterInlineFooterStyle,
  newsletterModalPopupPreview,
  newsletterPhoneCapture,
  newsletterTwoStepQuiz,
  newsletterMinimalBordered,
] as const;

export {
  newsletterCenteredSimple,
  newsletterSplitImage,
  newsletterGradientBand,
  newsletterDarkCard,
  newsletterWithBadgePerks,
  newsletterInlineFooterStyle,
  newsletterModalPopupPreview,
  newsletterPhoneCapture,
  newsletterTwoStepQuiz,
  newsletterMinimalBordered,
};
