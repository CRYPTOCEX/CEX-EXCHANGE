# Translation Management Commands

This document provides a comprehensive guide to using the translation management system for the BiCrypto platform.

## Overview

The translation system manages 6,924+ translation keys across 168 namespaces in 68 languages. It automatically extracts translation keys from TSX files, syncs them with locale files, detects untranslated strings, and uses Azure Translator for automatic translation.

## Available Commands

### Core Commands

#### `pnpm translations:sync`
**Purpose**: Extract namespaces from TSX files and sync with locale files
- Scans all TSX files for `useTranslations()` calls
- Extracts translation namespaces
- Adds new namespaces to all locale files
- Removes unused namespaces from all locale files
- Creates placeholder keys for new namespaces

```bash
# From root directory
pnpm translations:sync

# From frontend directory
cd frontend && pnpm translations:sync
```

#### `pnpm translations:fix-keys`
**Purpose**: Fix invalid translation keys that contain periods and special characters
- Replaces periods (.) with underscores (_) to make keys Next-intl compatible
- Removes special characters like !, ?, :, ;, quotes
- Converts keys to lowercase with proper formatting
- Saves migration mapping for reference
- Updates all locale files with clean keys

```bash
# From root directory
pnpm translations:fix-keys

# From frontend directory
cd frontend && pnpm translations:fix-keys
```

**Example transformations**:
- `"Welcome! Your account has been created successfully."` → `"welcome_your_account_has"`
- `"Don't see the email? Check your spam folder."` → `"dont_see_the_email_check_your_spam_folder"`
- `"Registration Successful!"` → `"registration_successful"`

#### `pnpm translations:migrate`
**Purpose**: Migrate specific translation keys using a custom mapping file
- Allows manual key renaming across all locales
- Preserves translation values while changing keys
- Cleans up empty objects after migration

```bash
# From root directory
pnpm translations:migrate path/to/key-mappings.json

# From frontend directory
cd frontend && pnpm translations:migrate ../path/to/key-mappings.json
```

**Example mapping file** (`key-mappings.json`):
```json
{
  "old.key.with.dots": "new_key_with_underscores",
  "another.problematic.key": "another_clean_key",
  "components/auth/login.Submit Form": "components/auth/login.submit_form"
}
```

#### `pnpm translations:extract`
**Purpose**: Display all extracted translation namespaces
- Shows the complete list of namespaces found in TSX files
- Useful for debugging and understanding the translation structure

```bash
pnpm translations:extract
```

#### `pnpm translations:untranslated`
**Purpose**: Find untranslated strings in all locales
- Compares each locale with English (base language)
- Identifies strings that need translation
- Shows counts per locale and sample untranslated keys

```bash
pnpm translations:untranslated
```

#### `pnpm translations:translate`
**Purpose**: Auto-translate untranslated strings using Azure Translator
- Uses Azure Cognitive Services Translator
- Translates only untranslated content (preserves existing translations)
- Processes all locales automatically
- Handles rate limiting and batch processing

```bash
pnpm translations:translate
```

**Prerequisites**:
- Azure Translator subscription
- Environment variables configured in `.env`:
  ```
  AZURE_TRANSLATOR_KEY=your_key_here
  AZURE_TRANSLATOR_REGION=eastus
  AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com
  ```

#### `pnpm translations:report`
**Purpose**: Generate comprehensive translation coverage report
- Shows translation statistics for all locales
- Displays coverage percentages
- Lists all namespaces and their usage
- Saves detailed JSON report

```bash
pnpm translations:report
```

#### `pnpm translations:full`
**Purpose**: Run complete translation management cycle
- Executes: fix-keys → sync → translate → report
- Recommended for comprehensive translation updates
- Ideal for CI/CD pipelines or major updates

```bash
pnpm translations:full
```

## Workflow Examples

### Initial Setup (New Project)
```bash
# 1. Fix any existing invalid keys
pnpm translations:fix-keys

# 2. Sync translations with current TSX files
pnpm translations:sync

# 3. Generate initial report
pnpm translations:report
```

### Daily Development Workflow
```bash
# After adding new components with translations
pnpm translations:sync

# Check what needs translation
pnpm translations:untranslated

# Auto-translate if needed
pnpm translations:translate
```

### Major Update/Refactoring
```bash
# Complete cycle for major changes
pnpm translations:full
```

### Custom Key Migration
```bash
# 1. Create mapping file
echo '{
  "old.problematic.key": "new_clean_key",
  "another.key.with.dots": "another_clean_key"
}' > key-mappings.json

# 2. Apply migration
pnpm translations:migrate key-mappings.json

# 3. Update components to use new keys
# 4. Test and verify
```

## Key Features

### 🔧 Invalid Key Fixing
- **Problem**: Next-intl doesn't allow periods in keys as they indicate nesting
- **Solution**: Automatically converts problematic keys to clean format
- **Tracking**: Saves migration mapping for reference and rollback

### 🌍 Multi-Language Support
- **68 Languages**: From Afrikaans to Zulu
- **Smart Detection**: Identifies untranslated strings intelligently
- **Batch Processing**: Efficient translation of multiple languages

### 📊 Comprehensive Reporting
- **Coverage Statistics**: Per-locale translation percentages
- **Usage Tracking**: Which files use which namespaces
- **Progress Monitoring**: Track translation completion over time

### 🚀 Azure Integration
- **Professional Translation**: Microsoft's enterprise translation service
- **Rate Limiting**: Respects API limits with proper delays
- **Error Handling**: Robust error handling and retry logic

## File Structure

```
frontend/messages/
├── en.json                 # Base language (English)
├── es.json                 # Spanish translations
├── fr.json                 # French translations
├── ...                     # Other locale files
├── key-migrations.json     # Auto-generated migration mapping
└── translation-report.json # Generated coverage report
```

## Environment Configuration

Required environment variables in `.env`:

```env
# Azure Translator (required for auto-translation)
AZURE_TRANSLATOR_KEY=your_subscription_key
AZURE_TRANSLATOR_REGION=eastus
AZURE_TRANSLATOR_ENDPOINT=https://api.cognitive.microsofttranslator.com

# Supported languages (comma-separated)
NEXT_PUBLIC_LANGUAGES=en,es,fr,de,it,pt,ru,ja,ko,zh,ar,hi,bn,ur,tr,pl,nl,sv,da,no,fi,cs,sk,hu,ro,bg,hr,sr,sl,et,lv,lt,mt,ga,cy,is,fo,mk,sq,bs,me,am,ka,hy,az,be,kk,ky,tg,tk,uz,mn,my,km,lo,si,ne,ta,te,kn,ml,gu,pa,mr,bn,or,as,sa,sd,ps,fa,ku,ckb,so,sw,zu,xh,af,st,tn,ve,ts,ss,nr,nso,fj
```

## Troubleshooting

### Common Issues

#### 1. "INVALID_KEY" Error
**Problem**: Translation keys contain periods or special characters
**Solution**: Run `pnpm translations:fix-keys` to clean all keys

#### 2. Missing Translations
**Problem**: New components not showing translations
**Solution**: 
```bash
pnpm translations:sync
pnpm translations:translate
```

#### 3. Azure Translation Errors
**Problem**: Translation fails with API errors
**Solution**: Check environment variables and Azure subscription status

#### 4. Performance Issues
**Problem**: Large translation files causing slow builds
**Solution**: The system automatically optimizes for performance, but consider splitting large namespaces

### Best Practices

1. **Run fix-keys first** when setting up or encountering key errors
2. **Use sync regularly** during development to keep translations current
3. **Create meaningful namespaces** that reflect component structure
4. **Test translations** in multiple languages during development
5. **Use migration mappings** for tracking key changes over time

## Statistics

- **Total Keys**: 6,924+ translation keys
- **Namespaces**: 168 translation namespaces
- **Languages**: 68 supported languages
- **Files**: 661+ TSX files scanned
- **Coverage**: Varies by language (English 100%, others depend on translation status)

## Integration

### CI/CD Pipeline
```yaml
# Example GitHub Actions workflow
- name: Update Translations
  run: |
    pnpm translations:fix-keys
    pnpm translations:sync
    pnpm translations:translate
    pnpm translations:report
```

### Development Hooks
```json
{
  "scripts": {
    "pre-commit": "pnpm translations:sync",
    "pre-build": "pnpm translations:report"
  }
}
```

This translation system ensures your application maintains consistent, high-quality translations across all supported languages while providing developers with powerful tools for managing the translation workflow. 