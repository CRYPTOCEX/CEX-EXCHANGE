# Translation Manager Scripts

This folder contains all scripts related to translation management for the application.

## Scripts

### Menu Translation Extraction

- **extract-menu-translations-v2.js** - Current version that extracts menu translations from `frontend/config/menu.ts` and updates all 90 locale files
  - Properly creates nested JSON structure
  - Generates `menu-translations.json` with extracted keys
  - Usage: `node extract-menu-translations-v2.js`

- **extract-menu-translations.js** - Legacy version (kept for reference)

### General Translation Management

- **extract-translation.js** - Extracts translation keys from the codebase
  - Scans frontend code for translation usage
  - Identifies missing translations
  - Usage: `node extract-translation.js`

- **sync-translations.js** - Synchronizes translation keys across all locale files
  - Ensures all locales have the same keys
  - Adds missing keys with fallback values
  - Usage: `node sync-translations.js`

- **fix-locale-structure.js** - Fixes and validates locale file structure
  - Converts flat keys to nested structure
  - Validates JSON syntax
  - Usage: `node fix-locale-structure.js`

### Validation & Debugging

- **check-flat-keys.js** - Checks for flat keys with dots in locale files
  - Identifies keys that need to be converted to nested structure
  - Usage: `node check-flat-keys.js`

- **check-ext-keys.js** - Checks extension-related translation keys
  - Usage: `node check-ext-keys.js`

## Output Files

- **menu-translations.json** - Generated file containing extracted menu translations in flat format for reference

## Integration

These scripts are integrated into the Translation Manager web interface and can be run via:
- Web UI at `http://localhost:3000/tools/translation-manager`
- Backend API endpoints in `server/routes/tools-v2.routes.js`
- Direct command line execution

## Notes

All scripts assume they are run from the project root or handle relative paths correctly from their location in `tools/translation-manager/scripts/`.
