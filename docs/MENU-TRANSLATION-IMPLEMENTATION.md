# Menu Translation Implementation Guide

## Overview

This guide explains how to implement translatable menus in the application. The menu translation system allows all menu items (titles and descriptions) to be translated into multiple languages.

## What Was Done

### 1. Translation Extraction

✅ **Created extraction script**: `tools/extract-menu-translations-v2.js`
- Parses `frontend/config/menu.ts`
- Extracts all menu item titles and descriptions
- Generates translation keys in format: `menu.{key}.{field}`
- Updates all 90 locale files with new keys

**Results:**
- ✅ Extracted 180 translation keys (90 titles + 90 descriptions)
- ✅ Added to all locale files (16,110 total keys added across 90 locales)
- ✅ Generated `tools/menu-translations.json` for reference

### 2. Translation Key Format

Menu translation keys follow this pattern:

```
menu.{menu-key-with-dots}.{field}
```

**Examples:**
- Title: `menu.admin.dashboard` → "Dashboard"
- Description: `menu.admin.dashboard.description` → "Comprehensive administrative overview..."
- Nested: `menu.admin.user.management` → "Users"
- Nested Desc: `menu.admin.user.management.description` → "Complete user lifecycle management..."

## Implementation Steps

### Step 1: Update Menu Configuration

You need to update `frontend/config/menu.ts` to support translation keys.

**Option A: Add `titleKey` field (Recommended)**

```typescript
export const adminMenu: MenuItem[] = [
  {
    key: "admin-dashboard",
    title: "Dashboard", // Keep for fallback
    titleKey: "menu.admin.dashboard", // Add translation key
    href: "/admin",
    icon: "solar:home-angle-line-duotone",
    description: "Comprehensive administrative overview...",
    descriptionKey: "menu.admin.dashboard.description", // Add translation key
    permission: "access.admin",
  },
  // ... more items
];
```

**Option B: Use translation keys directly**

```typescript
export const adminMenu: MenuItem[] = [
  {
    key: "admin-dashboard",
    title: "menu.admin.dashboard", // Use key directly
    href: "/admin",
    icon: "solar:home-angle-line-duotone",
    description: "menu.admin.dashboard.description",
    permission: "access.admin",
  },
  // ... more items
];
```

### Step 2: Update MenuItem Type Definition

Update the `MenuItem` interface to support translation keys:

```typescript
// types/menu.d.ts or in menu.ts
interface MenuItem {
  key: string;
  title: string;
  titleKey?: string; // Optional translation key
  href?: string;
  icon?: string;
  description?: string;
  descriptionKey?: string; // Optional translation key
  permission?: string | string[];
  settings?: string[];
  child?: MenuItem[];
}
```

### Step 3: Update Navigation Components

Update all components that render menus to use translations:

#### A. Admin Sidebar

**File**: `frontend/components/layouts/admin/sidebar.tsx` (or similar)

```typescript
'use client';

import { useTranslations } from 'next-intl';
import { adminMenu } from '@/config/menu';

export function AdminSidebar() {
  const t = useTranslations();

  return (
    <nav>
      {adminMenu.map((item) => {
        // Use translation key if available, otherwise use title
        const title = item.titleKey ? t(item.titleKey) : item.title;
        const description = item.descriptionKey
          ? t(item.descriptionKey)
          : item.description;

        return (
          <div key={item.key}>
            <a href={item.href}>
              {title}
            </a>
            {description && <p>{description}</p>}
          </div>
        );
      })}
    </nav>
  );
}
```

#### B. Top Navigation Bar

**File**: `frontend/components/layouts/admin/navbar.tsx` (or similar)

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function AdminNavbar({ menuItems }) {
  const t = useTranslations();

  return (
    <nav>
      {menuItems.map((item) => (
        <a key={item.key} href={item.href}>
          {item.titleKey ? t(item.titleKey) : item.title}
        </a>
      ))}
    </nav>
  );
}
```

#### C. Dropdown Menus

```typescript
'use client';

import { useTranslations } from 'next-intl';

export function MenuDropdown({ item }) {
  const t = useTranslations();
  const title = item.titleKey ? t(item.titleKey) : item.title;

  return (
    <div>
      <button>{title}</button>
      {item.child && (
        <ul>
          {item.child.map((child) => (
            <li key={child.key}>
              {child.titleKey ? t(child.titleKey) : child.title}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

### Step 4: Create Helper Hook (Optional but Recommended)

Create a custom hook for menu translation:

**File**: `frontend/hooks/useMenuTranslation.ts`

```typescript
import { useTranslations } from 'next-intl';

export function useMenuTranslation() {
  const t = useTranslations();

  const translateMenuItem = (item: MenuItem) => ({
    ...item,
    title: item.titleKey ? t(item.titleKey) : item.title,
    description: item.descriptionKey ? t(item.descriptionKey) : item.description,
    child: item.child?.map(translateMenuItem),
  });

  const translateMenu = (menu: MenuItem[]) => menu.map(translateMenuItem);

  return { translateMenuItem, translateMenu };
}
```

**Usage:**

```typescript
import { useMenuTranslation } from '@/hooks/useMenuTranslation';
import { adminMenu } from '@/config/menu';

export function Sidebar() {
  const { translateMenu } = useMenuTranslation();
  const translatedMenu = translateMenu(adminMenu);

  return (
    <nav>
      {translatedMenu.map((item) => (
        <a key={item.key} href={item.href}>
          {item.title}
        </a>
      ))}
    </nav>
  );
}
```

## Translation Workflow

### 1. Extract Menu Translations

When you add or modify menu items:

```bash
cd tools
node extract-menu-translations-v2.js
```

This will:
- Parse `menu.ts`
- Extract all translatable strings
- Update all locale files with new keys (English values)
- Generate `menu-translations.json` for reference

### 2. Translate to Other Languages

Use the Translation Manager tool:

```bash
cd tools/translation-manager
npm start
```

Or use automated translation:

```bash
cd tools
node sync-translations.js
```

### 3. Verify Translations

Check the locale files:

```bash
# Check English
cat frontend/messages/en.json | grep "menu\."

# Check Spanish
cat frontend/messages/es.json | grep "menu\."
```

## Files to Update

### Required Changes

1. ✅ **Translation Files** - Already updated with 180 keys
   - `frontend/messages/*.json` (all 90 locale files)

2. ⏳ **Menu Configuration** - Needs update
   - `frontend/config/menu.ts`
   - Add `titleKey` and `descriptionKey` fields

3. ⏳ **Navigation Components** - Needs update
   - Admin sidebar
   - Admin navbar
   - User navigation
   - Mobile menu
   - Dropdown menus

### Components Likely Needing Updates

Search for these files and update them:

```bash
# Find components that use adminMenu
grep -r "adminMenu" frontend/components --include="*.tsx"
grep -r "from '@/config/menu'" frontend --include="*.tsx"

# Find navigation components
find frontend/components -name "*sidebar*" -o -name "*navbar*" -o -name "*nav*"
```

Common locations:
- `frontend/components/layouts/admin/`
- `frontend/components/layouts/shared/`
- `frontend/app/[locale]/(dashboard)/admin/layout.tsx`

## Testing

### 1. Visual Testing

1. Start the development server
2. Switch between languages using the language selector
3. Verify all menu items translate correctly
4. Check both titles and descriptions

### 2. Automated Testing

Create tests for menu translation:

```typescript
// __tests__/menu-translation.test.tsx
import { render } from '@testing-library/react';
import { IntlProvider } from 'next-intl';
import { Sidebar } from '@/components/layouts/admin/sidebar';
import enMessages from '@/messages/en.json';
import esMessages from '@/messages/es.json';

describe('Menu Translation', () => {
  it('renders menu in English', () => {
    const { getByText } = render(
      <IntlProvider locale="en" messages={enMessages}>
        <Sidebar />
      </IntlProvider>
    );

    expect(getByText('Dashboard')).toBeInTheDocument();
  });

  it('renders menu in Spanish', () => {
    const { getByText } = render(
      <IntlProvider locale="es" messages={esMessages}>
        <Sidebar />
      </IntlProvider>
    );

    // Assuming Spanish translation exists
    expect(getByText('Tablero')).toBeInTheDocument();
  });
});
```

## Troubleshooting

### Menu items not translating

1. **Check translation keys exist:**
   ```bash
   grep "menu.admin.dashboard" frontend/messages/en.json
   ```

2. **Verify useTranslations hook is used:**
   ```typescript
   const t = useTranslations(); // Make sure this is present
   ```

3. **Check component is wrapped in IntlProvider:**
   - Ensure the layout provides the IntlProvider
   - Check `app/[locale]/layout.tsx`

### Missing translations

1. **Run extraction script again:**
   ```bash
   node tools/extract-menu-translations-v2.js
   ```

2. **Check for typos in keys:**
   - Keys should match exactly: `menu.admin.dashboard`
   - Not: `Menu.admin.dashboard` or `menu.admin-dashboard`

### Fallback not working

Ensure you have fallback logic:

```typescript
const title = item.titleKey ? t(item.titleKey) : item.title;
// This will use item.title if translation key doesn't exist
```

## Benefits

✅ **Multi-language Support**: Menus automatically adapt to user's language
✅ **Consistent Translation**: All menu items follow the same translation pattern
✅ **Easy Maintenance**: Update translations without touching code
✅ **Automatic Extraction**: Script extracts new menu items automatically
✅ **Fallback Support**: Original English text used if translation missing

## Next Steps

1. ✅ Translation keys extracted and added to all locales
2. ⏳ Update `menu.ts` to include translation keys
3. ⏳ Update navigation components to use translations
4. ⏳ Test with different languages
5. ⏳ Translate menu items to other languages using Translation Manager
6. ⏳ Document for team members

## Maintenance

### Adding New Menu Items

1. Add menu item to `menu.ts` with regular title/description
2. Run extraction script: `node tools/extract-menu-translations-v2.js`
3. Translate new keys using Translation Manager
4. Keys will automatically be available in components

### Modifying Menu Items

1. Update title/description in `menu.ts`
2. Run extraction script to update locale files
3. Re-translate if needed

### Removing Menu Items

1. Remove from `menu.ts`
2. Optionally clean up translation files (keys won't hurt if left)

## Related Documentation

- [Next-Intl Documentation](https://next-intl-docs.vercel.app/)
- [Translation Manager README](../tools/translation-manager/README.md)
- [Locale Structure Guide](../docs/LOCALE-STRUCTURE.md)
