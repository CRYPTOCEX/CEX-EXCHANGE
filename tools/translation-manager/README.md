# Translation Management System

A comprehensive web-based translation management system with Claude Code integration for AI-powered translations.

## Features

### 🌐 Multi-Locale Management
- View and manage all translation locales
- Real-time progress tracking
- Translation completion statistics

### ✏️ Translation Editor
- Interactive key-by-key translation interface
- Search and filter functionality
- Context-aware translation assistance

### 🤖 AI Translation with Claude Code
- Batch translation capabilities
- Priority-based translation queuing
- Context-aware AI translations
- Quality assurance checks

### 📊 Analytics & Reports
- Translation coverage reports
- Progress tracking by locale
- Missing keys analysis
- Quality assessment tools

### 🔧 Translation Tools
- Bulk import/export operations
- Duplicate value detection
- Validation and cleanup utilities
- Identical value analysis

### 📝 Activity Logging
- Comprehensive operation tracking
- Translation history
- User activity monitoring

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- Claude Code CLI installed and configured

### Quick Start

1. **Install Dependencies**
   ```bash
   cd C:\xampp\htdocs\v5\tools\translation-manager
   npm install
   ```

2. **Start the Server**
   ```bash
   npm start
   ```

3. **Access the Web Interface**
   Open your browser and navigate to: `http://localhost:5000`

### Development Mode
```bash
npm run dev
```
This uses nodemon for automatic server restarts during development.

## Usage Guide

### 1. Dashboard
- Overview of all locales and their translation progress
- Quick stats: total locales, translated keys, missing translations
- Recent activity feed

### 2. Locale Manager
- View all available locales
- Add new locales
- Monitor translation progress per locale
- Manage locale-specific settings

### 3. Translation Editor
- Select a locale to work with
- Browse and search translation keys
- Edit translations inline
- Use AI translation assistance

### 4. AI Translation
Configure and run automated translation batches:
- **Target Locale**: Choose which locale to translate
- **Mode Options**:
  - Only Missing Translations
  - Identical Values Only
  - Review All Translations
- **Priority Levels**:
  - High Priority Only (UI elements, navigation)
  - Medium & High Priority (features, settings)
  - All Priorities (including technical terms)
- **Batch Size**: Number of keys to process at once

### 5. Locale Comparison
- Compare two locales side by side
- Identify differences and missing keys
- Visual diff display for easy review

### 6. Translation Tools
**Bulk Operations:**
- Export translations to various formats
- Import translations from files
- Validate translation integrity
- Clean up unused keys

**Analysis Tools:**
- Generate translation coverage reports
- Find duplicate values across locales
- Identify missing keys
- Perform quality checks

### 7. Activity Logs
- View all translation operations
- Filter by activity type
- Track AI translation sessions
- Monitor system events

## Claude Code Integration

The system integrates with Claude Code for AI-powered translations:

### Setup Claude Code
1. Install Claude Code CLI
2. Authenticate with your Claude account
3. Ensure `claude` command is available in your PATH

### Translation Process
1. Select keys to translate
2. System sends translation request to Claude with:
   - Source English text
   - Target language
   - Context information
   - Cultural adaptation guidelines
3. Claude provides culturally appropriate translations
4. Results are reviewed and saved automatically

### Quality Assurance
- Context-aware translations
- Cultural appropriateness checks
- Grammar and spelling validation
- Technical term preservation

## API Endpoints

### Locales
- `GET /api/locales` - Get all locales with statistics
- `GET /api/locales/:locale/keys` - Get all keys for a locale
- `PUT /api/locales/:locale/keys` - Update a translation

### AI Translation
- `POST /api/ai-translate-key` - Translate a single key
- `POST /api/ai-translate` - Start batch translation

### Analysis
- `GET /api/compare/:source/:target` - Compare two locales
- `POST /api/identical` - Find identical values
- `POST /api/tools/:tool` - Run analysis tools

## File Structure

```
translation-manager/
├── index.html              # Main web interface
├── app.js                  # Frontend JavaScript application
├── server.js               # Backend API server
├── package.json            # Node.js dependencies
├── README.md               # This file
└── start.bat               # Windows startup script
```

## Configuration

### Environment Variables
- `PORT` - Server port (default: 5000)
- `MESSAGES_DIR` - Path to translation files
- `CLAUDE_API_KEY` - Claude API key (if using API instead of CLI)

### Translation Settings
The system automatically detects translation files in:
`C:\xampp\htdocs\v5\frontend\messages\`

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check Node.js installation: `node --version`
   - Install dependencies: `npm install`
   - Check port availability: `netstat -an | findstr 5000`

2. **Claude Code not working**
   - Verify installation: `claude --version`
   - Check authentication: `claude auth status`
   - Test connection: `claude code --help`

3. **Translation files not found**
   - Verify path: `C:\xampp\htdocs\v5\frontend\messages\`
   - Check file permissions
   - Ensure JSON files are valid

### Logs & Debugging
- Server logs: Console output from `npm start`
- Activity logs: Available in the web interface
- Browser console: F12 developer tools

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the troubleshooting section
2. Review server logs
3. Check Claude Code status
4. Contact the development team

---

**Happy Translating! 🌍✨**