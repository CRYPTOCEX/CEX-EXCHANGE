# Translation Manager Scripts

This folder contains CLI scripts for translation management tasks.

## Scripts

### extract-menu-translations-v2.js

Extracts menu translations from `frontend/config/menu.ts` and updates all locale files.

**Features:**
- Properly creates nested JSON structure
- Updates all 90+ locale files
- Used by the Translation Manager API

**Usage:**
```bash
node scripts/extract-menu-translations-v2.js
```

### update-usetranslations.js

Updates `useTranslations()` calls in source files to use correct namespaces.

**Features:**
- Handles files needing MULTIPLE namespaces
- Analyzes which keys each file uses
- Maps keys to their correct namespaces
- Generates multiple useTranslations calls when needed (e.g., `t`, `tCommon`, `tExt`)
- Updates t() calls to use the correct translator function

**Usage:**
```bash
# Preview changes without modifying files
node scripts/update-usetranslations.js --dry-run

# Apply changes
node scripts/update-usetranslations.js

# Verbose output
node scripts/update-usetranslations.js --verbose
```

## Integration

These scripts are integrated into the Translation Manager:
- Web UI at `http://localhost:5000`
- Backend API endpoints in `server/routes/tools.routes.js`
- Can also be run directly from command line

## Namespace Hierarchy

The Translation Manager uses a hierarchical namespace system based on file paths:

### How Namespaces Work

1. **File-based namespaces** - Derived from file path with max depth of 2:
   - `frontend/app/[locale]/(ext)/admin/affiliate/page.tsx` -> `ext_admin`
   - `frontend/app/[locale]/(dashboard)/user/profile/page.tsx` -> `dashboard_user`

2. **Shared namespaces** - Used for keys that appear across multiple files:
   - `common` - Keys used across different root folders (ext, dashboard, etc.)
   - `ext` - Keys shared within the (ext) folder
   - `dashboard` - Keys shared within the (dashboard) folder

3. **Namespace hierarchy** (most specific to least):
   - `ext_admin_affiliate` (page-specific)
   - `ext_admin` (section-specific)
   - `ext` (folder-wide)
   - `common` (project-wide)

### Key Deduplication

When extracting translations, the system:

1. Checks if the value already exists in the target namespace
2. Checks parent namespaces (e.g., `ext`, `common`)
3. Reuses existing keys instead of creating duplicates
4. Only creates new keys when the value doesn't exist anywhere

### Multi-Namespace Files

When a file uses keys from multiple namespaces, the system:

1. Uses `t` for the primary namespace (file's own or most used)
2. Uses `tCommon`, `tExt`, `tExtAdmin` etc. for other namespaces
3. Example:

```typescript
const t = useTranslations("ext_admin");
const tCommon = useTranslations("common");

// ...
title: t("page_title"),           // From ext_admin
description: tCommon("loading"),  // From common (shared key)
```

## Notes

All scripts assume they are run from the project root (`c:\xampp\htdocs\v5`).
