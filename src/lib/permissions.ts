import { getAuthUser } from "./auth";
import { prisma } from "./prisma";
import { NextResponse } from "next/server";

export interface AuthUserWithRole {
  id: string;
  email: string;
  name: string | null;
  role: string;
  roleId: string | null;
  roleName: string;
  roleLabel: string;
  permissions: Record<string, boolean>;
  isActive: boolean;
}

/**
 * Get the authenticated user with their role and parsed permissions.
 * Returns null if not authenticated.
 */
export async function getAuthUserWithRole(): Promise<AuthUserWithRole | null> {
  const auth = await getAuthUser();
  if (!auth) return null;

  const user = await prisma.adminUser.findUnique({
    where: { id: auth.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      roleId: true,
      isActive: true,
      roleRef: {
        select: { name: true, label: true, permissions: true },
      },
    },
  });

  if (!user || !user.isActive) return null;

  let permissions: Record<string, boolean> = {};
  let roleName = user.role;
  let roleLabel = user.role;

  if (user.roleRef) {
    roleName = user.roleRef.name;
    roleLabel = user.roleRef.label;
    try {
      permissions = JSON.parse(user.roleRef.permissions);
    } catch {
      permissions = {};
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    roleId: user.roleId,
    roleName,
    roleLabel,
    permissions,
    isActive: user.isActive,
  };
}

/**
 * Check if the given permissions object grants access to resource.action.
 * Superadmin always has access.
 */
export function hasPermission(
  permissions: Record<string, boolean>,
  roleName: string,
  resource: string,
  action: string
): boolean {
  // Superadmin bypasses all checks
  if (roleName === "superadmin") return true;
  return permissions[`${resource}.${action}`] === true;
}

/**
 * Require authentication and a specific permission.
 * Returns the authenticated user if allowed, or a NextResponse error.
 *
 * Usage in API routes:
 * ```
 * const result = await requirePermission("products", "create");
 * if (result instanceof NextResponse) return result;
 * const user = result;
 * ```
 */
export async function requirePermission(
  resource: string,
  action: string
): Promise<AuthUserWithRole | NextResponse> {
  const user = await getAuthUserWithRole();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Non autenticato" },
      { status: 401 }
    );
  }

  if (!hasPermission(user.permissions, user.roleName, resource, action)) {
    return NextResponse.json(
      { success: false, error: "Non hai i permessi per questa azione" },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Require only authentication (no specific permission check).
 * Useful for routes where any authenticated user should have access.
 */
export async function requireAuth(): Promise<AuthUserWithRole | NextResponse> {
  const user = await getAuthUserWithRole();

  if (!user) {
    return NextResponse.json(
      { success: false, error: "Non autenticato" },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Check if user is a response (error) or actual user data.
 * Type guard for use after requirePermission/requireAuth.
 */
export function isErrorResponse(
  result: AuthUserWithRole | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}
