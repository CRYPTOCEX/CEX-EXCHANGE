"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { $fetch } from "@/lib/api";
import { PageSnapshot } from "./components/renderers/page-snapshot";
import { ScrollableSnapshot } from "./components/shared/scrollable-snapshot";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useRouter } from "@/i18n/routing";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/status-badge";
import { Icon } from "@/components/ui/icon";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTranslations } from "next-intl";
import { PageShell } from "@/components/layout/page-shell";
import { Loadable, SkeletonBlock, SkeletonText } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
interface Page {
  id: string;
  title: string;
  slug: string;
  path: string;
  description: string;
  image: string | null;
  status: "PUBLISHED" | "DRAFT";
  isHome: boolean;
  isBuilderPage: boolean;
  template: string;
  category: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  visits: number;
  order: number;
  parsedContent?: any;
}
interface PaginationInfo {
  totalItems: number;
  currentPage: number;
  perPage: number;
  totalPages: number;
}

/**
 * How many pending cards to paint while GET /api/content/page is out.
 *
 * The grid is `md:grid-cols-2 lg:grid-cols-3`, so six is exactly two complete
 * rows at both breakpoints — a ragged final row would read as "that is the last
 * page" before any had been counted. A card is a fixed `h-[200px]` preview plus
 * a ~120px header, so two rows plus the `gap-6` is ~680px against the 256px
 * `h-64` spinner it replaces.
 */
const PENDING_CARD_COUNT = 6;

/**
 * What a card reads from before its page arrives.
 *
 * Deleting the spinner deletes the narrowing that guaranteed a card HAD a page,
 * and one frozen constant is the replacement rather than `?.` through sixty
 * lines of card. Both booleans are false on purpose: `isBuilderPage` false
 * sends the preview box down its plain "content page" branch, which is the only
 * one of the three that does not depend on a snapshot having been generated,
 * and `isHome` false keeps the pending card from claiming to be the homepage.
 */
const PENDING_PAGE: Page = {
  id: "",
  title: "",
  slug: "",
  path: "",
  description: "",
  image: null,
  status: "DRAFT",
  isHome: false,
  isBuilderPage: false,
  template: "",
  category: "",
  content: "",
  createdAt: "",
  updatedAt: "",
  publishedAt: null,
  visits: 0,
  order: 0,
};
interface ApiResponse {
  items: Page[];
  pagination: PaginationInfo;
}
interface TemplatePageData {
  title: string;
  slug: string;
  description: string;
  icon: string;
  category: string;
  isBuilderPage: boolean;
  defaultContent: string | object;
}

// Page Templates Configuration
const PAGE_TEMPLATES: TemplatePageData[] = [
  {
    title: "Home Page",
    slug: "home",
    description:
      "Create a beautiful home page with hero section, features, and call-to-actions",
    icon: "mdi:home",
    category: "Essential",
    isBuilderPage: true,
    defaultContent: {
      sections: [
        {
          id: "hero",
          type: "hero",
          content: {
            title: "Welcome to Our Website",
            subtitle: "Discover amazing solutions for your business",
            description:
              "We provide exceptional services that help your business grow and succeed in today's competitive market.",
            buttonText: "Get Started",
            buttonLink: "/contact",
            backgroundImage: "",
            alignment: "center",
          },
        },
        {
          id: "features",
          type: "features",
          content: {
            title: "Why Choose Us",
            subtitle: "Our key advantages",
            features: [
              {
                title: "Professional Service",
                description: "High-quality solutions tailored to your needs",
                icon: "mdi:star",
              },
              {
                title: "Fast Delivery",
                description:
                  "Quick turnaround times without compromising quality",
                icon: "mdi:rocket",
              },
              {
                title: "24/7 Support",
                description: "Round-the-clock assistance whenever you need it",
                icon: "mdi:support",
              },
            ],
          },
        },
        {
          id: "cta",
          type: "cta",
          content: {
            title: "Ready to Get Started?",
            description:
              "Join thousands of satisfied customers who trust our services.",
            buttonText: "Contact Us Now",
            buttonLink: "/contact",
          },
        },
      ],
    },
  },
  {
    title: "About Us",
    slug: "about",
    description: "Tell your company story and showcase your team",
    icon: "mdi:information-outline",
    category: "Essential",
    isBuilderPage: false,
    defaultContent: `
      <h1>About Our Company</h1>
      
      <p>We are a dedicated team of professionals committed to delivering exceptional results for our clients. Our journey began with a simple mission: to provide innovative solutions that make a real difference.</p>
      
      <h2>Our Mission</h2>
      <p>To empower businesses with cutting-edge solutions and unparalleled service, helping them achieve their goals and exceed their expectations.</p>
      
      <h2>Our Vision</h2>
      <p>To be the leading provider of innovative solutions in our industry, recognized for our commitment to excellence, integrity, and customer satisfaction.</p>
      
      <h2>Our Values</h2>
      <ul>
        <li><strong>Excellence:</strong> We strive for the highest quality in everything we do</li>
        <li><strong>Innovation:</strong> We embrace new technologies and creative solutions</li>
        <li><strong>Integrity:</strong> We conduct business with honesty and transparency</li>
        <li><strong>Customer Focus:</strong> Our clients' success is our priority</li>
      </ul>
      
      <h2>Our Team</h2>
      <p>Our experienced team brings together diverse skills and expertise to deliver comprehensive solutions. We believe in continuous learning and professional development to stay at the forefront of our industry.</p>
      
      <p>Contact us today to learn more about how we can help your business succeed.</p>
    `,
  },
  {
    title: "Contact Us",
    slug: "contact",
    description: "Create a contact page with form and business information",
    icon: "mdi:email-outline",
    category: "Essential",
    isBuilderPage: false,
    defaultContent: `
      <h1>Contact Us</h1>
      
      <p>We'd love to hear from you. Get in touch with us using any of the methods below, or fill out our contact form and we'll get back to you as soon as possible.</p>
      
      <h2>Get In Touch</h2>
      
      <div class="contact-info">
        <h3>Business Information</h3>
        <p><strong>Address:</strong> 123 Business Street, City, State 12345</p>
        <p><strong>Phone:</strong> (555) 123-4567</p>
        <p><strong>Email:</strong> info@yourcompany.com</p>
        <p><strong>Business Hours:</strong></p>
        <ul>
          <li>Monday - Friday: 9:00 AM - 6:00 PM</li>
          <li>Saturday: 10:00 AM - 4:00 PM</li>
          <li>Sunday: Closed</li>
        </ul>
      </div>
      
      <h3>Send Us a Message</h3>
      <p>Fill out the form below and we'll respond within 24 hours:</p>
      
      <form class="contact-form">
        <div class="form-group">
          <label for="name">Full Name *</label>
          <input type="text" id="name" name="name" required>
        </div>
        
        <div class="form-group">
          <label for="email">Email Address *</label>
          <input type="email" id="email" name="email" required>
        </div>
        
        <div class="form-group">
          <label for="phone">Phone Number</label>
          <input type="tel" id="phone" name="phone">
        </div>
        
        <div class="form-group">
          <label for="subject">Subject *</label>
          <input type="text" id="subject" name="subject" required>
        </div>
        
        <div class="form-group">
          <label for="message">Message *</label>
          <textarea id="message" name="message" rows="5" required></textarea>
        </div>
        
        <button type="submit" class="submit-btn">Send Message</button>
      </form>
      
      <style>
        .contact-info { margin: 2rem 0; }
        .contact-form { max-width: 600px; margin: 2rem 0; }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
        .form-group input, .form-group textarea { width: 100%; padding: 0.5rem; border: 1px solid hsl(var(--border)); border-radius: 4px; }
        .submit-btn { background: hsl(var(--primary)); color: hsl(var(--primary-foreground)); padding: 0.75rem 1.5rem; border: none; border-radius: 4px; cursor: pointer; }
        .submit-btn:hover { background: hsl(var(--primary) / 0.85); }
      </style>
    `,
  },
  {
    title: "Privacy Policy",
    slug: "privacy-policy",
    description: "Comprehensive privacy policy for legal compliance",
    icon: "mdi:shield-check-outline",
    category: "Legal",
    isBuilderPage: false,
    defaultContent: `
      <h1>Privacy Policy</h1>
      
      <p><strong>Last updated:</strong> [Date]</p>
      
      <p>This Privacy Policy describes how [Your Company Name] ("we," "our," or "us") collects, uses, and shares your personal information when you visit or use our website.</p>
      
      <h2>Information We Collect</h2>
      
      <h3>Information You Provide</h3>
      <ul>
        <li>Contact information (name, email, phone number)</li>
        <li>Account information (username, password)</li>
        <li>Communication preferences</li>
        <li>Feedback and survey responses</li>
      </ul>
      
      <h3>Information We Collect Automatically</h3>
      <ul>
        <li>IP address and location data</li>
        <li>Browser and device information</li>
        <li>Usage patterns and preferences</li>
        <li>Cookies and similar tracking technologies</li>
      </ul>
      
      <h2>How We Use Your Information</h2>
      <p>We use your information to:</p>
      <ul>
        <li>Provide and improve our services</li>
        <li>Communicate with you about our services</li>
        <li>Personalize your experience</li>
        <li>Analyze usage and improve our website</li>
        <li>Comply with legal obligations</li>
      </ul>
      
      <h2>Information Sharing</h2>
      <p>We may share your information with:</p>
      <ul>
        <li>Service providers who assist our operations</li>
        <li>Business partners with your consent</li>
        <li>Legal authorities when required by law</li>
      </ul>
      
      <h2>Data Security</h2>
      <p>We implement appropriate security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction.</p>
      
      <h2>Your Rights</h2>
      <p>You have the right to:</p>
      <ul>
        <li>Access your personal information</li>
        <li>Correct inaccurate information</li>
        <li>Delete your personal information</li>
        <li>Object to processing of your information</li>
        <li>Data portability</li>
      </ul>
      
      <h2>Cookies</h2>
      <p>We use cookies to enhance your browsing experience. You can control cookie settings through your browser preferences.</p>
      
      <h2>Updates to This Policy</h2>
      <p>We may update this Privacy Policy from time to time. We will notify you of any material changes by posting the new policy on this page.</p>
      
      <h2>Contact Us</h2>
      <p>If you have questions about this Privacy Policy, please contact us at:</p>
      <p>Email: privacy@yourcompany.com<br>
      Address: [Your Company Address]</p>
    `,
  },
  {
    title: "Terms of Service",
    slug: "terms-of-service",
    description: "Legal terms and conditions for your website",
    icon: "mdi:file-document-outline",
    category: "Legal",
    isBuilderPage: false,
    defaultContent: `
      <h1>Terms of Service</h1>
      
      <p><strong>Last updated:</strong> [Date]</p>
      
      <p>These Terms of Service ("Terms") govern your use of [Your Company Name]'s website and services. By accessing or using our services, you agree to be bound by these Terms.</p>
      
      <h2>Acceptance of Terms</h2>
      <p>By using our website and services, you confirm that you accept these Terms and agree to comply with them. If you do not agree to these Terms, you must not use our services.</p>
      
      <h2>Use of Our Services</h2>
      
      <h3>Permitted Use</h3>
      <p>You may use our services for lawful purposes only. You agree not to use our services:</p>
      <ul>
        <li>In any way that violates applicable laws or regulations</li>
        <li>To harm, threaten, or harass others</li>
        <li>To distribute spam or malicious content</li>
        <li>To interfere with our services or servers</li>
      </ul>
      
      <h3>Account Responsibilities</h3>
      <p>If you create an account, you are responsible for:</p>
      <ul>
        <li>Maintaining the security of your account</li>
        <li>All activities that occur under your account</li>
        <li>Providing accurate and current information</li>
      </ul>
      
      <h2>Intellectual Property</h2>
      <p>Our services and content are protected by copyright, trademark, and other intellectual property laws. You may not:</p>
      <ul>
        <li>Copy, modify, or distribute our content without permission</li>
        <li>Use our trademarks or branding</li>
        <li>Reverse engineer our software or services</li>
      </ul>
      
      <h2>User Content</h2>
      <p>You retain ownership of content you submit to our services. By submitting content, you grant us a license to use, modify, and display that content in connection with our services.</p>
      
      <h2>Disclaimers</h2>
      <p>Our services are provided "as is" without warranties of any kind. We do not guarantee that our services will be uninterrupted, secure, or error-free.</p>
      
      <h2>Limitation of Liability</h2>
      <p>To the maximum extent permitted by law, we shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services.</p>
      
      <h2>Indemnification</h2>
      <p>You agree to indemnify and hold us harmless from any claims, damages, or expenses arising from your use of our services or violation of these Terms.</p>
      
      <h2>Termination</h2>
      <p>We may terminate your access to our services at any time, with or without cause, with or without notice.</p>
      
      <h2>Changes to Terms</h2>
      <p>We reserve the right to modify these Terms at any time. We will notify users of material changes by posting the updated Terms on our website.</p>
      
      <h2>Governing Law</h2>
      <p>These Terms are governed by the laws of [Your Jurisdiction], without regard to conflict of law principles.</p>
      
      <h2>Contact Information</h2>
      <p>If you have questions about these Terms, please contact us at:</p>
      <p>Email: legal@yourcompany.com<br>
      Address: [Your Company Address]</p>
    `,
  },
  {
    title: "Cookie Policy",
    slug: "cookie-policy",
    description: "Detailed information about cookie usage on your website",
    icon: "mdi:cookie",
    category: "Legal",
    isBuilderPage: false,
    defaultContent: `
      <h1>Cookie Policy</h1>
      
      <p><strong>Last updated:</strong> [Date]</p>
      
      <p>This Cookie Policy explains how [Your Company Name] uses cookies and similar technologies when you visit our website.</p>
      
      <h2>What Are Cookies?</h2>
      <p>Cookies are small text files that are placed on your device when you visit a website. They help websites remember your preferences and improve your browsing experience.</p>
      
      <h2>Types of Cookies We Use</h2>
      
      <h3>Essential Cookies</h3>
      <p>These cookies are necessary for the website to function properly. They enable basic functions like page navigation and access to secure areas.</p>
      <ul>
        <li><strong>Session cookies:</strong> Deleted when you close your browser</li>
        <li><strong>Authentication cookies:</strong> Remember your login status</li>
        <li><strong>Security cookies:</strong> Protect against security threats</li>
      </ul>
      
      <h3>Analytics Cookies</h3>
      <p>These cookies help us understand how visitors interact with our website by collecting and reporting information anonymously.</p>
      <ul>
        <li><strong>Google Analytics:</strong> Track website usage and performance</li>
        <li><strong>Heat mapping:</strong> Understand user behavior patterns</li>
      </ul>
      
      <h3>Functional Cookies</h3>
      <p>These cookies enable enhanced functionality and personalization, such as remembering your preferences.</p>
      <ul>
        <li><strong>Language preferences:</strong> Remember your language choice</li>
        <li><strong>Theme preferences:</strong> Remember your display preferences</li>
        <li><strong>Location data:</strong> Provide location-based services</li>
      </ul>
      
      <h3>Marketing Cookies</h3>
      <p>These cookies are used to deliver relevant advertisements and track advertising campaign effectiveness.</p>
      <ul>
        <li><strong>Advertising cookies:</strong> Show relevant ads based on interests</li>
        <li><strong>Social media cookies:</strong> Enable social sharing features</li>
        <li><strong>Retargeting cookies:</strong> Show ads on other websites</li>
      </ul>
      
      <h2>Third-Party Cookies</h2>
      <p>We may allow third-party services to set cookies on our website:</p>
      <ul>
        <li><strong>Google Analytics:</strong> Web analytics service</li>
        <li><strong>Social Media Plugins:</strong> Facebook, Twitter, LinkedIn</li>
        <li><strong>Advertising Networks:</strong> Google Ads, Facebook Ads</li>
      </ul>
      
      <h2>Managing Cookies</h2>
      
      <h3>Browser Settings</h3>
      <p>You can control cookies through your browser settings:</p>
      <ul>
        <li>Block all cookies</li>
        <li>Block third-party cookies only</li>
        <li>Delete existing cookies</li>
        <li>Receive notifications when cookies are set</li>
      </ul>
      
      <h3>Cookie Preferences</h3>
      <p>You can also manage your cookie preferences using our cookie consent tool available on our website.</p>
      
      <h2>Impact of Disabling Cookies</h2>
      <p>Disabling cookies may affect website functionality:</p>
      <ul>
        <li>Some features may not work properly</li>
        <li>You may need to re-enter information</li>
        <li>Personalized content may not be available</li>
        <li>Analytics data collection will be limited</li>
      </ul>
      
      <h2>Updates to This Policy</h2>
      <p>We may update this Cookie Policy to reflect changes in our practices or for legal reasons. Please check this page regularly for updates.</p>
      
      <h2>Contact Us</h2>
      <p>If you have questions about our use of cookies, please contact us at:</p>
      <p>Email: privacy@yourcompany.com<br>
      Address: [Your Company Address]</p>
      
      <h2>Useful Links</h2>
      <ul>
        <li><a href="https://www.allaboutcookies.org/">All About Cookies</a></li>
        <li><a href="https://tools.google.com/dlpage/gaoptout">Google Analytics Opt-out</a></li>
        <li><a href="https://www.facebook.com/policies/cookies/">Facebook Cookie Policy</a></li>
      </ul>
    `,
  },
];
export default function PageBuilderPage() {
  const t = useTranslations("dashboard_admin");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const { toast } = useToast();
  const [pages, setPages] = useState<Page[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({
    totalItems: 0,
    currentPage: 1,
    perPage: 10,
    totalPages: 1,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCreatingPage, setIsCreatingPage] = useState<string | null>(null);
  const [pageSnapshots, setPageSnapshots] = useState<
    Record<
      string,
      {
        card: string;
        preview: string;
      }
    >
  >({});
  const fetchPages = async (page = 1) => {
    try {
      setIsLoading(true);
      const response = await $fetch<ApiResponse>({
        /**
         * `perPage`, NOT `limit`. `getFiltered` looks for `perPage`, so this
         * list has been serving the default page size regardless of the
         * picker.
         *
         * DELIBERATELY UNFILTERED, even though only builder pages are drawn
         * (see `cards` below). The rows are wanted for two different jobs and
         * only one of them is the grid: `existingPageSlugs` uses this list to
         * decide which TEMPLATES are still available, and five of the six
         * templates create non-builder pages. Filtering here would drop those
         * rows, and the Cookie Policy / Privacy / Terms templates would be
         * offered for ever after they had been created — with the second
         * create failing on the slug unique index rather than being prevented.
         */
        url: `/api/admin/content/page?page=${page}&perPage=${pagination.perPage}`,
        method: "GET",
        silentSuccess: true,
      });
      if (response.data && response.data.items) {
        const pagesWithParsedContent = response.data.items.map((page) => {
          let parsedContent: any = null;
          
          if (page.content && page.isBuilderPage) {
            try {
              parsedContent = JSON.parse(page.content);
              console.log(`Parsed content for page ${page.title}:`, {
                sectionsCount: parsedContent?.sections?.length || 0,
                sections: parsedContent?.sections?.map((s: any) => ({ id: s.id, type: s.type })) || []
              });
            } catch (error) {
              console.error(`Failed to parse content for page ${page.title}:`, error);
              console.log('Raw content:', page.content);
            }
          }
          
          return {
            ...page,
            parsedContent
          };
        });
        setPages(pagesWithParsedContent);
        setPagination(response.data.pagination);
      } else {
        setPages([]);
        setPagination({
          totalItems: 0,
          currentPage: 1,
          perPage: 10,
          totalPages: 1,
        });
      }
    } catch (error) {
      console.error("Failed to fetch pages:", error);
      toast({
        title: tCommon("error"),
        description: t("failed_to_load_pages_please_try_again"),
        variant: "destructive",
      });
      setPages([]);
    } finally {
      setIsLoading(false);
    }
  };
  useEffect(() => {
    fetchPages(1);
  }, []);

  // Handle snapshot generation for builder pages
  const handleSnapshotGenerated = useCallback(
    (
      pageId: string,
      snapshots: {
        card: string;
        preview: string;
      }
    ) => {
      console.log('Snapshot generated for page:', pageId, 'snapshots:', snapshots);
      setPageSnapshots((prev) => ({
        ...prev,
        [pageId]: snapshots,
      }));
    },
    []
  );

  // Generate snapshots for builder pages that don't have them yet
  const builderPagesNeedingSnapshots = pages.filter(
    (page) =>
      page.isBuilderPage && page.parsedContent && !pageSnapshots[page.id]
  );

  console.log('=== PAGE ANALYSIS ===');
  console.log('Total pages:', pages.length);
  console.log('Builder pages needing snapshots:', builderPagesNeedingSnapshots.length);
  console.log('Current page snapshots:', Object.keys(pageSnapshots));
  
  // Debug each page
  pages.forEach((page, index) => {
    console.log(`Page ${index + 1}:`, {
      id: page.id,
      title: page.title,
      isBuilderPage: page.isBuilderPage,
      hasParsedContent: !!page.parsedContent,
      sectionsCount: page.parsedContent?.sections?.length || 0,
      hasSnapshot: !!pageSnapshots[page.id],
      rawContent: page.content ? page.content.substring(0, 100) + '...' : 'No content'
    });
  });

  const handleEditPage = (pageId: string) => {
    router.push(`/admin/builder/${pageId}`);
  };
  const handleCreatePageFromTemplate = async (template: TemplatePageData) => {
    try {
      setIsCreatingPage(template.slug);
      const pageData = {
        title: template.title,
        slug: template.slug,
        description: template.description,
        content:
          typeof template.defaultContent === "string"
            ? template.defaultContent
            : JSON.stringify(template.defaultContent),
        status: "DRAFT",
        isBuilderPage: template.isBuilderPage,
        template: template.slug,
        category: template.category,
        isHome: template.slug === "home",
      };
      const response = await $fetch({
        url: `/api/admin/content/page`,
        method: "POST",
        body: pageData,
      });
      if (response.data) {
        toast({
          title: tCommon("success"),
          description: t("page_created_successfully", { title: String(template.title) }),
        });

        // Navigate to edit the new page
        router.push(`/admin/builder/${response.data.id}`);
      } else {
        throw new Error("Failed to create page");
      }
    } catch (error: any) {
      console.error("Failed to create page:", error);
      toast({
        title: tCommon("error"),
        description:
          error?.message ||
          t("failed_to_create_page_please_try_again", { title: String(template.title) }),
        variant: "destructive",
      });
    } finally {
      setIsCreatingPage(null);
    }
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  // Filter out templates that already have existing pages
  const existingPageSlugs = pages.map((page) => page.slug);
  const availableTemplates = PAGE_TEMPLATES.filter(
    (template) => !existingPageSlugs.includes(template.slug)
  );

  /**
   * ONE grid for both states — a `null` cell is a card whose page has not
   * landed yet.
   */
  /**
   * ONLY BUILDER DOCUMENTS ARE DRAWN, and that is a GUARD rather than a tidy-up.
   *
   * A page added from the Pages studio stores plain HTML in this same table.
   * This editor loads a row by `JSON.parse`ing `content`, gets nothing, and
   * then SAVES `content: JSON.stringify(currentPage)` with `isBuilderPage:
   * true` hardcoded — so opening one here and pressing save replaced the
   * owner's page with an empty builder document, with no undo. Not drawing a
   * card for it is what makes that unreachable by clicking; the editor route
   * guards the typed-URL case itself.
   *
   * Filtered HERE rather than in the query because `pages` is also what
   * `existingPageSlugs` above dedupes the template list against, and that
   * needs every row — see the note on the fetch.
   */
  const builderPages = pages.filter((page) => page.isBuilderPage);

  const cards: Array<Page | null> = isLoading
    ? Array.from({ length: PENDING_CARD_COUNT }, () => null)
    : builderPages;

  /**
   * "No pages found" is a RESULT and needs a finished request to be one.
   * `pages` is `[]` before the response, so without `!isLoading` this admin
   * screen would open on a full-width "No pages found" card and then replace it
   * with the grid — and the sentence is doubly wrong here, because the same
   * false premise also drives the subtitle above.
   */
  const showEmptyState = !isLoading && pages.length === 0;

  // Group available templates by category
  const templatesByCategory = availableTemplates.reduce(
    (acc, template) => {
      if (!acc[template.category]) {
        acc[template.category] = [];
      }
      acc[template.category].push(template);
      return acc;
    },
    {} as Record<string, TemplatePageData[]>
  );
  return (
    <PageShell rhythm="none">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl mb-2">{t("page_builder")}</h1>
        <p className="text-muted-foreground">
          {t("create_and_manage_your_website_pages_1")} {t("use_templates_for_quick_setup_or")}
        </p>
      </div>

      <Tabs defaultValue="existing" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="existing">{t("existing_pages")}</TabsTrigger>
          <TabsTrigger value="templates">{t("page_templates")}</TabsTrigger>
        </TabsList>

        <TabsContent value="existing" className="space-y-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-semibold">{t("your_pages")}</h2>
              {/* `pagination.totalItems` is 0 until the response lands, so this
                  line used to read "No pages found" on every visit — the
                  confident-zero failure, stated in words rather than digits.
                  Only the sentence waits; the heading above it never moves. */}
              <p className="text-muted-foreground mt-1">
                <Loadable loading={isLoading} placeholder="12 pages found">
                  {pagination.totalItems > 0
                    ? `${pagination.totalItems} page${pagination.totalItems === 1 ? "" : "s"} found`
                    : t("no_pages_found")}
                </Loadable>
              </p>
            </div>
          </div>

          {/* The spinner this replaced was a 48px ring centred in a fixed
              `h-64` (256px) box, standing in for a grid whose first two rows
              alone are ~680px. The page settled at a quarter of its final
              height and then grew, which on this screen also pushed the
              Templates tab below the fold and back. */}
          {showEmptyState ? (
            <Card className="text-center py-16">
              <CardContent>
                <h3 className="text-xl font-semibold mb-2">{t("no_pages_found")}</h3>
                <p className="text-muted-foreground mb-6">
                  {t("get_started_by_our_templates")}
                </p>
              </CardContent>
            </Card>
          ) : (
            <div
              className="grid gap-6 md:grid-cols-2 lg:grid-cols-3"
              aria-busy={isLoading || undefined}
            >
              {cards.map((card, index) => {
                const pending = card === null;
                const page = card ?? PENDING_PAGE;
                return (
                  <Card
                    key={pending ? `pending-${index}` : page.id}
                    className={cn(
                      "overflow-hidden",
                      /* A pending card cannot be opened, so it does not offer
                         the pointer that says it can. */
                      !pending && "cursor-pointer"
                    )}
                    onClick={pending ? undefined : () => handleEditPage(page.id)}
                  >
                    <div className="relative w-full h-[200px] bg-muted overflow-hidden">
                      {/* The 200px preview box is FIXED height, so it reserves
                          itself in every state and nothing inside it can move
                          the card. Pending gets a pulse rather than the "Content
                          page" placeholder, because that placeholder is a
                          statement about a page that has not been fetched. */}
                      {pending ? (
                        <SkeletonBlock className="h-full w-full rounded-none" />
                      ) : page.isBuilderPage && page.parsedContent ? (
                        <>
                          {pageSnapshots[page.id]?.card ? (
                            <>
                              <ScrollableSnapshot
                                src={pageSnapshots[page.id].card}
                                alt={t("preview", { title: String(page.title) })}
                                className="w-full h-full"
                                fallbackSrc={`/placeholder.svg?height=200&width=400&text=${encodeURIComponent(page.title)}`}
                              />
                              <div className="absolute bottom-2 left-2 bg-success text-success-foreground text-xs px-2 py-1 rounded">
                                {t("snapshot")}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center justify-center h-full">
                              <div className="text-center">
                                <div className="text-2xl mb-2">🎨</div>
                                <p className="text-sm text-muted-foreground">
                                  {t("generating_preview")}…
                                </p>
                                <div className="mt-2 text-xs text-muted-foreground">
                                  {t("sections")}: {page.parsedContent?.sections?.length || 0}
                                </div>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <div className="text-center">
                            <div className="text-2xl mb-2">📄</div>
                            <p className="text-sm text-muted-foreground">
                              {t("content_page")}
                            </p>
                          </div>
                        </div>
                      )}

                      {page.isHome && (
                        <div className="absolute top-2 left-2 bg-primary text-primary-foreground text-xs px-2 py-1 rounded">
                          Home
                        </div>
                      )}
                    </div>

                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-xl">
                            <Loadable loading={pending} placeholder={t("landing_page")}>
                              {page.title}
                            </Loadable>
                          </CardTitle>
                          <CardDescription className="mt-1">
                            <Loadable loading={pending} placeholder="/landing-page">
                              {page.slug}
                            </Loadable>
                          </CardDescription>
                          {/* Optional on a real page, so it is reserved while
                              pending rather than withheld: it is the ONE
                              variable-height element in the header (a two-line
                              clamp, ~40px), and letting it appear on resolve
                              would shift the meta row under it. It settles to
                              nothing for pages that carry no description, which
                              is the smaller and less common movement of the
                              two. */}
                          {pending ? (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                              <SkeletonText chars={70} />
                            </p>
                          ) : (
                            page.description && (
                              <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                {page.description}
                              </p>
                            )
                          )}
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            {/* "Updated " is chrome and stays put; only the date
                                waits. `formatDate("")` would otherwise print the
                                literal "Invalid Date" on six cards. */}
                            <span>
                              Updated{" "}
                              <Loadable loading={pending} placeholder={tCommon("jan_1") + " 2026"}>
                                {formatDate(page.updatedAt)}
                              </Loadable>
                            </span>
                            <span className="tabular-nums">
                              <Loadable loading={pending} placeholder="1,234">
                                {page.visits}
                              </Loadable>{" "}
                              visits
                            </span>
                          </div>
                        </div>
                        {/* Withheld while pending, deliberately: the badge is a
                            claim about publication state and PENDING_PAGE's
                            "DRAFT" would label six live pages as drafts. It is
                            the flex row's trailing item beside a `text-xl`
                            title, so it cannot change the header's height. */}
                        {!pending && (
                          <StatusBadge
                            status={page.status}
                            label={
                              page.status === "PUBLISHED" ? tCommon("published") : tCommon("draft")
                            }
                          />
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <div>
            <h2 className="text-2xl font-semibold mb-2">{t("page_templates")}</h2>
            <p className="text-muted-foreground mb-6">
              {t("choose_from_professionally_designed_templates_to")}
            </p>
          </div>

          {Object.keys(templatesByCategory).length === 0 ? (
            <Card className="text-center py-16">
              <CardContent>
                <h3 className="text-xl font-semibold mb-2">
                  {t("all_templates_used")}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {t("youve_already_created_pages_for_all")} {t("you_can_edit_your_existing_pages")}
                </p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(templatesByCategory).map(([category, templates]) => {
              return (
                <div key={category} className="space-y-4">
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-semibold">{category} Pages</h3>
                    <Badge variant="secondary">{templates.length}</Badge>
                  </div>

                  <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => {
                      return (
                        <Card key={template.slug} className="overflow-hidden">
                          <div className="relative w-full h-[160px] bg-primary/10 flex items-center justify-center">
                            <Icon
                              icon={template.icon}
                              className="w-12 h-12 text-primary-ink"
                            />

                            <div className="absolute top-2 right-2">
                              <Badge
                                variant={
                                  template.category === "Essential"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {template.isBuilderPage
                                  ? t("visual_builder")
                                  : t("rich_text")}
                              </Badge>
                            </div>
                          </div>

                          <CardHeader className="pb-3">
                            <div className="space-y-2">
                              <CardTitle className="text-lg">
                                {template.title}
                              </CardTitle>
                              <CardDescription className="text-sm line-clamp-2">
                                {template.description}
                              </CardDescription>
                            </div>
                          </CardHeader>

                          <CardContent className="pt-0">
                            {/* In-flight state, house pattern: `loading` on the
                                Button itself. It draws the design system's own
                                `size-4` spinner into its leading slot and sets
                                `aria-busy`, which the hand-rolled Loader2 this
                                replaced did not.

                                The Plus is suppressed while creating ON PURPOSE
                                — the same exemption
                                `components/auth/wallet-login-form.tsx` carries.
                                Rendering it too would put two 16px glyphs ahead
                                of the label and widen the button mid-press. */}
                            <Button
                              className="w-full"
                              onClick={() =>
                                handleCreatePageFromTemplate(template)
                              }
                              loading={isCreatingPage === template.slug}
                            >
                              {isCreatingPage !== template.slug && (
                                <Plus className="h-4 w-4" />
                              )}
                              {isCreatingPage === template.slug
                                ? `${tCommon("creating")}…`
                                : tCommon("create_page")}
                            </Button>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>


      {/* Hidden PageSnapshot components for generating previews */}
      {builderPagesNeedingSnapshots.map((page) => {
        console.log(`Rendering PageSnapshot for page ${page.id} with ${page.parsedContent?.sections?.length || 0} sections`);
        return (
          <PageSnapshot
            key={page.id}
            pageId={page.id}
            sections={page.parsedContent?.sections || []}
            onSnapshotGenerated={(snapshots) =>
              handleSnapshotGenerated(page.id, snapshots)
            }
          />
        );
      })}
    </PageShell>
  );
}
