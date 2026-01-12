# Notification Service Dashboard

## Overview
Premium notification service management dashboard with real-time monitoring, testing, and analytics.

## Location
`/admin/notification`

## Features

### 1. **Dashboard Overview**
- Real-time statistics (Total Sent, Failed, Queue Jobs, Success Rate)
- Channel status monitoring (IN_APP, EMAIL, SMS, PUSH)
- Performance metrics with visual progress bars
- Queue status overview
- Uptime tracking
- Redis connection status

### 2. **Health Monitor**
- Overall system health status
- Redis cache connection monitoring
- Individual channel health checks
- Real-time health updates
- Historical health tracking (coming soon)

### 3. **Channel Tester**
- Test all 4 notification channels:
  - In-App Notifications
  - Email Notifications
  - SMS Notifications
  - Push Notifications
- User ID configuration
- Optional email/phone overrides
- Real-time test results
- Delivery status tracking

### 4. **Queue Manager**
- Real-time queue statistics (Waiting, Active, Completed, Failed)
- Queue health monitoring
- Failure rate tracking
- Queue cleanup tools
- Configurable cleanup intervals
- Safety confirmations for destructive actions

### 5. **Metrics Panel**
- Time-based analytics (Hour, Day, Week, Month)
- Total notification metrics
- Channel-specific performance breakdown
- Notification type distribution
- Success rate tracking
- Visual charts and graphs

### 6. **Settings Panel**
- Channel configuration display
- Provider status overview
- Feature toggles status:
  - Idempotency (30-day TTL)
  - User Preferences (1-hour cache)
  - Delivery Tracking (30-day TTL)
- Priority levels (LOW, NORMAL, HIGH, URGENT)
- Supported notification types (15+ types)

## Design Features

### Premium UI Elements
- Gradient text headers
- Smooth animations with Framer Motion
- Color-coded status indicators
- Responsive grid layouts
- Card-based component structure
- Glassmorphism effects
- Icon-enhanced navigation

### Color Coding
- **Green**: Healthy/Success states
- **Yellow**: Degraded/Warning states
- **Red**: Unhealthy/Error states
- **Blue**: In-App channel
- **Green**: Email channel
- **Orange**: SMS channel
- **Purple**: Push channel

### Responsive Design
- Mobile-friendly layouts
- Adaptive grid systems
- Touch-friendly buttons
- Collapsible sections

## API Endpoints Used

### GET Endpoints
- `/api/admin/system/notification` - Dashboard overview
- `/api/admin/system/notification/health` - Health status
- `/api/admin/system/notification/metrics?period=` - Metrics data
- `/api/admin/system/notification/queue/stats` - Queue statistics
- `/api/admin/system/notification/settings` - Service configuration
- `/api/admin/system/notification/analytics?timeframe=` - Analytics data

### POST Endpoints
- `/api/admin/system/notification/test/email` - Test email
- `/api/admin/system/notification/test/sms` - Test SMS
- `/api/admin/system/notification/test/push` - Test push
- `/api/admin/system/notification/test/in-app` - Test in-app
- `/api/admin/system/notification/queue/clean` - Clean queue

## Components Structure

```
frontend/app/[locale]/(dashboard)/admin/notification/
├── page.tsx                    # Main page wrapper
├── client.tsx                  # Client component with tabs
├── loading.tsx                 # Loading state
└── components/
    ├── dashboard-overview.tsx  # Overview tab
    ├── health-monitor.tsx      # Health tab
    ├── channel-tester.tsx      # Testing tab
    ├── queue-manager.tsx       # Queue tab
    ├── metrics-panel.tsx       # Metrics tab
    └── settings-panel.tsx      # Settings tab
```

## Permission Required
`access.notification.settings`

## Auto-Refresh
- Dashboard data refreshes every 30 seconds
- Manual refresh available via refresh buttons
- Real-time updates on user actions

## Usage Tips

### Testing Channels
1. Navigate to the **Testing** tab
2. Enter a User ID (or leave empty for your account)
3. Optionally override email/phone for specific tests
4. Click "Send Test" for any channel
5. Review results immediately below the test button

### Monitoring Queue
1. Go to **Queue** tab
2. View real-time statistics
3. Monitor failure rates
4. Clean old jobs when needed (recommended: 24 hours)

### Viewing Metrics
1. Open **Metrics** tab
2. Select time period (Hour/Day/Week/Month)
3. Review overall performance
4. Check channel-specific statistics
5. Analyze notification type distribution

### Checking Health
1. Access **Health** tab
2. Review overall status
3. Check Redis connection
4. Verify individual channels
5. Use refresh for latest status

## Future Enhancements
- Real-time WebSocket updates
- Historical health graphs
- Export metrics to CSV/PDF
- Advanced filtering options
- Custom date range selection
- Alert configuration
- Scheduled reports
