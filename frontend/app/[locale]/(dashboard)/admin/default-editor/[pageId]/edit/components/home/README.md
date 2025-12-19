# Home Page Section Editors

This directory contains all section editors specifically for the **Home Page** (`/home` route).

## Overview

Each editor in this folder corresponds to a section visible on the home page (`frontend/app/[locale]/home.tsx`). The editors follow a consistent pattern with:

- **Settings Panel** (1/3 width on desktop): Controls for editing section content
- **Live Preview** (2/3 width on desktop): Real-time preview matching the actual frontend render

## Section Editors

### 1. Hero Section Editor (`hero-section-editor.tsx`)
- **Purpose**: Edits the main hero banner at the top of the home page
- **Variables**:
  - `hero.badge` - Badge text (e.g., "#1 Crypto Trading Platform")
  - `hero.title` - Main heading (e.g., "Trade Crypto")
  - `hero.subtitle` - Gradient subtitle (e.g., "like a pro")
  - `hero.description` - Description text
  - `hero.cta` - CTA button text
  - `hero.features` - Array of feature checkmarks
- **Preview States**: Supports logged-in/logged-out views with market panel

### 2. Ticker Section Editor (`ticker-section-editor.tsx`)
- **Purpose**: Edits the scrolling ticker showing live market prices
- **Variables**:
  - `ticker.enabled` - Enable/disable ticker
  - `ticker.speed` - Animation speed
- **Preview**: Shows animated ticker with live market data

### 3. Market Section Editor (`market-section-editor.tsx`)
- **Purpose**: Edits the live markets grid section
- **Variables**:
  - Market display settings
  - Grid layout options
- **Preview**: Shows market cards with real-time price updates

### 4. Extension Sections Editor (`extension-sections-editor.tsx`)
- **Purpose**: Edits dynamic extension sections (Spot, Binary, Futures, Ecosystem, P2P, ICO, Staking, Forex, NFT)
- **Features**:
  - Manages multiple extension types
  - Each extension can be enabled/disabled
  - Custom settings per extension type
- **Preview**: Shows extension-specific layouts with data

### 5. Features Section Editor (`features-section-editor.tsx`)
- **Purpose**: Edits the "Why Choose Us" section
- **Variables**:
  - `featuresSection.badge` - Section badge
  - `featuresSection.title` - Main title
  - `featuresSection.subtitle` - Gradient subtitle
  - `featuresSection.description` - Description
  - `features` - Array of feature items with icons
- **Preview**: Shows feature grid with icons and descriptions

### 6. Global Section Editor (`global-section-editor.tsx`)
- **Purpose**: Edits global platform statistics and features
- **Variables**:
  - `globalSection.stats` - Platform statistics (users, volume, etc.)
  - `globalSection.platformFeatures` - List of platform capabilities
- **Preview**: Shows stats cards and feature checklist

### 7. Getting Started Editor (`getting-started-editor.tsx`)
- **Purpose**: Edits the onboarding steps section
- **Variables**:
  - `gettingStarted.badge` - Section badge
  - `gettingStarted.title` - Main title
  - `gettingStarted.subtitle` - Gradient subtitle
  - `gettingStarted.steps` - Array of step objects (step number, title, description, icon)
- **Preview**: Shows numbered steps with icons and progress line

### 8. Mobile App Section Editor (`mobile-app-section-editor.tsx`)
- **Purpose**: Edits the mobile app promotion section
- **Variables**:
  - `mobileApp.enabled` - Show/hide section
  - `mobileApp.title` - Section title
  - `mobileApp.features` - App features list
  - `mobileApp.storeLinks` - App store URLs
- **Preview**: Shows mobile mockup with app features

### 9. CTA Section Editor (`cta-section-editor.tsx`)
- **Purpose**: Edits the final call-to-action section
- **Variables**:
  - `cta.badge` - Badge text
  - `cta.title` - Main heading
  - `cta.description` - Description text
  - `cta.button` - CTA button text (guest users)
  - `cta.buttonUser` - CTA button text (logged-in users)
  - `cta.features` - Feature checkmarks (guest)
  - `cta.featuresUser` - Feature checkmarks (logged-in)
- **Preview States**: Different content for logged-in vs guest users

## Layout Structure

All section editors use a responsive 1/3 - 2/3 layout:

```tsx
<div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
  {/* Settings Panel - 1/3 width */}
  <div className="space-y-4 xl:col-span-1">
    {/* Form controls */}
  </div>

  {/* Live Preview - 2/3 width */}
  <div className="relative xl:col-span-2">
    {/* Preview matching frontend render */}
  </div>
</div>
```

## Correspondence with Frontend

Each editor directly corresponds to sections in `frontend/app/[locale]/home.tsx`:

| Editor | Frontend Section | Line Range |
|--------|------------------|------------|
| Hero Section | Hero Section | ~1730-1950 |
| Ticker Section | Live Ticker | ~1952-1957 |
| Extension Sections | Dynamic Features | ~1959-1960 |
| Features Section | Why Choose Us | ~1962-2062 |
| Global Section | Platform Features | ~2034-2057 |
| Getting Started | Getting Started | ~2064-2128 |
| Mobile App | Mobile App Section | ~2130-2131 |
| CTA Section | CTA Section | ~2133-2189 |

## Import Structure

All editors are exported through `index.ts` for clean imports:

```typescript
import {
  HeroSectionEditor,
  TickerSectionEditor,
  // ... other editors
} from './home';
```

## Preview Accuracy

The previews in these editors are designed to **exactly match** the frontend render, including:
- Same component structure
- Same styling and animations
- Real data integration where applicable
- Responsive behavior
- Theme support (light/dark)

## Future Pages

Editors for other pages (About, Privacy, Terms, etc.) remain in the parent `components` folder as they use different editing patterns (WYSIWYG content editor vs. variable-based editors).
