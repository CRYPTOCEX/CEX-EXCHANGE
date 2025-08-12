# Translation Manager Refactoring Guide

## Overview

The Translation Manager has been completely refactored from monolithic files into a modular, maintainable architecture. This guide explains the new structure and how to work with it.

## New File Structure

```
tools/translation-manager/
├── client/                          # Client-side code
│   ├── components/
│   │   ├── dashboard.js            # Dashboard rendering logic
│   │   ├── progress-tracker.js     # Real-time progress tracking
│   │   └── tabs/                   # Individual tab functionality
│   │       ├── dashboard.tab.js           # Dashboard tab
│   │       ├── translation-editor.tab.js  # Manual translation editor
│   │       ├── ai-translate.tab.js        # AI translation interface
│   │       ├── untranslatable.tab.js      # Untranslatable text management
│   │       ├── comparison.tab.js          # Locale comparison tools
│   │       ├── orphaned.tab.js            # Orphaned key management
│   │       └── jsx-cleanup.tab.js         # JSX hardcoded string cleanup
│   ├── services/
│   │   ├── websocket-client.js     # WebSocket connection management
│   │   ├── api-client.js           # API communication layer
│   │   └── router.js               # Client-side routing
│   └── utils/
│       └── ui-utils.js             # UI utility functions
├── server/                         # Server-side code
│   ├── websocket/
│   │   └── websocket-manager.js    # WebSocket server management
│   ├── services/
│   │   ├── translation-api.js      # Core translation logic
│   │   └── translation-state.js    # Translation state management
│   ├── routes/
│   │   ├── translation.routes.js   # Translation API endpoints
│   │   ├── untranslatable.routes.js # Untranslatable text endpoints
│   │   ├── comparison.routes.js     # Comparison tool endpoints
│   │   ├── orphaned.routes.js       # Orphaned key endpoints
│   │   ├── jsx.routes.js           # JSX cleanup endpoints
│   │   └── tools.routes.js         # Utility tool endpoints
│   ├── utils/
│   │   └── file-utils.js           # File system utilities
│   └── config/
│       └── config-loader.js        # Configuration loading
├── app.js                          # Main client application orchestrator
├── server.js                       # Main server application
└── index.html                      # HTML with proper script loading order
```

## Key Improvements

### 1. Modular Architecture
- **Single Responsibility Principle**: Each file has one clear purpose
- **Separation of Concerns**: Client/server code clearly separated
- **Reusable Components**: Services and utilities can be reused across modules

### 2. Client-Side Improvements
- **Tab System**: Each tab is now a self-contained module with its own initialization
- **Service Layer**: Centralized API communication and WebSocket handling
- **Event-Driven**: WebSocket events properly handled across components
- **Router**: Hash-based routing for single-page app navigation

### 3. Server-Side Improvements
- **Express Routes**: Modular route handlers for different API endpoints
- **Service Classes**: Business logic separated from route handling
- **State Management**: Centralized translation state tracking
- **WebSocket Manager**: Proper WebSocket connection and broadcast management

### 4. File Reduction
- **app.js**: Reduced from 38,043 tokens to ~435 lines (89% reduction)
- **server.js**: Reduced from 27,699 tokens to ~142 lines (99% reduction)
- **Better Organization**: Code split into focused, manageable modules

## How to Add New Features

### Adding a New Tab
1. Create a new tab file: `client/components/tabs/new-feature.tab.js`
2. Follow the IIFE pattern used by existing tabs
3. Export functions to `window.newFeature` object
4. Add script tag to `index.html`
5. Register route in `app.js` setupRoutes method

### Adding New API Endpoints
1. Create route file: `server/routes/new-feature.routes.js`
2. Follow the factory function pattern: `createNewFeatureRoutes(dependencies)`
3. Mount routes in `server.js`: `app.use('/api/new-feature', createNewFeatureRoutes())`
4. Add corresponding methods to `client/services/api-client.js`

### Adding New Services
1. Server: Create in `server/services/` with clear class interface
2. Client: Add to `client/services/` following singleton pattern
3. Make available globally via `window.serviceName`

## File Loading Order

The `index.html` loads files in this specific order:

1. **Utilities**: `ui-utils.js` - Global UI helpers
2. **Services**: WebSocket, API, Router - Core infrastructure
3. **Components**: Dashboard, Progress Tracker - Shared components
4. **Tabs**: All tab modules - Feature-specific functionality
5. **Main App**: `app.js` - Application orchestrator

## Global Objects

The refactored system provides these global objects:

- `window.UIUtils` - UI utility functions
- `window.wsClient` - WebSocket client
- `window.apiClient` - API communication
- `window.router` - Client-side routing
- `window.dashboard` - Dashboard functionality
- `window.progressTracker` - Progress tracking
- `window.translationManager` - Main application instance

Each tab also exports its functions (e.g., `window.translationEditor`, `window.aiTranslator`)

## Best Practices

### For Client-Side Code
- Use IIFE pattern to avoid global namespace pollution
- Export only necessary functions to global scope
- Handle errors gracefully with UIUtils.showError()
- Use debouncing for search inputs: `UIUtils.debounce()`

### For Server-Side Code
- Use factory functions for route creation
- Keep business logic in service classes
- Validate input data in route handlers
- Use proper HTTP status codes

### For Both
- Follow consistent naming conventions
- Add JSDoc comments for complex functions
- Use async/await for promise handling
- Handle errors appropriately

## Migration Notes

### Breaking Changes
- Tab functionality now requires separate script files
- Global variables restructured into namespaced objects
- WebSocket handling moved to dedicated service

### Compatibility
- All existing functionality maintained
- API endpoints unchanged
- WebSocket message format unchanged
- UI behavior identical to users

## Development Workflow

1. **Start Server**: Run `node server.js` for development
2. **Client Development**: Edit tab files for UI changes
3. **Server Development**: Edit route/service files for API changes
4. **Testing**: Test individual components in isolation
5. **Integration**: Ensure all components work together via main app

## Performance Benefits

- **Lazy Loading**: Tabs only initialize when accessed
- **Reduced Memory**: Smaller initial bundle size
- **Better Caching**: Individual files can be cached separately
- **Faster Development**: Changes to one tab don't require full reload

This refactored structure provides a solid foundation for future enhancements while maintaining all existing functionality.