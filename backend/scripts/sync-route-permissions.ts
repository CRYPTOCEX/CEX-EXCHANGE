/**
 * Make every permission a route asks for assignable — and, optionally, grant a
 * role the whole set.
 *
 *   cd backend
 *   npm run sync:permissions                       # report what is missing
 *   npm run sync:permissions -- --apply            # insert the missing rows
 *   npm run sync:permissions -- --grant "Admin"    # show what "Admin" is missing
 *   npm run sync:permissions -- --grant "Admin" --apply   # …and attach it all
 *
 * WHY THIS EXISTS
 * ---------------
 * `rolesGate` lets a request through when the caller's role holds the route's
 * declared permission, OR when the caller is Super Admin. If the permission is
 * not a row in the `permission` table it cannot be attached to any role, so the
 * route becomes Super-Admin-only — permanently, and silently. Nothing in the
 * platform creates those rows from route metadata, so every feature added after
 * the last permission seed (forex_trading, the ecosystem KMS, …) is unreachable
 * for a delegated Admin no matter what the operator ticks in the role editor.
 *
 * Inserting a permission grants nobody anything: it only makes the permission
 * available to assign. That is why the default mode is safe to run.
 *
 * WHY --grant EXISTS
 * ------------------
 * A role created outside the role editor — by hand, or by the demo-mode signup
 * path, which does `role.upsert({ name: "Admin" })` — holds ZERO permissions.
 * Nothing seeds them. Assigning that role to a user therefore grants nothing:
 * every /api/admin/* route answers 403, the frontend middleware bounces the
 * browser to `?auth=false`, and the page that renders says "You need to be
 * authenticated" to somebody who is. The obvious fix (tick the boxes in
 * Admin -> Roles) needs a Super Admin who can reach the admin panel — which is
 * exactly what an operator in this state does not have.
 *
 * --grant is the way back in, and it needs only database access. It is
 * DELIBERATELY not an API route: something that hands a role every permission on
 * the platform must not be reachable over HTTP.
 *
 * "Super Admin" is refused as a target. It bypasses permission checks by NAME
 * (see utils/super-admin.ts) and granting it rows would imply the name is not
 * the check, which is the one thing about that role that must stay true.
 */

import fs from "fs/promises";
import path from "path";
import { models } from "@b/db";

const APPLY = process.argv.includes("--apply");
const API_ROOT = path.resolve(__dirname, "../src/api");

/** `--grant "Admin"` / `--grant=Admin`, or null when not asked for. */
function grantTarget(): string | null {
  const argv = process.argv;
  const inline = argv.find((a) => a.startsWith("--grant="));
  if (inline) return inline.slice("--grant=".length) || null;
  const idx = argv.indexOf("--grant");
  if (idx === -1) return null;
  const next = argv[idx + 1];
  return next && !next.startsWith("--") ? next : null;
}

/** Walk the route tree the way handler/Routes.ts does. */
async function collectDeclaredPermissions(): Promise<Map<string, string[]>> {
  const declared = new Map<string, string[]>();

  async function walk(dir: string): Promise<void> {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        if (entry.name === "util") continue;
        await walk(path.join(dir, entry.name));
        continue;
      }
      if (!entry.name.endsWith(".ts")) continue;
      if (entry.name === "utils.ts" || entry.name === "queries.ts") continue;
      const method = entry.name.split(".")[1];
      if (!["get", "post", "put", "delete", "del", "ws"].includes(method)) continue;

      const file = path.join(dir, entry.name);
      const source = await fs.readFile(file, "utf8");
      const match = /\bpermission\s*:\s*["'`]([^"'`]+)["'`]/.exec(source);
      if (!match) continue;
      const name = match[1];
      const rel = path.relative(API_ROOT, file).replace(/\\/g, "/");
      declared.set(name, [...(declared.get(name) || []), rel]);
    }
  }

  await walk(API_ROOT);
  return declared;
}

function describe(name: string): string {
  // "view.forex_trading.account" -> "View Forex Trading Account"
  return name
    .split(".")
    .map((part) =>
      part
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
        .join(" ")
    )
    .join(" ");
}

async function syncPermissions() {
  const declared = await collectDeclaredPermissions();
  const existing = new Set(
    (await models.permission.findAll({ attributes: ["name"], raw: true })).map(
      (p: any) => p.name
    )
  );

  const missing = [...declared.keys()].filter((name) => !existing.has(name)).sort();

  console.log(
    `\n  ${declared.size} distinct permissions declared by routes, ${existing.size} in the table`
  );
  if (!missing.length) {
    console.log("  nothing missing\n");
    return;
  }

  console.log(`  ${missing.length} missing — these routes are Super-Admin-only today:\n`);
  for (const name of missing) {
    const routes = declared.get(name)!;
    console.log(
      `    ${name} — ${describe(name)}  (${routes.length} route${routes.length > 1 ? "s" : ""}, e.g. ${routes[0]})`
    );
  }

  if (!APPLY) {
    console.log(`\n  dry run. Re-run with --apply to insert these ${missing.length} rows.\n`);
    return;
  }

  let created = 0;
  for (const name of missing) {
    // The table carries only `name`; the derived label is for the log.
    await models.permission.create({ name } as any);
    created++;
  }
  console.log(
    `\n  inserted ${created} permissions. They are now assignable in the role editor;\n` +
      `  nobody holds them until an operator ticks them.\n`
  );
}

/**
 * Attach every assignable permission to one role.
 *
 * Runs AFTER the insert pass, so `--grant X --apply` in one command both creates
 * the missing permission rows and hands them over — otherwise the grant would
 * silently cover only the permissions that already happened to exist.
 */
async function grant(roleName: string) {
  if (roleName.toLowerCase() === "super admin") {
    console.log(
      `\n  refusing: "Super Admin" bypasses permission checks by NAME, not by\n` +
        `  grant (see utils/super-admin.ts). Attaching rows to it would be\n` +
        `  misleading and would change nothing.\n`
    );
    return;
  }

  const role: any = await models.role.findOne({
    where: { name: roleName },
    include: [
      {
        model: models.permission,
        as: "permissions",
        through: { attributes: [] },
        attributes: ["id", "name"],
      },
    ],
  });

  if (!role) {
    const names = (
      await models.role.findAll({ attributes: ["id", "name"], raw: true })
    ).map((r: any) => `${r.name} (id ${r.id})`);
    console.log(
      `\n  no role named "${roleName}". Roles on this install:\n` +
        names.map((n) => `    ${n}`).join("\n") +
        "\n"
    );
    process.exitCode = 1;
    return;
  }

  const all = await models.permission.findAll({
    attributes: ["id", "name"],
    raw: true,
  });
  const held = new Set((role.permissions || []).map((p: any) => p.name));
  const toAdd = all.filter((p: any) => !held.has(p.name));

  console.log(
    `\n  role "${role.name}" (id ${role.id}) holds ${held.size} of ${all.length} permissions`
  );

  if (!toAdd.length) {
    console.log("  nothing to grant\n");
    return;
  }

  if (!APPLY) {
    console.log(`  ${toAdd.length} would be granted. Re-run with --apply.\n`);
    return;
  }

  for (const permission of toAdd) {
    await models.rolePermission.findOrCreate({
      where: { roleId: role.id, permissionId: (permission as any).id },
      defaults: { roleId: role.id, permissionId: (permission as any).id } as any,
    });
  }

  console.log(
    `  granted ${toAdd.length}. Every thread picks this up within 60s\n` +
      `  (utils/roles.ts polls); restart the backend if you want it immediately.\n`
  );
}

async function main() {
  // Sequenced, not either/or: `--grant X --apply` must insert the missing
  // permission rows FIRST, or the grant covers only what already existed and
  // the role comes out silently short of the routes it needs.
  await syncPermissions();

  const role = grantTarget();
  if (role) await grant(role);
}

main()
  .then(() => process.exit(process.exitCode ?? 0))
  .catch((e) => {
    console.error("sync failed:", e);
    process.exit(1);
  });
