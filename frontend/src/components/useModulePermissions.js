/**
 * useModulePermissions
 * 
 * Hook to retrieve effective permissions (read, write, update, delete)
 * for a specific module or set of modules for the currently logged in user.
 * 
 * Rules:
 * - Admin users have full CRUD rights (read=true, write=true, update=true, delete=true)
 * - Users without explicit permissions inherit defaults based on their role
 * - Otherwise inspects `loggedInUser.permissions[moduleId]`
 */
import { useMemo } from "react";
import { getLoggedInUser } from "./ProtectedRoute";

export function getModulePermissions(modId) {
  const user = getLoggedInUser();
  if (!user) {
    return {
      canRead: false,
      canWrite: false,
      canUpdate: false,
      canDelete: false,
      hasAccess: false,
      isAdmin: false,
    };
  }

  const isAdmin = user.role === "Admin" || user.department === "Admin";
  if (isAdmin) {
    return {
      canRead: true,
      canWrite: true,
      canUpdate: true,
      canDelete: true,
      hasAccess: true,
      isAdmin: true,
    };
  }

  // If user has explicit permissions object
  const perms = user.permissions;
  if (perms && typeof perms === "object") {
    // If specific module exists in permissions
    const p = perms[modId];
    if (p) {
      const isEnabled = !!p.enabled;
      const canRead = isEnabled && !!p.read;
      const canWrite = isEnabled && !!p.write;
      const canUpdate = isEnabled && !!p.update;
      const canDelete = isEnabled && !!p.delete;

      return {
        canRead,
        canWrite,
        canUpdate,
        canDelete,
        hasAccess: canRead || canWrite || canUpdate || canDelete,
        isAdmin: false,
      };
    }
  }

  // Fallback defaults for legacy users without matrix
  const isSupervisor = user.role === "Supervisor";
  return {
    canRead: true,
    canWrite: !isSupervisor,
    canUpdate: !isSupervisor,
    canDelete: !isSupervisor,
    hasAccess: true,
    isAdmin: false,
  };
}

export default function useModulePermissions(modId) {
  return useMemo(() => getModulePermissions(modId), [modId]);
}

