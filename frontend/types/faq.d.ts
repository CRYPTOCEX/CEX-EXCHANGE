// FAQ Core Types
interface faqAttributes {
  id: string;
  question: string;
  answer: string;
  image?: string;
  category: string;
  tags?: string[];
  status: boolean;
  order: number;
  pagePath: string;
  relatedFaqIds?: string[];
  views?: number;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
}

interface faqCreationAttributes extends Omit<faqAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  id?: string;
}

// FAQ Feedback Types
interface faqFeedbackAttributes {
  id: string;
  faqId: string;
  userId: string;
  isHelpful: boolean;
  comment?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
}

interface faqFeedbackCreationAttributes extends Omit<faqFeedbackAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  id?: string;
}

// FAQ Question Types
interface faqQuestionAttributes {
  id: string;
  userId: string;
  name: string;
  email: string;
  question: string;
  status: 'PENDING' | 'ANSWERED' | 'ARCHIVED' | 'REJECTED';
  answer?: string;
  answeredBy?: string;
  answeredAt?: Date | string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
  deletedAt?: Date | string | null;
}

interface faqQuestionCreationAttributes extends Omit<faqQuestionAttributes, 'id' | 'createdAt' | 'updatedAt' | 'deletedAt'> {
  id?: string;
}

// FAQ Search Types
interface faqSearchAttributes {
  id: string;
  userId?: string;
  query: string;
  resultCount: number;
  category?: string;
  createdAt?: Date | string;
}

interface faqSearchCreationAttributes extends Omit<faqSearchAttributes, 'id' | 'createdAt'> {
  id?: string;
}

// FAQ View Types
interface faqViewAttributes {
  id: string;
  faqId: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  createdAt?: Date | string;
}

interface faqViewCreationAttributes extends Omit<faqViewAttributes, 'id' | 'createdAt'> {
  id?: string;
}

// Page Link Types
interface PageLink {
  id: string;
  name: string;
  path: string;
  icon: string;
  group: string;
}

// API Response Types
interface FAQListResponse {
  items: faqAttributes[];
  pagination?: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    perPage: number;
  };
}

interface FAQSearchResponse {
  results: faqAttributes[];
  query: string;
  totalResults: number;
}

// Store Types
interface FAQStore {
  faqs: faqAttributes[];
  categories: string[];
  loading: boolean;
  error: string | null;
  
  fetchFAQs: () => Promise<void>;
  fetchCategories: () => Promise<void>;
  getFAQById: (id: string) => Promise<faqAttributes | null>;
  searchFAQs: (query: string, category?: string) => Promise<faqAttributes[]>;
  submitFeedback: (faqId: string, isHelpful: boolean, comment?: string) => Promise<boolean>;
  submitQuestion: (email: string, question: string) => Promise<boolean>;
}

interface FAQAdminStore extends FAQStore {
  pageLinks: PageLink[];
  currentPageContext: string | null;
  
  createFAQ: (data: faqCreationAttributes) => Promise<faqAttributes>;
  updateFAQ: (id: string, data: Partial<faqAttributes>) => Promise<faqAttributes>;
  deleteFAQ: (id: string) => Promise<boolean>;
  toggleFAQActive: (id: string, status: boolean) => Promise<boolean>;
  reorderFAQs: (draggedId: string, targetId: string | null, targetPagePath: string | null) => Promise<void>;
  bulkUpdateFAQs: (ids: string[], data: Partial<faqAttributes>) => Promise<void>;
  fetchPageLinks: () => Promise<void>;
  setCurrentPageContext: (pagePath: string | null) => void;
  deletePageWithFAQs: (pagePath: string) => Promise<boolean>;
  enablePageFAQs: (pagePath: string) => Promise<boolean>;
  disablePageFAQs: (pagePath: string) => Promise<boolean>;
}

// Component Props Types
interface FAQAccordionProps {
  faqs?: faqAttributes[];
  title?: string;
  description?: string;
  category?: string;
  showCategories?: boolean;
  variant?: "default" | "card";
  showFeedback?: boolean;
  className?: string;
}

interface FAQFeedbackProps {
  faqId: string;
}

interface FAQWizardProps {
  isOpen: boolean;
  onClose: () => void;
  categories: string[];
}

// Form Types
interface FAQFormData {
  question: string;
  answer: string;
  category: string;
  tags: string[];
  status: boolean;
  pagePath: string;
  image?: string;
  relatedFaqIds?: string[];
}

interface QuestionFormData {
  email: string;
  question: string;
}
