/// <reference path="./models.d.ts" />

interface Post extends postAttributes {
  category?: categoryAttributes;
  author?: Author;
  tags?: tagAttributes[];
  comments?: commentAttributes[];
  relatedPosts?: Post[];
}

interface Tag extends tagAttributes {
  postCount: number;
  posts: Post[];
}

interface Category extends categoryAttributes {
  posts: Post[];
  postCount: number;
}

interface Author extends authorAttributes {
  user: userAttributes & {
    role: roleAttributes;
    profile: {
      bio: string;
    };
  };
  posts: Post[];
}

interface TopAuthor extends Author {
  postCount: number;
}

interface Comment extends commentAttributes {
  user: userAttributes;
}

interface paginationAttributes {
  currentPage: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

interface AnalyticsData {
  date: string;
  views: number;
  visitors: number;
}

interface CategoryDistribution {
  name: string;
  value: number;
  color?: string;
}

interface ContentPerformance {
  id: string;
  title: string;
  views: number;
  comments: number;
  engagement: number;
}
