require('dotenv').config();

const express = require('express');
const cors = require('cors');
const http = require('http');
const path = require('path');

// Import our refactored modules
const WebSocketManager = require('./server/websocket/websocket-manager');
const TranslationAPI = require('./server/services/translation-api');
const TranslationStateManager = require('./server/services/translation-state');
const { loadUntranslatableConfig } = require('./server/config/config-loader');
const { getTsxFiles } = require('./server/utils/file-utils');

// Import route modules
const createTranslationRoutes = require('./server/routes/translation.routes');
const createUntranslatableRoutes = require('./server/routes/untranslatable.routes');
const createComparisonRoutes = require('./server/routes/comparison.routes');
const createOrphanedRoutes = require('./server/routes/orphaned.routes');
const createJsxRoutes = require('./server/routes/jsx.routes');
const createToolsRoutes = require('./server/routes/tools.routes');
const createToolsV2Routes = require('./server/routes/tools-v2.routes');
const createLocalesRoutes = require('./server/routes/locales.routes');

// Load configuration
const untranslatableConfig = loadUntranslatableConfig();

// Initialize Express app
const app = express();
const PORT = process.env.PORT || 5000;

// Create HTTP server and WebSocket manager
const server = http.createServer(app);
const wsManager = new WebSocketManager();
wsManager.initialize(server);

// Initialize services
const api = new TranslationAPI();
const translationState = new TranslationStateManager();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// Mount API routes
app.use('/api', createTranslationRoutes(api, translationState, wsManager));
app.use('/api/untranslatable', createUntranslatableRoutes(api, untranslatableConfig, getTsxFiles));
app.use('/api', createComparisonRoutes(api));
app.use('/api/orphaned', createOrphanedRoutes(api, getTsxFiles));
app.use('/api/jsx', createJsxRoutes(getTsxFiles));
app.use('/api/tools', createToolsRoutes());
app.use('/api/tools-v2', createToolsV2Routes());
app.use('/api', createLocalesRoutes(api));

// Additional utility routes

app.get('/api/locales/:locale/key', async (req, res) => {
    try {
        const { locale: localeCode } = req.params;
        const { key } = req.query;
        
        const locale = api.locales.get(localeCode);
        if (!locale) {
            return res.status(404).json({ error: 'Locale not found' });
        }
        
        const value = locale.keys[key];
        res.json({ key, value: value || '', exists: !!value });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Master data routes
app.get('/api/master-data', async (req, res) => {
    try {
        const masterDataPath = path.join(__dirname, 'master-translations-data.json');
        const fs = require('fs');
        
        if (!fs.existsSync(masterDataPath)) {
            return res.json({ translations: {} });
        }
        
        const data = JSON.parse(fs.readFileSync(masterDataPath, 'utf8'));
        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/master-data', async (req, res) => {
    try {
        const { translations } = req.body;
        const masterDataPath = path.join(__dirname, 'master-translations-data.json');
        const fs = require('fs');
        
        fs.writeFileSync(masterDataPath, JSON.stringify({ translations }, null, 2));
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Error handler
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ 
        error: 'Internal server error',
        message: err.message 
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
server.listen(PORT, () => {
    console.log(`Translation Manager server running on port ${PORT}`);
    console.log(`WebSocket server initialized`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

module.exports = { app, server };