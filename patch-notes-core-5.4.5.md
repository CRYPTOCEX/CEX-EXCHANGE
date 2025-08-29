# Core v5.4.5 Patch Notes

## Fixed Issues

### 1. Support Ticket Visibility in Admin Dashboard
**Issue**: Support ticket details only showed ticket numbers, not actual content  
**Solution**: Removed `expandedOnly` flags from important columns to make them visible in the main table

### 2. API Management Navigation Error  
**Issue**: Clicking "API Management" in user dropdown resulted in 404 error  
**Solution**: Fixed navigation link from `/user/api` to `/user/profile?tab=api`

### 3. Master Wallet Balance Integration
**Issue**: Master wallet balances required separate API calls, causing performance issues  
**Solution**: Integrated balance fetching directly into the master wallet index endpoint with error resilience

### 4. Master Wallet Balance Display
**Issue**: Wallet balances were not displaying with proper precision  
**Solution**: Added 8 decimal place formatting to balance display in frontend

### 5. Ecosystem Order Routing
**Issue**: Orders on ecosystem markets were routing to wrong endpoint  
**Solution**: Fixed dynamic endpoint selection based on `isEco` flag and properly passed the flag from parent components

### 6. Floating Chat Persistence Issue
**Issue**: Floating chat setting was not persisting and would auto-disable after a few minutes  
**Root Cause**: The floating chat component was only rendered within the support layout, not globally  
**Solution**:
- Created a new `FloatingChatProvider` component that checks the `floatingLiveChat` setting globally
- Added the provider to the main `Providers` component to ensure it renders on all pages
- Fixed boolean value parsing in the settings hook to properly handle "true", "false", "1", "0" values
- Added proper exclusions to prevent duplicate chat rendering on support/admin/auth pages
- Added debug logging to track setting persistence issues

**Files Changed**:
- `frontend/components/global/floating-chat-provider.tsx` - New global floating chat provider
- `frontend/provider/providers.tsx` - Added FloatingChatProvider to main providers
- `frontend/hooks/use-settings.ts` - Fixed boolean parsing for settings values
- `backend/src/api/admin/system/settings/index.put.ts` - Added debug logging for setting updates

## Technical Improvements

- Enhanced settings persistence with better type handling
- Improved error handling for problematic blockchain integrations (e.g., Monero)
- Added comprehensive debug logging for settings management
- Better boolean value parsing and validation in settings

## Testing Notes

To verify the floating chat fix:
1. Navigate to Admin → System Settings → General tab
2. Enable "Floating Live Chat" toggle
3. Save settings
4. Navigate to any non-admin, non-support page
5. Verify the floating chat button appears and persists
6. Check browser console for debug logs if issues persist

### 7. Affiliate Commission Settings Persistence
**Issue**: Affiliate commission settings were not persisting and always showing default values  
**Root Cause**: Commission settings were saved but not properly loaded back due to missing parsing logic  
**Solution**:
- Added proper parsing of commission settings when loading from database
- Fixed state management to correctly update local settings after save
- Added settings cache refresh after saving to ensure data consistency
- Properly handle string to number conversion for commission values

**Files Changed**:
- `frontend/app/[locale]/(ext)/admin/affiliate/settings/client.tsx` - Fixed commission settings persistence and loading

### 8. P2P Payment Method Creation Error
**Issue**: Unable to add custom payment methods in P2P offers - "notNull Violation: p2pActivityLog.action cannot be null"  
**Root Cause**: Mismatch between activity log model fields and the code using it  
**Solution**:
- Fixed field name mismatches in p2pActivityLog usage across all P2P modules
- Changed `entityType`/`entityId` to correct `relatedEntity`/`relatedEntityId`
- Added required `action` field to all activity log entries
- Fixed metadata storage to use `details` field as JSON string

**Files Changed**:
- `backend/src/api/(ext)/p2p/payment-method/index.post.ts` - Fixed payment method creation logging
- `backend/src/api/(ext)/p2p/utils/audit.ts` - Fixed audit log utility functions
- `backend/src/api/(ext)/p2p/utils/p2p-trade-timeout.ts` - Fixed timeout handler logging
- `backend/src/api/(ext)/p2p/utils/ownership.ts` - Fixed admin action logging

### 9. P2P Payment Methods Visibility Issue
**Issue**: Users couldn't see payment methods created by admin from admin panel  
**Root Cause**: No distinction between user-specific and globally available payment methods  
**Solution**:
- Added `isGlobal` field to p2p_payment_methods table to mark admin-created global methods
- Created admin API endpoints for managing global payment methods
- Updated payment method fetch logic to include global methods for all users
- Added proper sorting to show global methods first

**New Features**:
- Admin can now create global payment methods available to all users
- Admin can manage all payment methods (global, system, and user-created)
- Users can see: global methods, system methods, and their own custom methods
- New admin interface for payment methods management with full CRUD operations

**Files Changed**:
- `backend/models/ext/p2p/p2pPaymentMethod.ts` - Added isGlobal field to model
- `backend/types/models/p2pPaymentMethod.d.ts` - Updated type definitions
- `backend/src/api/(ext)/p2p/payment-method/index.get.ts` - Updated to show global methods
- `backend/src/api/(ext)/p2p/payment-method/index.post.ts` - Set isGlobal=false for user methods
- `backend/src/api/(ext)/admin/p2p/payment-method/index.post.ts` - New admin create endpoint
- `backend/src/api/(ext)/admin/p2p/payment-method/index.get.ts` - New admin list endpoint
- `backend/src/api/(ext)/admin/p2p/payment-method/[id]/index.put.ts` - New admin update endpoint
- `backend/src/api/(ext)/admin/p2p/payment-method/[id]/index.del.ts` - New admin delete endpoint
- `backend/migrations/20240101000000-add-isGlobal-to-p2p-payment-methods.js` - Database migration
- `frontend/app/[locale]/(ext)/admin/p2p/payment-method/page.tsx` - New admin payment methods page
- `frontend/app/[locale]/(ext)/admin/p2p/payment-method/client.tsx` - Admin payment methods client component
- `frontend/app/[locale]/(ext)/admin/p2p/payment-method/columns.tsx` - Table columns configuration
- `frontend/app/[locale]/(ext)/admin/p2p/payment-method/components/payment-method-dialog.tsx` - Create/edit dialog
- `frontend/app/[locale]/(ext)/admin/p2p/components/navbar.tsx` - Added payment methods to admin navigation

**Migration Required**:
Run the migration to add the isGlobal column:
```bash
npm run migrate
```

## Known Limitations

- Floating chat will not appear on:
  - Admin pages (to avoid clutter)
  - Support pages (already has dedicated chat)
  - Auth pages (login/register)