import {
  Type,
  ImageIcon,
  Box,
  Layers,
  ListOrdered,
  Quote,
  Palette,
  CreditCard,
  Users,
  Bell,
  BarChart3,
  Zap,
  Bookmark,
  Sparkles,
  Grid3x3,
  LinkIcon,
  TrendingUp,
} from "lucide-react";
import type { Element } from "@/types/builder";

// Define element categories
export const elementCategories = [
  "text",
  "media",
  "layout",
  "components",
  "interactive",
  "data",
];

// Define element templates by category
export const elementTemplates = {
  text: [
    {
      id: "heading",
      name: "Heading",
      description: "Section title or subtitle",
      icon: <Type className="h-5 w-5" />,
      content: "New Heading",
      settings: {
        fontSize: 32,
        fontWeight: "bold",
        textAlign: "left",
        lineHeight: 1.2,
        marginBottom: 24, // Explicit margin for proper spacing
      },
      previewImage: "/elements/heading.png",
    },
    {
      id: "text",
      name: "Paragraph",
      description: "Regular text paragraph",
      icon: <Type className="h-5 w-5" />,
      content: "This is a paragraph of text. Click to edit this text.",
      settings: {
        fontSize: 16,
        textAlign: "left",
        lineHeight: 1.5,
        marginBottom: 16, // Explicit margin for proper spacing
      },
      previewImage: "/elements/paragraph.png",
    },
    {
      id: "list",
      name: "List",
      description: "Ordered or unordered list",
      icon: <ListOrdered className="h-5 w-5" />,
      content:
        "<ul><li>List item 1</li><li>List item 2</li><li>List item 3</li></ul>",
      settings: {
        listType: "unordered",
        fontSize: 16,
        lineHeight: 1.5,
        marginBottom: 16, // Explicit margin for proper spacing
      },
      previewImage: "/elements/list.png",
    },
    {
      id: "quote",
      name: "Quote",
      description: "Blockquote with citation",
      icon: <Quote className="h-5 w-5" />,
      content:
        "The greatest glory in living lies not in never falling, but in rising every time we fall.",
      settings: {
        author: "Nelson Mandela",
        fontSize: 18,
        fontStyle: "italic",
        lineHeight: 1.6,
        marginBottom: 20, // Explicit margin for proper spacing
      },
      previewImage: "/elements/quote.png",
    },
    {
      id: "link",
      name: "Link",
      description: "Hyperlink to internal or external pages",
      icon: <LinkIcon className="h-5 w-5" />,
      content: "Click here",
      settings: {
        url: "#",
        target: "_self", // _self, _blank
        fontSize: 16,
        textDecoration: "underline", // underline, none
        color: { light: "purple-600", dark: "purple-400" },
        hoverColor: { light: "purple-800", dark: "purple-300" },
        isButton: false,
        lineHeight: 1.5,
        marginBottom: 16, // Explicit margin for proper spacing
      },
      previewImage: "/elements/link.png",
    },
  ],
  media: [
    {
      id: "image",
      name: "Image",
      description: "Insert an image",
      icon: <ImageIcon className="h-5 w-5" />,
      settings: {
        src: "/placeholder.svg?height=200&width=400",
        alt: "Placeholder image",
        borderRadius: 4,
      },
      previewImage: "/elements/image.png",
    },
    {
      id: "gallery",
      name: "Gallery",
      description: "Image gallery or carousel",
      icon: <Layers className="h-5 w-5" />,
      settings: {
        images: [
          {
            src: "/placeholder.svg?height=200&width=400",
            alt: "Gallery image 1",
          },
          {
            src: "/placeholder.svg?height=200&width=400",
            alt: "Gallery image 2",
          },
          {
            src: "/placeholder.svg?height=200&width=400",
            alt: "Gallery image 3",
          },
        ],
        displayType: "grid", // grid, carousel, masonry
      },
      previewImage: "/elements/gallery.png",
    },
    {
      id: "icon",
      name: "Icon",
      description: "Vector icon with options",
      icon: <Sparkles className="h-5 w-5" />,
      settings: {
        iconName: "sparkles",
        size: 24,
        color: "#7c3aed",
      },
      previewImage: "/elements/icon.png",
    },
    {
      id: "animatedImageGrid",
      name: "Animated Image Grid",
      description: "3D tilted grid with animated images",
      icon: <Grid3x3 className="h-5 w-5" />,
      settings: {
        columns: 3,
        perspective: 700,
        rotateX: 15,
        rotateY: -9,
        rotateZ: 32,
        scale: { x: 0.9, y: 0.8, z: 1 },
        translateX: 7,
        translateY: -2,
        translateZ: 0,
        gap: 12,
        imageColumns: {
          col1: [
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
          ],
          col2: [
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
          ],
          col3: [
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
            {
              light: "/placeholder.svg?height=200&width=300",
              dark: "/placeholder.svg?height=200&width=300",
            },
          ],
        },
        animationDirections: {
          col1: "up",
          col2: "down",
          col3: "up",
        },
        animationSpeeds: {
          col1: "normal",
          col2: "normal",
          col3: "slow",
        },
      },
      previewImage: "/elements/animated-grid.png",
    },
  ],
  layout: [
    {
      id: "divider",
      name: "Divider",
      description: "Horizontal line separator",
      icon: <Box className="h-5 w-5" />,
      settings: {
        style: "solid", // solid, dashed, dotted
        color: "#e5e7eb",
        thickness: 1,
      },
      previewImage: "/elements/divider.png",
    },
    {
      id: "spacer",
      name: "Spacer",
      description: "Add vertical space",
      icon: <Box className="h-5 w-5" />,
      settings: {
        height: 50,
      },
      previewImage: "/elements/spacer.png",
    },
    // Removed columns and container elements as they should be part of row stuff
  ],
  components: [
    {
      id: "card",
      name: "Card",
      description: "Content card with image",
      icon: <Palette className="h-5 w-5" />,
      settings: {
        title: "Card Title",
        description:
          "This is a card description that can include text content.",
        imageSrc: "/placeholder.svg?height=200&width=400",
        buttonText: "Learn More",
        backgroundColor: { light: "white", dark: "gray-800" },
        borderRadius: 8,
        shadow: "md", // sm, md, lg, xl
      },
      previewImage: "/elements/card.png",
    },
    {
      id: "pricing",
      name: "Pricing",
      description: "Pricing plan card",
      icon: <CreditCard className="h-5 w-5" />,
      settings: {
        planName: "Basic Plan",
        price: "$19",
        period: "monthly",
        features: ["Feature one", "Feature two", "Feature three"],
        buttonText: "Get Started",
        highlighted: false,
      },
      previewImage: "/elements/pricing.png",
    },
    {
      id: "testimonial",
      name: "Testimonial",
      description: "Customer testimonial",
      icon: <Users className="h-5 w-5" />,
      settings: {
        quote:
          "This product has completely transformed how we work. Highly recommended!",
        author: "Jane Smith",
        role: "CEO, Company Inc.",
        avatarSrc: "/placeholder.svg?height=50&width=50",
        rating: 5,
        displayType: "card", // card, slider
      },
      previewImage: "/elements/testimonial.png",
    },
    {
      id: "stats",
      name: "Stats",
      description: "Statistics display",
      icon: <BarChart3 className="h-5 w-5" />,
      settings: {
        stats: [
          { label: "Users", value: "10K+", icon: "users" },
          { label: "Countries", value: "30+", icon: "globe" },
          { label: "Servers", value: "100+", icon: "server" },
        ],
        layout: "row", // row, grid
      },
      previewImage: "/elements/stats.png",
    },
  ],
  interactive: [
    {
      id: "button",
      name: "Button",
      description: "Clickable button",
      icon: <Box className="h-5 w-5" />,
      content: "Button",
      settings: {
        backgroundColor: { light: "purple-600", dark: "purple-500" },
        color: { light: "white", dark: "white" },
        padding: 10,
        borderRadius: 4,
        size: "md", // sm, md, lg
        variant: "filled", // filled, outline, ghost
      },
      previewImage: "/elements/button.png",
    },
    {
      id: "cta",
      name: "Call to Action",
      description: "Attention-grabbing CTA",
      icon: <Zap className="h-5 w-5" />,
      settings: {
        heading: "Ready to get started?",
        subheading: "Join thousands of satisfied customers today.",
        buttonText: "Sign Up Now",
        buttonLink: "#",
        layout: "centered", // centered, split
        backgroundColor: { light: "purple-600", dark: "purple-800" },
        textColor: { light: "white", dark: "white" },
      },
      previewImage: "/elements/cta.png",
    },
    {
      id: "notification",
      name: "Notification",
      description: "Alert or notification",
      icon: <Bell className="h-5 w-5" />,
      settings: {
        type: "info", // info, success, warning, error
        title: "Information",
        message: "This is an informational notification.",
        dismissible: true,
        duration: 5, // in seconds, 0 for permanent
        oneTimeOnly: false,
        backgroundColor: { light: "blue-50", dark: "blue-900" },
        textColor: { light: "blue-800", dark: "blue-100" },
      },
      previewImage: "/elements/notification.png",
    },
    {
      id: "feature",
      name: "Feature",
      description: "Feature highlight",
      icon: <Bookmark className="h-5 w-5" />,
      settings: {
        title: "Amazing Feature",
        description: "This feature will revolutionize your workflow.",
        icon: "star",
        iconColor: { light: "purple-600", dark: "purple-400" },
      },
      previewImage: "/elements/feature.png",
    },
  ],
  data: [
    {
      id: "trendingMarkets",
      name: "Trending Markets",
      description: "Real-time market data with charts",
      icon: <TrendingUp className="h-5 w-5" />,
      settings: {
        apiEndpoint: "/api/markets/ticker",
        wsEndpoint: "/api/markets/ticker/ws",
        maxItems: 10,
        autoScroll: true,
        scrollSpeed: 32,
        showGradients: true,
        scrollDirection: "rtl",
        linkBaseUrl: "/trade",
      },
      previewImage: "/elements/trending-markets.png",
    },
  ],
};

// Get all element categories
export function getElementCategories(): string[] {
  return elementCategories;
}

// Get elements for a specific category
export function getElementsByCategory(category: string): any[] {
  return elementTemplates[category as keyof typeof elementTemplates] || [];
}

// Get a specific element template
export function getElementTemplate(category: string, id: string): any | null {
  const categoryElements =
    elementTemplates[category as keyof typeof elementTemplates] || [];
  return categoryElements.find((element) => element.id === id) || null;
}

// Create an element from a template
export function createElementFromTemplate(
  category: string,
  templateId: string
): Element | null {
  const template = getElementTemplate(category, templateId);
  if (!template) return null;

  // Define text elements that should have minimal padding
  const textElements = ["heading", "text", "list", "quote", "link"];
  const isTextElement = textElements.includes(template.id);

  // Set appropriate defaults based on element type
  const defaultPadding = isTextElement ? 0 : 16; // Text elements get no padding, others get 16px
  const defaultMarginBottom = 16; // All elements get bottom margin for spacing

  return {
    id: `element-${Date.now()}`,
    type: template.id,
    content: template.content || "",
    settings: {
      // Default settings with element-type-specific padding
      width: "100%",
      height: "auto",
      paddingTop: defaultPadding,
      paddingRight: defaultPadding,
      paddingBottom: defaultPadding,
      paddingLeft: defaultPadding,
      marginTop: 0,
      marginRight: 0,
      marginBottom: defaultMarginBottom,
      marginLeft: 0,
      // Ensure text elements have proper line height and minimum height
      ...(isTextElement && {
        lineHeight: 1.5,
        minHeight: "1.2em",
      }),
      // Template-specific settings override defaults
      ...template.settings,
    },
  };
}
