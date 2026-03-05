import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// All permission keys: resource.action
const RESOURCES = [
  "users", "roles", "products", "designers", "projects", "campaigns",
  "awards", "catalogs", "news", "stores", "agents", "newsletter",
  "contacts", "forms", "media", "hero", "settings", "analytics",
  "firma", "import_export",
];
const ACTIONS = ["view", "create", "edit", "delete"];

function allPerms(value: boolean): Record<string, boolean> {
  const p: Record<string, boolean> = {};
  for (const r of RESOURCES) for (const a of ACTIONS) p[`${r}.${a}`] = value;
  return p;
}

function mergePerms(base: boolean, overrides: Record<string, boolean>): Record<string, boolean> {
  return { ...allPerms(base), ...overrides };
}

// Content resources that editors can manage
const CONTENT_RESOURCES = [
  "products", "designers", "projects", "campaigns", "awards",
  "catalogs", "news", "media", "hero",
];

function editorPerms(): Record<string, boolean> {
  const p = allPerms(false);
  for (const r of CONTENT_RESOURCES) {
    p[`${r}.view`] = true;
    p[`${r}.create`] = true;
    p[`${r}.edit`] = true;
    // delete stays false
  }
  // Editor can view contacts and newsletter
  p["contacts.view"] = true;
  p["newsletter.view"] = true;
  // Editor can use firma
  p["firma.view"] = true;
  p["firma.edit"] = true;
  return p;
}

function agentPerms(): Record<string, boolean> {
  const p = allPerms(false);
  p["stores.view"] = true;
  p["agents.view"] = true;
  p["contacts.view"] = true;
  p["firma.view"] = true;
  p["firma.edit"] = true;
  return p;
}

function clientPerms(): Record<string, boolean> {
  const p = allPerms(false);
  p["firma.view"] = true;
  return p;
}

function designerPerms(): Record<string, boolean> {
  const p = allPerms(false);
  p["products.view"] = true;
  p["projects.view"] = true;
  p["firma.view"] = true;
  return p;
}

function architectPerms(): Record<string, boolean> {
  const p = allPerms(false);
  p["products.view"] = true;
  p["projects.view"] = true;
  p["firma.view"] = true;
  return p;
}

const SYSTEM_ROLES = [
  {
    name: "superadmin",
    label: "Super Admin",
    permissions: JSON.stringify(allPerms(true)),
    isSystem: true,
    sortOrder: 0,
  },
  {
    name: "admin",
    label: "Amministratore",
    permissions: JSON.stringify(
      mergePerms(true, {
        // Admin cannot manage roles (only superadmin can)
      })
    ),
    isSystem: true,
    sortOrder: 1,
  },
  {
    name: "editor",
    label: "Editor",
    permissions: JSON.stringify(editorPerms()),
    isSystem: true,
    sortOrder: 2,
  },
  {
    name: "agent",
    label: "Agente",
    permissions: JSON.stringify(agentPerms()),
    isSystem: true,
    sortOrder: 3,
  },
  {
    name: "client",
    label: "Cliente Finale",
    permissions: JSON.stringify(clientPerms()),
    isSystem: true,
    sortOrder: 4,
  },
  {
    name: "designer",
    label: "Designer",
    permissions: JSON.stringify(designerPerms()),
    isSystem: true,
    sortOrder: 5,
  },
  {
    name: "architect",
    label: "Architetto",
    permissions: JSON.stringify(architectPerms()),
    isSystem: true,
    sortOrder: 6,
  },
];

async function main() {
  console.log("Seeding roles...");

  for (const role of SYSTEM_ROLES) {
    const existing = await prisma.role.findUnique({ where: { name: role.name } });
    if (existing) {
      // Update permissions but keep isSystem
      await prisma.role.update({
        where: { name: role.name },
        data: { label: role.label, permissions: role.permissions, sortOrder: role.sortOrder },
      });
      console.log(`  Updated role: ${role.name}`);
    } else {
      await prisma.role.create({ data: role });
      console.log(`  Created role: ${role.name}`);
    }
  }

  // Migrate existing users: set roleId based on current role string
  const roles = await prisma.role.findMany();
  const roleMap = new Map(roles.map((r) => [r.name, r.id]));

  const usersWithoutRoleId = await prisma.adminUser.findMany({
    where: { roleId: null },
  });

  for (const user of usersWithoutRoleId) {
    const roleId = roleMap.get(user.role);
    if (roleId) {
      await prisma.adminUser.update({
        where: { id: user.id },
        data: { roleId },
      });
      console.log(`  Assigned role "${user.role}" to user ${user.email}`);
    } else {
      // Fallback: assign editor role
      const editorId = roleMap.get("editor");
      if (editorId) {
        await prisma.adminUser.update({
          where: { id: user.id },
          data: { roleId: editorId, role: "editor" },
        });
        console.log(`  Assigned fallback "editor" role to user ${user.email} (was: ${user.role})`);
      }
    }
  }

  console.log("Done seeding roles!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
