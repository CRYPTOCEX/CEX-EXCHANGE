# 🌍 Translation Management Tools for Crypto Trading Platform

Professional translation management system to handle your Next.js crypto trading platform translations across 60+ languages.

## 🚀 New: Comprehensive Translation Management

### 🛠️ manage-translations.js (ALL-IN-ONE SOLUTION)
The ultimate translation management tool that handles everything:

- **✅ Scans TSX files** for `useTranslations()` calls
- **✅ Fixes invalid keys** (periods, special characters)
- **✅ Syncs namespaces** with locale files  
- **✅ Removes unused** translation keys
- **✅ Adds new keys** to all locales
- **✅ Detects untranslated** strings
- **✅ Auto-translates** using Azure
- **✅ Migrates keys** with custom mappings
- **✅ Generates reports** with coverage stats

```bash
# Complete workflow
node tools/manage-translations.js full

# Individual commands
node tools/manage-translations.js fix-keys   # Fix invalid translation keys
node tools/manage-translations.js sync      # Sync with TSX files
node tools/manage-translations.js migrate   # Migrate keys with custom mapping
node tools/manage-translations.js translate # Translate missing strings
node tools/manage-translations.js report    # Generate coverage report
```

## 🔧 Key Features

### 🛠️ Invalid Key Fixing
**Problem**: Next-intl doesn't allow periods in keys as they indicate nesting
**Solution**: Automatically converts problematic keys to clean format
- `"Welcome! Your account has been created successfully."` → `"welcome_your_account_has"`
- `"Don't see the email? Check your spam folder."` → `"dont_see_the_email_check_your_spam_folder"`
- Saves migration mapping for reference and rollback

### 🔄 Key Migration
Migrate specific translation keys using custom mapping files:
```json
{
  "old.key.with.dots": "new_key_with_underscores",
  "another.problematic.key": "another_clean_key"
}
```

## 🔷 Azure Translator (RECOMMENDED)
- **Quality**: ⭐⭐⭐⭐⭐ Professional grade
- **Speed**: ⚡⚡⚡⚡ 5-10 minutes for all languages
- **Cost**: ~$10-15 total
- **Languages**: 90+ supported

## 🎯 Quick Start

### Complete Translation Management
```bash
# 1. Setup Azure credentials (see AZURE-SETUP-GUIDE.md)
AZURE_TRANSLATOR_KEY=your-key
AZURE_TRANSLATOR_REGION=your-region

# 2. Run complete translation cycle (choose one)
pnpm translations:full                    # From root directory
cd frontend && pnpm translations:full     # From frontend directory
node tools/manage-translations.js full   # Direct tool usage
```

### Fix Invalid Translation Keys
```bash
# Fix keys that contain periods or special characters
pnpm translations:fix-keys               # From root directory
cd frontend && pnpm translations:fix-keys # From frontend directory
node tools/manage-translations.js fix-keys # Direct tool usage
```

### Manual Azure Translation
```bash
# Single language
node tools/translate-locales-azure.js single es

# All languages
node tools/translate-locales-azure.js all
```

## 📁 Files Overview

### 🎯 Main Tools
- `manage-translations.js` - **Complete translation management system**
- `translate-locales-azure.js` - Azure Translator script
- `TRANSLATION-COMMANDS.md` - **Detailed usage guide**
- `AZURE-SETUP-GUIDE.md` - Complete Azure setup guide

### 🔧 Other Tools
- `extract-permission.js` - Permission extraction tool
- `beautify-tsx.js` - Code formatting tools
- `fix-hooks-in-maps.js` - React hooks linting tools

## 🛠️ Translation Management Commands

### 📦 NPM/PNPM Scripts (Recommended)
```bash
# From root directory
pnpm translations:full           # Complete workflow
pnpm translations:fix-keys       # Fix invalid translation keys
pnpm translations:sync           # Sync TSX files with locales
pnpm translations:migrate        # Migrate keys with custom mapping
pnpm translations:translate      # Translate missing strings
pnpm translations:report         # Generate coverage report

# From frontend directory
cd frontend
pnpm translations:full           # Complete workflow
pnpm translations:fix-keys       # Fix invalid translation keys
pnpm translations:sync           # Sync TSX files with locales
```

### 🔧 Direct Tool Usage
```bash
# Fix invalid translation keys (periods, special chars)
node tools/manage-translations.js fix-keys

# Extract and show all translation namespaces
node tools/manage-translations.js extract

# Sync TSX files with locale files (add/remove keys)
node tools/manage-translations.js sync

# Migrate keys using custom mapping file
node tools/manage-translations.js migrate path/to/mappings.json

# Find untranslated strings across all locales
node tools/manage-translations.js untranslated

# Translate untranslated strings using Azure
node tools/manage-translations.js translate

# Generate comprehensive translation report
node tools/manage-translations.js report

# Run complete cycle: fix-keys → sync → translate → report
node tools/manage-translations.js full
```

📋 **See [TRANSLATION-COMMANDS.md](./TRANSLATION-COMMANDS.md) for detailed usage guide**

## 🌍 Supported Languages

Currently managing **68 languages** including:
- **European**: Spanish, French, German, Italian, Portuguese, Russian, Polish, Dutch, Swedish, Danish, Norwegian, Finnish, Czech, Slovak, Hungarian, Romanian, Bulgarian, Croatian, Slovenian, Estonian, Latvian, Lithuanian, Greek, Ukrainian
- **Asian**: Japanese, Korean, Chinese, Hindi, Arabic, Turkish, Thai, Vietnamese, Hebrew, Persian, Urdu, Bengali, Tamil, Telugu, Malayalam, Kannada, Gujarati, Punjabi, Marathi, Nepali, Sinhala, Myanmar, Khmer, Lao, Georgian, Indonesian, Malay
- **African**: Amharic, Swahili, Afrikaans, Zulu, Xhosa, Shona, Kinyarwanda, Chichewa, Malagasy
- **Others**: Icelandic, Maltese, Welsh, Irish, Basque, Catalan, Galician, Esperanto, Latin, Javanese, Sundanese, Filipino, Hawaiian, Maori, Samoan, Tongan, Fijian, Tahitian

## 📊 Translation Report Features

The management tool generates detailed reports with:
- **Coverage statistics** per locale
- **Untranslated strings** count
- **File usage mapping** (which files use which namespaces)
- **Translation progress** tracking
- **Namespace inventory** 

## 💰 Cost & Performance

| Method | Time | Cost | Quality | Best For |
|--------|------|------|---------|----------|
| **Management Tool** | 10-15 min | $10-15 | ⭐⭐⭐⭐⭐ | Complete workflow |
| **Azure Direct** | 5-10 min | $10-15 | ⭐⭐⭐⭐⭐ | Manual translation |

## 🎉 Expected Output

After running the management tool, you'll have:
- **Fixed translation keys** compatible with Next-intl
- **Synced translations** across all TSX files
- **68 language files** in `frontend/messages/`
- **Comprehensive report** with coverage stats
- **Clean namespace structure** with no unused keys
- **Professional translations** using Azure AI
- **Migration mappings** for tracking key changes

## 💡 Workflow Recommendations

### 🚀 For New Projects
1. `node tools/manage-translations.js fix-keys` - Fix any invalid keys
2. `node tools/manage-translations.js sync` - Set up initial structure
3. `node tools/manage-translations.js translate` - Translate to all languages
4. `node tools/manage-translations.js report` - Review coverage

### 🔄 For Ongoing Development
1. `node tools/manage-translations.js full` - Complete sync and translation
2. Review generated report for quality assurance
3. Commit changes to version control

### 🛠️ For Key Issues
1. `node tools/manage-translations.js fix-keys` - Fix invalid keys automatically
2. Create custom mapping file for specific migrations
3. `node tools/manage-translations.js migrate mappings.json` - Apply custom migrations

### 🎯 For Maintenance
- Run `fix-keys` when encountering INVALID_KEY errors
- Run `sync` after adding new components with translations
- Run `translate` when you have new untranslated strings
- Run `report` to monitor translation coverage

Choose the workflow that fits your development cycle! 🚀 