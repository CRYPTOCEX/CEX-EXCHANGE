/*
  The GEO-RESTRICTION access key, not a new `access.system.attestation` — and
  not `access.system.settings`, which does not exist either. The seeder creates
  `access.settings`; `access.system.settings` was a guess, and
  `e2e/unit/frontend/permission-inventory.test.ts` caught it.

  That matters more than a spelling slip: the seeder is the ONLY writer to the
  permission table, so a key it does not create is UNGRANTABLE. Every route
  behind one 403s everybody except Super Admin — who bypasses the gate BY NAME,
  and therefore proves nothing when the person who wrote it tests it themselves.

  Geo-restriction is the right family rather than merely a granted one: deciding
  which countries the platform serves is that desk's job, this console sits
  beside it in the menu, and all five CRUD verbs are seeded.
*/
export const permission = "access.geo.restriction";
