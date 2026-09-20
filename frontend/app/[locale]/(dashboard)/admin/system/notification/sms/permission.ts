// Co-located permission contract for this admin page. This file is NOT
// imported by the page - it records the permission the backend endpoints
// behind this screen gate on, so the route metadata, config/menu.ts and the
// permissions seeder stay in sync.
//
// Reuses the notification settings permission rather than minting a new key:
// this screen configures the SMS channel of the notification service and is
// gated by exactly the same endpoints as the notification settings page.
export const permission = "access.notification.settings";
