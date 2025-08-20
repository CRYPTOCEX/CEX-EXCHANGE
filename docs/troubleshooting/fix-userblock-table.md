# Fix for userBlock Table Creation Error

## Problem
When starting the backend, you may encounter this error:
```
Can't create table `coinexchangeworld`.`userBlock` (errno: 121 "Duplicate key on write or update")
```

This error occurs due to:
1. Naming convention inconsistency (should be `user_blocks` not `userBlock`)
2. Duplicate foreign key constraint names
3. Conflicting table definitions

## Solution

### Option 1: Run the Fix Script (Recommended)

1. Navigate to the backend directory:
```bash
cd backend
```

2. Run the fix script:
```bash
node scripts/fix-user-blocks.js
```

3. Start the backend normally:
```bash
npm run dev
```

### Option 2: Manual Database Fix

If the script doesn't work, manually fix the database:

1. Connect to your MySQL database:
```bash
mysql -u root -p coinexchangeworld
```

2. Drop the problematic table if it exists:
```sql
-- Check if table exists
SHOW TABLES LIKE 'userBlock';

-- If it exists, drop foreign key constraints first
SELECT CONSTRAINT_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'userBlock' 
AND TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Drop each constraint (replace CONSTRAINT_NAME with actual names)
ALTER TABLE userBlock DROP FOREIGN KEY CONSTRAINT_NAME;

-- Drop the table
DROP TABLE IF EXISTS userBlock;
```

3. Check if the correctly named table exists:
```sql
SHOW TABLES LIKE 'user_blocks';
```

4. If `user_blocks` exists with foreign keys, drop them:
```sql
-- Check constraints
SELECT CONSTRAINT_NAME 
FROM information_schema.KEY_COLUMN_USAGE 
WHERE TABLE_NAME = 'user_blocks' 
AND TABLE_SCHEMA = DATABASE()
AND REFERENCED_TABLE_NAME IS NOT NULL;

-- Drop each constraint
ALTER TABLE user_blocks DROP FOREIGN KEY CONSTRAINT_NAME;
```

5. Exit MySQL and start the backend:
```bash
exit
npm run dev
```

## What Changed

### Model File Updates
- Changed table name from `userBlock` to `user_blocks` to follow naming convention
- Renamed foreign key aliases to avoid conflicts:
  - `user` → `blockedUser`
  - `admin` → `blockingAdmin`
- Disabled foreign key constraints in associations to prevent conflicts
- Updated index names to match new table name

### Files Modified
- `backend/models/userBlock.ts` - Updated table name and associations
- `backend/models/user.ts` - Added `constraints: false` to associations
- `backend/migrations/fix-user-blocks-table.js` - Migration to handle existing tables
- `backend/scripts/fix-user-blocks.js` - Script to fix database issues

## Prevention
To prevent this issue in the future:
1. Always use snake_case for table names (e.g., `user_blocks`, `payment_methods`)
2. Use unique constraint names across the database
3. Disable constraints in Sequelize associations when there might be conflicts
4. Test migrations in a development environment first

## Related Issues
- Foreign key constraint conflicts
- Sequelize sync vs migrations
- Table naming conventions