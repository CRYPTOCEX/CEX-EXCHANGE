import { blogThreeColumnGrid } from "./three-column-grid";
import { blogFeaturedPlusGrid } from "./featured-plus-grid";
import { blogListView } from "./list-view";
import { blogMasonryLayout } from "./masonry-layout";
import { blogCategorizedTabs } from "./categorized-tabs";
import { blogAuthorSpotlight } from "./author-spotlight";
import { blogNewsletterCtaBlog } from "./newsletter-cta-blog";
import { blogTagCloudSearch } from "./tag-cloud-search";
import { blogCaseStudiesGrid } from "./case-studies-grid";
import { blogMinimalTypographyBlog } from "./minimal-typography-blog";

export const blogTemplates = [
  blogThreeColumnGrid,
  blogFeaturedPlusGrid,
  blogListView,
  blogMasonryLayout,
  blogCategorizedTabs,
  blogAuthorSpotlight,
  blogNewsletterCtaBlog,
  blogTagCloudSearch,
  blogCaseStudiesGrid,
  blogMinimalTypographyBlog,
] as const;

export {
  blogThreeColumnGrid,
  blogFeaturedPlusGrid,
  blogListView,
  blogMasonryLayout,
  blogCategorizedTabs,
  blogAuthorSpotlight,
  blogNewsletterCtaBlog,
  blogTagCloudSearch,
  blogCaseStudiesGrid,
  blogMinimalTypographyBlog,
};
