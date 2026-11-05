import React from "react";
import { Navigate, useLocation } from "react-router-dom";

/**
 * Helper to get the current authenticated user from storage
 */
export const getLoggedInUser = () => {
  try {
    const raw = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser");
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
};

/**
 * Route Guard Component
 * 
 * Props:
 * - children: Component to render if authorized
 * - requiredModules: Array of module IDs (e.g. ['prodNC', 'prodReports']) - user must have access to at least one
 * - requireManagement: If true, verifies user is Admin, Supervisor, or has incharge/write/update/delete rights
 * - fallbackToResponse: Optional path (e.g. '/productionMaterialResponse') to redirect technician if they lack management access
 * - redirectTo: Default redirect target when unauthorized (default: '/dashboard')
 */
export default function ProtectedRoute({
  children,
  requiredModules = [],
  requireManagement = false,
  fallbackToResponse = null,
  redirectTo = "/dashboard",
}) {
  const location = useLocation();
  const loggedInUser = getLoggedInUser();

  // 1. Not logged in -> redirect to login
  if (!loggedInUser) {
    return <Navigate to="/" state={{ from: location }} replace />;
  }

  // 2. Admin has unrestricted access to everything
  const isAdmin = loggedInUser.role === "Admin" || loggedInUser.department === "Admin";
  if (isAdmin) {
    return children;
  }

  const isSupervisor = loggedInUser.role === "Supervisor";

  // 3. If requiredModules are specified, check if user has access to at least one
  if (requiredModules.length > 0) {
    const hasAnyAccess = requiredModules.some(
      (modId) => loggedInUser.permissions?.[modId]?.enabled
    );

    if (!hasAnyAccess) {
      // User has zero permission for these modules -> redirect to dashboard
      return <Navigate to={redirectTo} replace />;
    }

    // 4. If management access is required (e.g. manager views for Service/Prod material or calls)
    if (requireManagement) {
      const hasManagement =
        isSupervisor ||
        requiredModules.some((modId) => {
          const p = loggedInUser.permissions?.[modId];
          return p && (p.enabled || p.read || p.write || p.update || p.delete || p.incharge || p.isAdmin);
        });

      if (!hasManagement) {
        // If technician view exists and was provided as fallback
        if (fallbackToResponse) {
          return <Navigate to={fallbackToResponse} replace />;
        }
        return <Navigate to={redirectTo} replace />;
      }
    }
  }

  return children;
}

