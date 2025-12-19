# Landing Page Sections - Complete Guide

Premium, highly-configurable landing page sections for building unique and impressive pages.

## Table of Contents

1. [Overview](#overview)
2. [Installation & Setup](#installation--setup)
3. [Available Sections](#available-sections)
4. [Shared Components](#shared-components)
5. [Theming & Customization](#theming--customization)
6. [Animation System](#animation-system)
7. [Best Practices](#best-practices)
8. [Examples](#examples)

---

## Overview

This section library provides **6 premium landing page sections** that are:

- **Highly Configurable**: 100+ configuration options per section
- **Type-Safe**: Full TypeScript support with comprehensive interfaces
- **Themeable**: Automatic light/dark mode support with custom color schemes
- **Animated**: Built-in Framer Motion animations
- **Responsive**: Mobile-first design with adaptive layouts
- **Accessible**: WCAG compliant with proper ARIA labels
- **Performance**: Optimized with lazy loading and efficient animations

### Design Philosophy

- **Composition over Inheritance**: Sections are built from smaller, reusable components
- **Configuration-Driven**: Props define behavior, not logic branches
- **Preset System**: Quick setup with presets, fully customizable with overrides
- **Separation of Concerns**: Content, Layout, Background, and Animation are separate configs

---

## Installation & Setup

### Import Sections

```typescript
import {
  HeroSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  CTASection,
  StatsSection,
} from "@/components/sections";
```

### Basic Usage

```typescript
<HeroSection
  preset="default"
  content={{
    heading: {
      text: "Build Amazing Products",
      highlightedText: "Amazing",
      highlightGradient: "teal",
    },
    subtitle: {
      text: "The best platform for modern teams",
    },
    actions: [
      {
        text: "Get Started",
        href: "/signup",
        variant: "primary",
      },
    ],
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

---

## Available Sections

### 1. Hero Section

**Purpose**: Eye-catching full-viewport landing section

**Key Features**:
- 8 preset layouts (default, centered, split-left, split-right, minimal, gradient-heavy, image-background, video-background)
- Multiple background types (gradient, solid, image, video, none)
- Animated gradient orbs, particles, and grid patterns
- Stats display with animated counters
- Scroll indicators (mouse, arrow, chevron, dot)
- Side content for split layouts

**Basic Usage**:

```typescript
import { HeroSection } from "@/components/sections";

<HeroSection
  preset="default" // or custom configuration
  content={{
    tag: {
      text: "New Launch",
      icon: Sparkles,
    },
    heading: {
      text: "Build the Future",
      highlightedText: "Future",
      size: "xl",
    },
    subtitle: {
      text: "Powerful tools for modern teams",
    },
    actions: [
      { text: "Start Free Trial", href: "/signup", variant: "primary" },
      { text: "Learn More", href: "/about", variant: "outline" },
    ],
    stats: {
      items: [
        { value: 10000, label: "Active Users", suffix: "+" },
        { value: 99, label: "Uptime", suffix: "%", decimals: 1 },
        { value: 50, label: "Countries", suffix: "+" },
      ],
      style: "badges", // or "cards", "minimal"
    },
  }}
  layout={{
    minHeight: "screen",
    maxWidth: "5xl",
    contentAlignment: "center",
  }}
  background={{
    variant: "gradient",
    particles: { enabled: true, count: 30 },
    gridPattern: { enabled: true },
    orbs: [
      { position: "top-left", size: "xl", color: "primary", blur: 120, opacity: 30, animate: true },
    ],
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

**Available Presets**:
- `default`: Full-width centered with gradient + particles + grid
- `centered`: Minimal decoration, pure content focus
- `split-left`: Content on left, side content on right
- `split-right`: Content on right, side content on left
- `minimal`: No background effects, half-height
- `gradient-heavy`: 3 animated gradient orbs + particles + grid
- `image-background`: Image with overlay
- `video-background`: Video with overlay

---

### 2. Features Section

**Purpose**: Showcase features with multiple layouts

**Key Features**:
- 8 preset layouts (default, cards-minimal, cards-hover, bento, icon-grid, list-detailed, glass-cards, gradient-cards)
- Multiple card styles (default, bordered, elevated, glass, gradient-border)
- Icon styles (default, outlined, filled, gradient, glow)
- Hover effects (lift, glow, scale, border-glow)
- Badge support for featured items
- Stats per feature
- Links with external indicator

**Basic Usage**:

```typescript
import { FeaturesSection } from "@/components/sections";
import { Zap, Shield, TrendingUp } from "lucide-react";

<FeaturesSection
  preset="default" // or custom configuration
  header={{
    tag: { text: "Features", icon: Sparkles },
    title: "Everything You Need",
    titleHighlight: "Need",
    subtitle: "Powerful features to help you succeed",
  }}
  features={[
    {
      icon: Zap,
      title: "Lightning Fast",
      description: "Optimized for speed and performance",
      badge: "Popular",
      highlighted: true,
      link: { text: "Learn more", href: "/features/speed" },
    },
    {
      icon: Shield,
      title: "Secure by Default",
      description: "Enterprise-grade security built-in",
      stats: { value: "99.9%", label: "Uptime" },
    },
    {
      icon: TrendingUp,
      title: "Analytics Dashboard",
      description: "Track your growth in real-time",
      image: "/features/analytics.png",
    },
  ]}
  layout={{
    variant: "grid", // or "bento", "list", "list-detailed", "icon-boxes"
    columns: 3,
    gap: "lg",
    iconPosition: "top", // or "left", "inline"
    iconStyle: "gradient", // or "filled", "outlined", "glow"
    cardStyle: "bordered",
    hoverEffect: "lift",
  }}
  showCTA
  cta={{
    text: "View All Features",
    href: "/features",
    variant: "primary",
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

**Layout Variants**:
- `grid`: Standard grid layout
- `grid-alternating`: Grid with alternating styles
- `cards`: Card-based layout
- `cards-hover`: Cards with enhanced hover effects
- `bento`: Bento box layout (varied sizes)
- `list`: Vertical list
- `list-detailed`: Detailed list with images/visuals
- `icon-boxes`: Compact icon-focused layout
- `minimal`: Minimal styling

---

### 3. Testimonials Section

**Purpose**: Social proof with customer testimonials

**Key Features**:
- 7 preset layouts (default, carousel, masonry, spotlight, minimal, glass-cards, quote-wall)
- Carousel with autoplay
- Rating stars
- Company logos
- Author avatars (with fallback to initials)
- Trust badges
- Date stamps
- Metrics per testimonial

**Basic Usage**:

```typescript
import { TestimonialsSection } from "@/components/sections";
import { Star } from "lucide-react";

<TestimonialsSection
  preset="carousel" // or custom configuration
  header={{
    tag: { text: "Testimonials" },
    title: "Loved by Thousands",
    titleHighlight: "Thousands",
    subtitle: "See what our customers have to say",
  }}
  testimonials={[
    {
      content: "This platform transformed how we work. Couldn't be happier!",
      author: {
        name: "Sarah Johnson",
        role: "CEO",
        company: "TechCorp",
        avatar: "/avatars/sarah.jpg",
      },
      rating: 5,
      date: "2 weeks ago",
      featured: true,
      logo: "/logos/techcorp.png",
      metrics: { value: "300%", label: "Productivity Increase" },
    },
    // ... more testimonials
  ]}
  layout={{
    variant: "carousel", // or "grid", "masonry", "spotlight", "quote-wall"
    columns: 3,
    gap: "lg",
    showRating: true,
    showLogo: true,
    showDate: true,
    cardStyle: "glass",
    avatarStyle: "circle",
    quoteStyle: "large",
    autoplay: true,
    autoplayInterval: 5000,
  }}
  showTrustBadge
  trustBadge={{
    text: "Trusted by 10,000+ companies",
    icon: Star,
    rating: 4.9,
    reviewCount: 2500,
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

**Layout Variants**:
- `grid`: Standard grid
- `carousel`: Sliding carousel with navigation
- `masonry`: Pinterest-style masonry layout
- `spotlight`: Featured testimonial + grid
- `quote-wall`: Compact quotes wall
- `minimal`: Minimal styling
- `cards`: Card-based layout

---

### 4. Pricing Section

**Purpose**: Pricing plans with comparison

**Key Features**:
- 6 preset layouts (default, minimal, premium, saas, startup, enterprise)
- Billing toggle (monthly/annual)
- Automatic savings calculation
- Popular/featured badges
- Feature comparison table
- Icons per plan
- Highlight effects
- Footer with links

**Basic Usage**:

```typescript
import { PricingSection } from "@/components/sections";
import { Zap, Rocket, Building } from "lucide-react";

<PricingSection
  preset="saas" // or custom configuration
  header={{
    tag: { text: "Pricing" },
    title: "Simple, Transparent Pricing",
    titleHighlight: "Transparent",
    subtitle: "Choose the plan that's right for you",
  }}
  plans={[
    {
      name: "Starter",
      description: "Perfect for individuals",
      price: { monthly: 9, annual: 90, currencySymbol: "$" },
      icon: Zap,
      features: [
        { text: "Up to 5 projects", included: true },
        { text: "10GB storage", included: true },
        { text: "Email support", included: true },
        { text: "Advanced analytics", included: false },
        { text: "Custom domain", included: false },
      ],
      cta: { text: "Start Free Trial", href: "/signup", variant: "outline" },
    },
    {
      name: "Pro",
      description: "For growing teams",
      price: { monthly: 29, annual: 290 },
      icon: Rocket,
      popular: true,
      features: [
        { text: "Unlimited projects", included: true },
        { text: "100GB storage", included: true },
        { text: "Priority support", included: true },
        { text: "Advanced analytics", included: true, highlighted: true },
        { text: "Custom domain", included: true },
      ],
      cta: { text: "Get Started", href: "/signup", variant: "primary" },
    },
    {
      name: "Enterprise",
      description: "For large organizations",
      price: { monthly: "Custom", annual: "Custom" },
      icon: Building,
      features: [
        { text: "Everything in Pro", included: true },
        { text: "Unlimited storage", included: true },
        { text: "24/7 phone support", included: true },
        { text: "Dedicated account manager", included: true },
        { text: "Custom integrations", included: true },
      ],
      cta: { text: "Contact Sales", href: "/contact", variant: "outline" },
    },
  ]}
  layout={{
    columns: 3,
    gap: "lg",
    showBillingToggle: true,
    defaultBilling: "monthly",
    cardStyle: "elevated",
    featureStyle: "list", // or "compact", "detailed"
    highlightPopular: true,
  }}
  showComparison
  comparisonFeatures={[
    "Projects",
    "Storage",
    "Support",
    "Analytics",
    "Custom domain",
  ]}
  footer={{
    text: "All plans include 14-day free trial",
    links: [
      { text: "Compare plans", href: "/pricing/compare" },
      { text: "FAQ", href: "/faq" },
    ],
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

---

### 5. CTA Section

**Purpose**: Call-to-action and newsletter signup

**Key Features**:
- 6 preset layouts (default, newsletter, split-visual, centered-minimal, banner, gradient-box)
- Newsletter form with email validation
- Multiple buttons
- Visual elements (image, illustration, icon, custom)
- Gradient backgrounds
- Tag badges

**Basic Usage**:

```typescript
import { CTASection } from "@/components/sections";
import { Rocket } from "lucide-react";

// Newsletter CTA
<CTASection
  preset="newsletter"
  content={{
    tag: { text: "Newsletter", icon: Mail },
    title: "Stay in the Loop",
    titleHighlight: "Loop",
    subtitle: "Get the latest updates and tips delivered to your inbox",
    newsletter: {
      placeholder: "Enter your email",
      buttonText: "Subscribe",
      privacyText: "We respect your privacy. Unsubscribe anytime.",
      onSubmit: async (email) => {
        // Handle newsletter signup
        await subscribeToNewsletter(email);
      },
    },
  }}
  background={{
    variant: "gradient",
    particles: { enabled: true, count: 20 },
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>

// Button CTA with Visual
<CTASection
  preset="split-visual"
  content={{
    tag: { text: "Get Started" },
    title: "Ready to Transform Your Business?",
    titleHighlight: "Transform",
    subtitle: "Join thousands of teams already using our platform",
    buttons: [
      { text: "Start Free Trial", href: "/signup", variant: "primary", icon: Rocket },
      { text: "Schedule Demo", href: "/demo", variant: "outline" },
    ],
    visual: {
      type: "image",
      src: "/images/cta-visual.png",
    },
  }}
  layout={{
    variant: "split",
    visualPosition: "right",
    cardStyle: "elevated",
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

**Layout Variants**:
- `centered`: Centered layout
- `split`: Split with visual
- `inline`: Inline compact layout
- `newsletter`: Newsletter-focused
- `minimal`: Minimal styling
- `banner`: Full-width banner

---

### 6. Stats Section

**Purpose**: Showcase impressive statistics

**Key Features**:
- 6 preset layouts (default, minimal, cards, featured, compact, banner)
- Animated counters with custom decimals
- Trend indicators (up/down)
- Icons per stat
- Descriptions
- Highlighted stats
- Card styles

**Basic Usage**:

```typescript
import { StatsSection } from "@/components/sections";
import { Users, DollarSign, TrendingUp, Globe } from "lucide-react";

<StatsSection
  preset="cards" // or custom configuration
  header={{
    tag: { text: "Our Impact" },
    title: "Trusted Worldwide",
    titleHighlight: "Worldwide",
    subtitle: "Join thousands of satisfied customers",
  }}
  stats={[
    {
      value: 50000,
      label: "Active Users",
      description: "Growing every day",
      icon: Users,
      suffix: "+",
      trend: { value: 23, direction: "up", label: "this month" },
    },
    {
      value: 2500000,
      label: "Revenue Generated",
      description: "For our customers",
      icon: DollarSign,
      prefix: "$",
      highlighted: true,
      trend: { value: 45, direction: "up", label: "YoY" },
    },
    {
      value: 99.9,
      label: "Uptime",
      description: "Reliable service",
      icon: TrendingUp,
      suffix: "%",
      decimals: 1,
    },
    {
      value: 120,
      label: "Countries",
      description: "Global reach",
      icon: Globe,
      suffix: "+",
    },
  ]}
  layout={{
    variant: "cards",
    columns: 4,
    gap: "lg",
    cardStyle: "glass",
    iconStyle: "filled",
    showIcon: true,
    showDescription: true,
    showTrend: true,
    size: "lg",
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

**Layout Variants**:
- `grid`: Standard grid
- `grid-compact`: Compact grid
- `cards`: Card-based
- `inline`: Inline horizontal
- `minimal`: Minimal styling
- `featured`: Featured with emphasis
- `banner`: Full-width banner

---

## Shared Components

### SectionBackground

Reusable background component for all sections.

```typescript
import { SectionBackground } from "@/components/sections/shared";

<SectionBackground
  config={{
    variant: "gradient", // or "solid", "pattern", "mesh", "none"
    gradientFrom: "#14b8a6",
    gradientVia: "transparent",
    gradientTo: "#06b6d4",
    gradientDirection: "to-br",
    particles: {
      enabled: true,
      count: 30,
      primaryColor: "teal",
      secondaryColor: "cyan",
    },
    gridPattern: {
      enabled: true,
      variant: "lines", // or "dots", "squares"
      opacity: 0.03,
    },
    orbs: [
      {
        position: "top-left",
        size: "xl",
        color: "teal",
        blur: 120,
        opacity: 30,
        animate: true,
      },
    ],
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
/>
```

### SectionHeader

Reusable header component for sections.

```typescript
import { SectionHeader } from "@/components/sections/shared";

<SectionHeader
  config={{
    tag: { text: "Features", icon: Sparkles },
    title: "Amazing Features",
    titleHighlight: "Amazing",
    titleHighlightGradient: "teal",
    subtitle: "Everything you need to succeed",
    alignment: "center", // or "left", "right"
  }}
  theme={{ primary: "teal", secondary: "cyan" }}
  animate
/>
```

---

## Theming & Customization

### Color System

All sections support a unified color system with 20+ predefined colors:

```typescript
const availableColors = [
  "primary", "secondary", // CSS variables
  "teal", "cyan", "blue", "purple", "pink",
  "red", "orange", "yellow", "green", "emerald",
  "indigo", "violet", "rose", "fuchsia", "lime",
  "sky", "amber", "slate", "zinc", "neutral",
  "stone", "gray"
];
```

### Gradient Presets

16 predefined gradient combinations:

```typescript
const gradients = [
  "teal", "cyan", "blue", "purple", "pink",
  "indigo", "violet", "emerald", "rose", "amber",
  "sunset",  // orange -> pink -> violet
  "ocean",   // cyan -> blue -> indigo
  "forest",  // emerald -> teal
  "fire",    // red -> orange -> yellow
  "aurora",  // emerald -> violet -> pink
  "cosmic",  // indigo -> violet -> fuchsia
];
```

### Theme Configuration

```typescript
// Apply theme to any section
<AnySection
  theme={{
    primary: "teal",     // Primary color
    secondary: "cyan",   // Secondary color
    accent: "purple",    // Optional accent
  }}
/>
```

### Custom Colors

You can also use custom hex colors:

```typescript
<AnySection
  theme={{
    primary: "#14b8a6",
    secondary: "#06b6d4",
  }}
/>
```

---

## Animation System

### Built-in Animations

All sections support Framer Motion animations with customization:

```typescript
<AnySection
  animation={{
    enabled: true,                // Enable/disable animations
    variant: "fade-up",          // Animation style
    staggerChildren: 0.1,        // Delay between child animations
    delayChildren: 0.2,          // Initial delay
    duration: 0.5,               // Animation duration
    once: true,                  // Animate only once
    threshold: 0.1,              // Viewport threshold
  }}
/>
```

### Animation Variants

Available animation variants:
- `fade-up`: Fade in from bottom
- `fade-down`: Fade in from top
- `fade-left`: Fade in from left
- `fade-right`: Fade in from right
- `scale`: Scale animation
- `blur`: Blur animation
- `slide`: Slide animation
- `none`: No animation

### Custom Animations

You can disable built-in animations and add your own:

```typescript
<AnySection
  animation={{ enabled: false }}
  // Apply your own motion components inside
/>
```

---

## Best Practices

### 1. Use Presets for Quick Setup

Start with a preset and override specific properties:

```typescript
<FeaturesSection
  preset="cards-hover"  // Start with preset
  layout={{
    columns: 4,         // Override specific properties
    gap: "md",
  }}
/>
```

### 2. Consistent Theming

Use the same theme across all sections for a cohesive look:

```typescript
const siteTheme = { primary: "teal", secondary: "cyan" };

<HeroSection theme={siteTheme} />
<FeaturesSection theme={siteTheme} />
<PricingSection theme={siteTheme} />
```

### 3. Optimize Images

Always optimize images used in sections:

```typescript
// Bad
<FeaturesSection
  features={[
    { image: "/images/huge-unoptimized.png" }
  ]}
/>

// Good
<FeaturesSection
  features={[
    { image: "/images/feature-optimized.webp" }
  ]}
/>
```

### 4. Use Semantic HTML

Sections use semantic HTML by default, but you can enhance with proper IDs:

```typescript
<HeroSection id="hero" />
<FeaturesSection id="features" />
<PricingSection id="pricing" />
```

### 5. Performance Considerations

- Limit particle count (20-30 for most cases)
- Use `animation.once = true` for better performance
- Lazy load images in features/testimonials
- Disable animations on mobile if needed

### 6. Accessibility

All sections are accessible by default, but ensure:
- Alt text for images
- Proper heading hierarchy
- Keyboard navigation for interactive elements
- Sufficient color contrast

---

## Examples

### Example 1: SaaS Landing Page

```typescript
import {
  HeroSection,
  FeaturesSection,
  TestimonialsSection,
  PricingSection,
  CTASection,
} from "@/components/sections";

const theme = { primary: "blue", secondary: "indigo" };

export default function SaaSLanding() {
  return (
    <>
      <HeroSection
        preset="gradient-heavy"
        content={{
          tag: { text: "New Launch" },
          heading: { text: "Build Faster, Ship Sooner", highlightedText: "Faster" },
          subtitle: { text: "The all-in-one platform for modern teams" },
          actions: [
            { text: "Start Free Trial", href: "/signup" },
            { text: "Watch Demo", href: "/demo", variant: "outline" },
          ],
        }}
        theme={theme}
      />

      <FeaturesSection
        preset="cards-hover"
        header={{
          title: "Everything You Need",
          titleHighlight: "Need",
          subtitle: "Powerful features to boost productivity",
        }}
        features={[
          {
            icon: Zap,
            title: "Lightning Fast",
            description: "Optimized for speed and performance",
          },
          // ... more features
        ]}
        theme={theme}
      />

      <TestimonialsSection
        preset="carousel"
        header={{
          title: "Loved by Teams Worldwide",
          titleHighlight: "Worldwide",
        }}
        testimonials={[/* ... */]}
        theme={theme}
      />

      <PricingSection
        preset="saas"
        header={{
          title: "Simple, Transparent Pricing",
        }}
        plans={[/* ... */]}
        theme={theme}
      />

      <CTASection
        preset="newsletter"
        content={{
          title: "Stay Updated",
          titleHighlight: "Updated",
          subtitle: "Get the latest features and updates",
          newsletter: {
            onSubmit: async (email) => {
              await subscribe(email);
            },
          },
        }}
        theme={theme}
      />
    </>
  );
}
```

### Example 2: Product Landing Page

```typescript
const theme = { primary: "purple", secondary: "pink" };

<>
  <HeroSection
    preset="split-right"
    content={{
      heading: { text: "Design Beautiful Websites", highlightedText: "Beautiful" },
      subtitle: { text: "No coding required" },
      actions: [{ text: "Try Free", href: "/signup" }],
    }}
    layout={{
      sideContent: <ProductScreenshot />,
    }}
    theme={theme}
  />

  <FeaturesSection
    preset="bento"
    features={[/* ... */]}
    theme={theme}
  />

  <StatsSection
    preset="featured"
    stats={[
      { value: 100000, label: "Websites Created", suffix: "+" },
      // ...
    ]}
    theme={theme}
  />

  <CTASection
    preset="gradient-box"
    content={{
      title: "Ready to Get Started?",
      buttons: [{ text: "Create Account", href: "/signup" }],
    }}
    theme={theme}
  />
</>
```

### Example 3: Agency Portfolio

```typescript
const theme = { primary: "teal", secondary: "emerald" };

<>
  <HeroSection
    preset="minimal"
    content={{
      heading: { text: "We Create Digital Experiences", highlightedText: "Experiences" },
      subtitle: { text: "Award-winning design agency" },
    }}
    theme={theme}
  />

  <FeaturesSection
    preset="list-detailed"
    features={[
      {
        title: "Web Design",
        description: "Beautiful, responsive websites",
        image: "/portfolio/web-design.jpg",
      },
      // ...
    ]}
    theme={theme}
  />

  <TestimonialsSection
    preset="spotlight"
    testimonials={[/* ... */]}
    theme={theme}
  />

  <CTASection
    preset="split-visual"
    content={{
      title: "Let's Work Together",
      buttons: [{ text: "Start a Project", href: "/contact" }],
      visual: { type: "image", src: "/team.jpg" },
    }}
    theme={theme}
  />
</>
```

---

## Advanced Customization

### Custom Section Background

```typescript
<FeaturesSection
  background={{
    variant: "mesh",
    orbs: [
      { position: "top-right", size: "lg", color: "purple", blur: 100, opacity: 20 },
      { position: "bottom-left", size: "md", color: "pink", blur: 80, opacity: 15 },
    ],
    particles: {
      enabled: true,
      count: 40,
      primaryColor: "purple",
      secondaryColor: "pink",
      size: { min: 2, max: 6 },
      speed: 0.8,
    },
    gridPattern: {
      enabled: true,
      variant: "dots",
      opacity: 0.05,
    },
  }}
/>
```

### Responsive Columns

Columns automatically adjust for mobile, but you can customize:

```typescript
// This will show:
// - 1 column on mobile
// - 2 columns on tablet (md)
// - 3 columns on desktop (lg)
<FeaturesSection
  layout={{ columns: 3 }}
/>

// For more control, columns 4-6 include additional breakpoints
<FeaturesSection
  layout={{ columns: 6 }} // 2 cols mobile, 3 cols tablet, 6 cols desktop
/>
```

### Custom Content Slots

Many sections support custom content:

```typescript
<HeroSection
  content={{
    heading: { text: "My Heading" },
    customContent: <MyCustomComponent />,
    customContentPosition: "below-actions", // or "above-heading", "below-heading", etc.
  }}
/>

<PricingSection
  plans={[
    {
      name: "Pro",
      price: { monthly: 29 },
      features: [/* ... */],
      customContent: <CustomPricingBadge />,
      cta: { text: "Get Started", href: "/signup" },
    },
  ]}
/>
```

---

## Troubleshooting

### Animations Not Working

1. Ensure `animation.enabled = true`
2. Check that Framer Motion is installed: `npm install framer-motion`
3. Verify the component is in viewport (adjust `animation.threshold`)

### Particles Not Showing

1. Ensure `particles.enabled = true`
2. Check particle count isn't 0
3. Verify colors are valid
4. Check z-index stacking

### Theme Colors Not Applying

1. Verify color names are valid (see color system above)
2. For custom colors, use hex format: `#14b8a6`
3. Check CSS variables are defined for `"primary"` and `"secondary"`

### TypeScript Errors

1. Ensure all required fields are provided
2. Check for typos in property names
3. Verify enum values (e.g., variant names)
4. Import types: `import type { FeatureItemConfig } from "@/components/sections"`

---

## Migration Guide

### From Basic Sections to Premium Sections

If you have existing basic sections, here's how to migrate:

**Before**:
```typescript
<div className="hero">
  <h1>My Title</h1>
  <p>My subtitle</p>
  <button>CTA</button>
</div>
```

**After**:
```typescript
<HeroSection
  preset="minimal"
  content={{
    heading: { text: "My Title" },
    subtitle: { text: "My subtitle" },
    actions: [{ text: "CTA", href: "/action" }],
  }}
/>
```

---

## Support & Resources

- **Documentation**: This file
- **TypeScript Types**: See `types.ts` files in each section folder
- **Examples**: See `examples` folder (if available)
- **Issues**: Report bugs in the project repository

---

## License

These sections are part of the project and follow the project's license.

---

**Built with ❤️ using React, TypeScript, Framer Motion, and Tailwind CSS**
