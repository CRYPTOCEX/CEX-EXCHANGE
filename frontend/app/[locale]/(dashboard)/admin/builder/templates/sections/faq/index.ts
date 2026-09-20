import { faqAccordionClassic } from "./accordion-classic";
import { faqTwoColumnGrid } from "./two-column-grid";
import { faqCategorizedTabs } from "./categorized-tabs";
import { faqSearchBarFaqs } from "./search-bar-faqs";
import { faqNumberedList } from "./numbered-list";
import { faqCardGrid } from "./card-grid";
import { faqSidebarCategories } from "./sidebar-categories";
import { faqMinimalDivided } from "./minimal-divided";
import { faqCompactDense } from "./compact-dense";
import { faqFeaturedWithSupport } from "./featured-with-support";

export const faqTemplates = [
  faqAccordionClassic,
  faqTwoColumnGrid,
  faqCategorizedTabs,
  faqSearchBarFaqs,
  faqNumberedList,
  faqCardGrid,
  faqSidebarCategories,
  faqMinimalDivided,
  faqCompactDense,
  faqFeaturedWithSupport,
] as const;

export {
  faqAccordionClassic,
  faqTwoColumnGrid,
  faqCategorizedTabs,
  faqSearchBarFaqs,
  faqNumberedList,
  faqCardGrid,
  faqSidebarCategories,
  faqMinimalDivided,
  faqCompactDense,
  faqFeaturedWithSupport,
};
