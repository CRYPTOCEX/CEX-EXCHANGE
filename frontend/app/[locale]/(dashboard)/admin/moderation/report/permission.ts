/*
  The BLOG COMMENT access key, not a new `access.moderation.report`.

  A permission key must be registered in four places and only the seeder writes
  the permission table, so a key it does not list is UNGRANTABLE — the gate then
  403s every non-Super-Admin, silently and forever, on any install that upgrades
  without re-seeding. Blog comments are the surface this queue was built for and
  the remedy lives in the tooling this key already opens.
*/
export const permission = "access.blog.comment";
