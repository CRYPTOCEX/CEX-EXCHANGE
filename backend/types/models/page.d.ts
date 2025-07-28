// Type definitions
interface pageAttributes {
  id: string;
  slug: string;
  path: string;
  title: string;
  content: string;
  description?: string;
  image?: string;
  status: "PUBLISHED" | "DRAFT";
  visits: number;
  order: number;

  // Builder-specific fields
  isHome: boolean;
  isBuilderPage: boolean;
  template?: string;
  category?: string;
  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string;
  ogImage?: string;
  ogTitle?: string;
  ogDescription?: string;

  // Page settings
  settings?: string;
  customCss?: string;
  customJs?: string;

  // Analytics and performance
  lastModifiedBy?: string;
  publishedAt?: Date;

  createdAt?: Date;
  deletedAt?: Date;
  updatedAt?: Date;
}

interface pageCreationAttributes
  extends Omit<pageAttributes, "id" | "createdAt" | "updatedAt" | "deletedAt"> {
  id?: string;
}
