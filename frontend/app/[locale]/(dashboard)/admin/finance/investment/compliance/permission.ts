// Co-located permission contract for this admin page. This file is NOT
// imported by the page - it records the permission the backend endpoints
// behind this screen gate on, so the route metadata, config/menu.ts and the
// permissions seeder stay in sync.
//
// TWO permissions, deliberately, and the split is the point of the screen:
//   view.investment        reads the state (GET .../investment/compliance)
//   edit.investment.plan   saves the block list (PUT)
//
// Accepting or withdrawing the risk statement needs neither: it needs the
// SUPER ADMIN ROLE, resolved server-side per request by the PUT. A permission
// granted so somebody can edit a plan's interest rate is not authority to
// accept legal responsibility for offering an unregistered investment product
// in a territory that ships blocked.
export const permission = "view.investment";
export const writePermission = "edit.investment.plan";
