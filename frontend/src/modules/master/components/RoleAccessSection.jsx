import React, { useState, useEffect, useMemo, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import CustomDropdown from "../../../components/CustomDropdown";
import {
  Users, User, Search, Save, Lock, Loader2, ChevronDown, Check, X,
  AlertCircle
} from "lucide-react";
import { Icon } from "@iconify/react";
import { API_URL } from "./masterConstants";

const RoleAccessSection = ({ employees = [], setEmployees }) => {
  const [searchParams] = useSearchParams();
  const { toast } = useNotification();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  // Multi-select state for employees (Array of userIds)
  const [selectedUserIds, setSelectedUserIds] = useState(() => {
    const targetUserId = searchParams.get("userId");
    return targetUserId ? [targetUserId] : [];
  });

  const [activeGroup, setActiveGroup] = useState("all");
  const [accessMode, setAccessMode] = useState("custom"); // "preset" | "custom"
  const [matrix, setMatrix] = useState({});
  const [saving, setSaving] = useState(false);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);

  // Confirmation Modal state
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    type: null, // "preset" | "custom"
    presetType: null, // "Admin" | "Supervisor" | "User"
    title: "",
    subtitle: "",
    targets: [],
  });

  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Identify logged in user
  const currentLoggedInUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const isCurrentRequesterAdmin = currentLoggedInUser?.role === "Admin" || currentLoggedInUser?.department === "Admin";

  // Check if current user can edit role access
  const canEditRoleAccess = useMemo(() => {
    if (isCurrentRequesterAdmin) return true;
    const roleAccessPerm = currentLoggedInUser?.permissions?.roleAccess;
    return !!(roleAccessPerm?.enabled && (roleAccessPerm?.write || roleAccessPerm?.update));
  }, [currentLoggedInUser, isCurrentRequesterAdmin]);

  // Sync selected employee from URL parameter if navigated from Employee Management
  useEffect(() => {
    const targetUserId = searchParams.get("userId");
    if (targetUserId) {
      setSelectedUserIds([targetUserId]);
      setAccessMode("custom");

      // Check if employee is in current list; if not, fetch directly to avoid stale cache
      if (setEmployees && (!employees || !employees.some(e => e.userId === targetUserId))) {
        axios.get(`${API_URL}/auth/employees`).then((res) => {
          if (Array.isArray(res.data)) {
            setEmployees(res.data);
            sessionStorage.setItem("all_employees", JSON.stringify(res.data));
            localStorage.setItem("all_employees", JSON.stringify(res.data));
          }
        }).catch(() => {});
      }
    }
  }, [searchParams, employees, setEmployees]);
  useEffect(() => {
    axios
      .get(`${API_URL}/master/modules`)
      .then((res) => {
        setGroups(res.data.groups || []);
        setModules(res.data.modules || []);
      })
      .catch((err) => {
        console.error("Failed to load module definitions:", err);
        toast("Failed to load permission definitions", "error");
      })
      .finally(() => {
        setLoadingConfig(false);
      });

    // Hydrate pictures if not present on employees
    if (setEmployees) {
      axios
        .get(`${API_URL}/auth/employee-pictures`)
        .then((picRes) => {
          if (Array.isArray(picRes.data) && picRes.data.length > 0) {
            setEmployees((prev) =>
              prev.map((e) => {
                const found = picRes.data.find(
                  (p) => (p._id && p._id === e._id) || (p.userId && p.userId === e.userId)
                );
                return found && found.profilePicture
                  ? { ...e, profilePicture: found.profilePicture }
                  : e;
              })
            );
          }
        })
        .catch(() => {});
    }
  }, []);

  // Unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    (employees || []).forEach((emp) => {
      if (emp?.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filtered employees list based on department and role
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (!emp) return false;
      const matchDept = selectedDepartment === "All" || emp.department === selectedDepartment;
      const matchRole = selectedRoleFilter === "All" || emp.role === selectedRoleFilter;
      return matchDept && matchRole;
    });
  }, [employees, selectedDepartment, selectedRoleFilter]);

  // Selected employee objects
  const selectedEmployeesList = useMemo(() => {
    if (selectedUserIds.length === 0) return [];
    return (employees || []).filter((emp) => selectedUserIds.includes(emp.userId));
  }, [employees, selectedUserIds]);

  const hasSelectedEmployee = selectedEmployeesList.length > 0;

  // Check if any selected employee is an Admin while requester is not
  const containsProtectedAdmin = useMemo(() => {
    if (isCurrentRequesterAdmin) return false;
    return selectedEmployeesList.some((emp) => emp.role === "Admin" || emp.department === "Admin");
  }, [selectedEmployeesList, isCurrentRequesterAdmin]);

  // Discrepancy analysis when multiple employees are selected
  const discrepancies = useMemo(() => {
    if (selectedEmployeesList.length <= 1) return {};

    const diffMap = {};
    modules.forEach((mod) => {
      const keys = ["enabled", "read", "write", "update", "delete"];
      const modDiff = {};

      keys.forEach((key) => {
        const firstVal = !!selectedEmployeesList[0]?.permissions?.[mod.id]?.[key];
        const isMixed = selectedEmployeesList.some(
          (emp) => !!emp?.permissions?.[mod.id]?.[key] !== firstVal
        );
        if (isMixed) {
          modDiff[key] = true;
        }
      });

      if (Object.keys(modDiff).length > 0) {
        diffMap[mod.id] = modDiff;
      }
    });

    return diffMap;
  }, [selectedEmployeesList, modules]);

  const hasAnyDiscrepancy = Object.keys(discrepancies).length > 0;

  // Initialize permission matrix whenever selected employees change
  useEffect(() => {
    if (modules.length === 0) return;

    const initialMatrix = {};

    modules.forEach((mod) => {
      initialMatrix[mod.id] = {
        enabled: false,
        read: false,
        write: false,
        update: false,
        delete: false,
      };
    });

    if (selectedEmployeesList.length === 1) {
      const userPerms = selectedEmployeesList[0].permissions || {};
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const p = userPerms[mod.id];
          const hasAny = p.read || p.write || p.update || p.delete;
          initialMatrix[mod.id] = {
            enabled: p.enabled ?? hasAny,
            read: p.read ?? true,
            write: p.write ?? false,
            update: p.update ?? p.write ?? false,
            delete: p.delete ?? false,
          };
        }
      });
    } else if (selectedEmployeesList.length > 1) {
      const basePerms = selectedEmployeesList[0].permissions || {};
      modules.forEach((mod) => {
        if (basePerms[mod.id]) {
          const p = basePerms[mod.id];
          const hasAny = p.read || p.write || p.update || p.delete;
          initialMatrix[mod.id] = {
            enabled: p.enabled ?? hasAny,
            read: p.read ?? true,
            write: p.write ?? false,
            update: p.update ?? p.write ?? false,
            delete: p.delete ?? false,
          };
        }
      });
    }

    setMatrix(initialMatrix);
  }, [selectedEmployeesList, modules]);

  // Toggle permission
  const togglePermission = (modId, type) => {
    if (containsProtectedAdmin || !canEditRoleAccess) return;

    setMatrix((prev) => {
      const current = prev[modId] || {
        enabled: false,
        read: false,
        write: false,
        update: false,
        delete: false,
      };

      const nextVal = !current[type];
      const updated = { ...current, [type]: nextVal };

      // If write, update, or delete is enabled -> automatically enable read and enabled
      if (nextVal && (type === "write" || type === "update" || type === "delete")) {
        updated.enabled = true;
        updated.read = true;
      }

      // If read is disabled while write/update/delete are active -> disable write, update, and delete too
      if (!nextVal && type === "read") {
        updated.write = false;
        updated.update = false;
        updated.delete = false;
      }

      return {
        ...prev,
        [modId]: updated,
      };
    });
  };

  // Toggle whole module
  const toggleModuleEnabled = (modId) => {
    if (containsProtectedAdmin || !canEditRoleAccess) return;

    setMatrix((prev) => {
      const current = prev[modId] || {
        enabled: false,
        read: false,
        write: false,
        update: false,
        delete: false,
      };
      const nextEnabled = !current.enabled;

      const updated = {
        ...prev,
        [modId]: {
          enabled: nextEnabled,
          read: nextEnabled,
          write: false,
          update: false,
          delete: false,
        },
      };

      // Dashboard exclusivity & minimum active rule:
      // Exactly ONE dashboard must always be active.
      // - If clicking an inactive dashboard, activate it and deactivate the other.
      // - If clicking the already active dashboard, flip to the other one (never leave both disabled).
      if (modId === "dashboardAdmin") {
        const nextAdmin = !current.enabled;
        return {
          ...prev,
          dashboardAdmin: {
            enabled: nextAdmin,
            read: nextAdmin,
            write: false,
            update: false,
            delete: false,
          },
          dashboardUser: {
            enabled: !nextAdmin,
            read: !nextAdmin,
            write: false,
            update: false,
            delete: false,
          },
        };
      } else if (modId === "dashboardUser") {
        const nextUser = !current.enabled;
        return {
          ...prev,
          dashboardUser: {
            enabled: nextUser,
            read: nextUser,
            write: false,
            update: false,
            delete: false,
          },
          dashboardAdmin: {
            enabled: !nextUser,
            read: !nextUser,
            write: false,
            update: false,
            delete: false,
          },
        };
      }

      return updated;
    });
  };

  // Bulk enable/disable group
  const handleBulkToggleGroup = (groupId, action) => {
    if (containsProtectedAdmin || !canEditRoleAccess) return;
    setMatrix((prev) => {
      const updated = { ...prev };
      modules.forEach((mod) => {
        if (mod.group === groupId) {
          const isEn = action === "enable";
          // If dashboard group, enable only Admin Dashboard when enabling all to preserve exclusivity
          if (groupId === "dashboard") {
            if (action === "enable") {
              if (mod.id === "dashboardAdmin") {
                updated[mod.id] = { enabled: true, read: true, write: false, update: false, delete: false };
              } else {
                updated[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
              }
            } else {
              updated[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
            }
          } else {
            updated[mod.id] = {
              enabled: isEn,
              read: isEn,
              write: isEn,
              update: isEn,
              delete: isEn,
            };
          }
        }
      });
      return updated;
    });
  };

  // Generate Preset Matrix
  const generatePresetMatrix = (presetType) => {
    const newMatrix = {};

    modules.forEach((mod) => {
      if (presetType === "Admin") {
        // Full Admin preset:
        // Dashboard Admin, Master Page & all master modules, Customers,
        // Service Call registry, assignment, escalations & reports,
        // Service Material inward & reports,
        // Production NC registry & reports
        if (mod.id === "dashboardAdmin") {
          newMatrix[mod.id] = { enabled: true, read: true, write: false, update: false, delete: false };
        } else if (mod.id === "dashboardUser") {
          newMatrix[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
        } else {
          newMatrix[mod.id] = { enabled: true, read: true, write: true, update: true, delete: true };
        }
      } else if (presetType === "Supervisor") {
        // Supervisor preset:
        // Normal user privileges (User Dashboard, Response/workspace modules for call, material, production, troubleshoot)
        // PLUS Production NC supervisor / management pages (prodNC, prodReports)
        // PLUS Registry pages (callReg, matInward) as READ-ONLY (no add/write, update, or delete)
        if (mod.id === "dashboardUser") {
          newMatrix[mod.id] = { enabled: true, read: true, write: false, update: false, delete: false };
        } else if (mod.id === "dashboardAdmin") {
          newMatrix[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
        } else if (mod.id === "callReg" || mod.id === "matInward") {
          // Registry pages: Read only
          newMatrix[mod.id] = { enabled: true, read: true, write: false, update: false, delete: false };
        } else if (mod.subGroup === "user" || mod.group === "troubleshoot") {
          // Normal user workspace modules (read, write, update)
          newMatrix[mod.id] = { enabled: true, read: true, write: true, update: true, delete: false };
        } else if (mod.id === "prodNC" || mod.id === "prodReports") {
          // Plus Production NC supervisor pages
          newMatrix[mod.id] = { enabled: true, read: true, write: true, update: true, delete: false };
        } else {
          newMatrix[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
        }
      } else if (presetType === "User") {
        // Employee / Normal User preset:
        // Dashboard employee (User Dashboard),
        // Service Call response & report pages (serviceCallResponse, callReports),
        // Service Material response & report pages (serviceMaterialResponse, matReports),
        // Production NC response & report pages (productionMaterialResponse, prodReports),
        // Troubleshoot chat
        if (mod.id === "dashboardUser") {
          newMatrix[mod.id] = { enabled: true, read: true, write: false, update: false, delete: false };
        } else if (mod.id === "dashboardAdmin") {
          newMatrix[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
        } else if (
          mod.id === "serviceCallResponse" ||
          mod.id === "callReports" ||
          mod.id === "serviceMaterialResponse" ||
          mod.id === "matReports" ||
          mod.id === "productionMaterialResponse" ||
          mod.id === "prodReports" ||
          mod.id === "troubleshoot"
        ) {
          // User pages: work & response execution
          const isReport = mod.id.toLowerCase().includes("report");
          newMatrix[mod.id] = {
            enabled: true,
            read: true,
            write: !isReport,
            update: !isReport,
            delete: false,
          };
        } else {
          newMatrix[mod.id] = { enabled: false, read: false, write: false, update: false, delete: false };
        }
      }
    });

    return newMatrix;
  };

  // Trigger Preset Confirmation Modal
  const requestApplyPreset = (presetType) => {
    if (!hasSelectedEmployee) {
      toast("Please select at least 1 employee first.", "warning");
      return;
    }

    if (containsProtectedAdmin) {
      toast("Access Denied: One or more selected accounts are Admins and cannot be modified.", "error");
      return;
    }

    const targets = selectedEmployeesList;
    const allowedTargets = targets.filter((emp) => {
      if (!isCurrentRequesterAdmin && (emp.role === "Admin" || emp.department === "Admin")) {
        return false;
      }
      return true;
    });

    if (allowedTargets.length === 0) {
      toast("No eligible employees selected to apply preset.", "warning");
      return;
    }

    const roleName = presetType === "Admin" ? "Administrator" : presetType === "Supervisor" ? "Supervisor" : "Field / Workshop User";
    setConfirmModal({
      isOpen: true,
      type: "preset",
      presetType,
      title: `Apply ${roleName} Preset`,
      subtitle: `Are you sure you want to apply standard ${roleName} permissions to ${allowedTargets.length} selected employee(s)? This will reconfigure their module permissions.`,
      targets: allowedTargets,
    });
  };

  // Perform confirmed Preset apply
  const executeApplyPreset = async (presetType, allowedTargets) => {
    const presetMatrix = generatePresetMatrix(presetType);
    setMatrix(presetMatrix);

    setSaving(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await Promise.all(
        allowedTargets.map((emp) =>
          axios.put(
            `${API_URL}/auth/employees/${emp._id || emp.id}`,
            { permissions: presetMatrix },
            { headers }
          )
        )
      );

      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees((prev) => {
        const picMap = {};
        (prev || []).forEach((e) => {
          if (e.profilePicture) picMap[e.userId || e._id] = e.profilePicture;
        });
        const merged = empRes.data.map((e) => ({
          ...e,
          profilePicture: picMap[e.userId || e._id] || e.profilePicture || null,
        }));
        sessionStorage.setItem("all_employees", JSON.stringify(merged));
        return merged;
      });

      toast(`Applied and saved "${presetType}" preset for ${allowedTargets.length} employee(s)!`);

      // Update current loggedInUser in session if the active user was updated
      const activeUser = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
      if (activeUser && allowedTargets.some(t => t.userId === activeUser.userId || t._id === activeUser._id)) {
        const updatedActive = { ...activeUser, permissions: presetMatrix };
        sessionStorage.setItem("loggedInUser", JSON.stringify(updatedActive));
        localStorage.setItem("loggedInUser", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("auth-change"));
      }
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to apply preset", "error");
    } finally {
      setSaving(false);
      setConfirmModal({ isOpen: false, type: null, presetType: null, title: "", subtitle: "", targets: [] });
    }
  };

  // Trigger Save Matrix (Direct for 1 employee; Confirmation Modal for multiple employees)
  const handleSaveMatrix = async () => {
    if (!hasSelectedEmployee) {
      toast("Please select at least 1 employee first.", "warning");
      return;
    }

    if (containsProtectedAdmin) {
      toast("Access Denied: One or more selected accounts are Admins and cannot be modified.", "error");
      return;
    }

    const targets = selectedEmployeesList;
    const allowedTargets = targets.filter((emp) => {
      if (!isCurrentRequesterAdmin && (emp.role === "Admin" || emp.department === "Admin")) {
        return false;
      }
      return true;
    });

    if (allowedTargets.length === 0) {
      toast("No eligible employees selected to apply permissions.", "warning");
      return;
    }

    // If multiple employees are selected, show confirmation modal to prevent accidental mass-overwrite!
    if (allowedTargets.length > 1) {
      setConfirmModal({
        isOpen: true,
        type: "custom",
        presetType: null,
        title: `Save Custom Permissions for ${allowedTargets.length} Employees`,
        subtitle: `You are about to apply this customized permission matrix to ${allowedTargets.length} employees simultaneously. This will overwrite their individual module settings.`,
        targets: allowedTargets,
      });
      return;
    }

    // Single employee: Save immediately with no popup!
    await executeSaveMatrix(allowedTargets);
  };

  // Perform confirmed Custom Matrix Save
  const executeSaveMatrix = async (allowedTargets) => {
    // Rule: For a user - at least one dashboard should be enabled.
    // If no dashboard is enabled, default to User Dashboard (dashboardUser) as a fallback!
    let finalMatrix = { ...matrix };
    const hasAdminDash = !!finalMatrix.dashboardAdmin?.enabled;
    const hasUserDash = !!finalMatrix.dashboardUser?.enabled;

    if (!hasAdminDash && !hasUserDash) {
      finalMatrix = {
        ...finalMatrix,
        dashboardUser: {
          enabled: true,
          read: true,
          write: false,
          update: false,
          delete: false,
        },
      };
      setMatrix(finalMatrix);
      toast("Defaulted to User Dashboard as at least one dashboard must remain active.", "info");
    }

    setSaving(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await Promise.all(
        allowedTargets.map((emp) =>
          axios.put(
            `${API_URL}/auth/employees/${emp._id || emp.id}`,
            { permissions: finalMatrix },
            { headers }
          )
        )
      );

      const empRes = await axios.get(`${API_URL}/auth/employees`);
      // Preserve existing profilePictures when updating employee list
      setEmployees((prev) => {
        const picMap = {};
        (prev || []).forEach((e) => {
          if (e.profilePicture) picMap[e.userId || e._id] = e.profilePicture;
        });
        const merged = empRes.data.map((e) => ({
          ...e,
          profilePicture: picMap[e.userId || e._id] || e.profilePicture || null,
        }));
        sessionStorage.setItem("all_employees", JSON.stringify(merged));
        return merged;
      });

      toast(`Permissions saved successfully for ${allowedTargets.length} employee(s)!`);

      // Update current loggedInUser in session if the active user was updated
      const activeUser = JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
      if (activeUser && allowedTargets.some(t => t.userId === activeUser.userId || t._id === activeUser._id)) {
        const updatedActive = { ...activeUser, permissions: finalMatrix };
        sessionStorage.setItem("loggedInUser", JSON.stringify(updatedActive));
        localStorage.setItem("loggedInUser", JSON.stringify(updatedActive));
        window.dispatchEvent(new Event("auth-change"));
      }
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to save permissions", "error");
    } finally {
      setSaving(false);
      setConfirmModal({ isOpen: false, type: null, presetType: null, title: "", subtitle: "", targets: [] });
    }
  };

  // Multi-select helper functions
  const toggleSelectUser = (userId) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleSelectAllFiltered = () => {
    const allFilteredIds = filteredEmployees.map((e) => e.userId);
    const areAllSelected = allFilteredIds.length > 0 && allFilteredIds.every((id) => selectedUserIds.includes(id));
    if (areAllSelected) {
      setSelectedUserIds((prev) => prev.filter((id) => !allFilteredIds.includes(id)));
    } else {
      setSelectedUserIds((prev) => Array.from(new Set([...prev, ...allFilteredIds])));
    }
  };

  const handleClearSelection = () => {
    setSelectedUserIds([]);
  };

  
  const renderModuleRow = (mod) => {
    const mState = matrix[mod.id] || {
      enabled: false,
      read: false,
      write: false,
      update: false,
      delete: false,
    };
    const modDiscrepancy = discrepancies[mod.id];
    const isDashboard = mod.group === "dashboard";
    const isRoleAccessMod = mod.id === "roleAccess";

    return (
      <div
        key={mod.id}
        className={`flex items-center justify-between px-3.5 py-2 rounded-md transition-colors border ${
          mState.enabled
            ? "bg-white border-gray-200/90 hover:border-blue-200"
            : "bg-gray-50/50 border-gray-100 hover:border-gray-200"
        }`}
      >
        {/* Left: Master Toggle + Clean Module Title */}
        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3.5">
          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={mState.enabled}
              disabled={containsProtectedAdmin || !canEditRoleAccess}
              onChange={() => toggleModuleEnabled(mod.id)}
              className="sr-only peer"
            />
            <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
          </label>

          <span className={`text-xs font-semibold truncate ${mState.enabled ? "text-gray-900" : "text-gray-700"}`}>
            {mod.label}
          </span>
        </div>

        {/* Right: Granular Actions (Pill Chips) */}
        <div className="flex-shrink-0">
          {isRoleAccessMod ? (
            /* Role Access only: Read and Edit */
            <div
              className={`flex items-center gap-1.5 transition-opacity ${
                mState.enabled && !containsProtectedAdmin
                  ? "opacity-100"
                  : "opacity-30 pointer-events-none"
              }`}
            >
              <button
                type="button"
                onClick={() => togglePermission(mod.id, "read")}
                className={`px-2.5 py-1 text-sm font-semibold rounded-md transition-all cursor-pointer border ${
                  mState.read
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                } ${modDiscrepancy?.read ? "ring-2 ring-amber-400" : ""}`}
              >
                Read
              </button>

              <button
                type="button"
                onClick={() => {
                  if (containsProtectedAdmin) return;
                  setMatrix((prev) => {
                    const current = prev[mod.id] || { enabled: false, read: false, write: false, update: false, delete: false };
                    const nextEdit = !(current.write || current.update);
                    return {
                      ...prev,
                      [mod.id]: {
                        ...current,
                        enabled: nextEdit ? true : current.enabled,
                        read: nextEdit ? true : current.read,
                        write: nextEdit,
                        update: nextEdit,
                        delete: false,
                      },
                    };
                  });
                }}
                className={`px-2.5 py-1 text-sm font-semibold rounded-md transition-all cursor-pointer border ${
                  mState.write || mState.update
                    ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                    : "bg-white text-gray-700 border-gray-200 hover:border-gray-300"
                } ${modDiscrepancy?.write || modDiscrepancy?.update ? "ring-2 ring-amber-400" : ""}`}
              >
                Edit
              </button>
            </div>
          ) : (
            /* Standard Modules: Read, Write, Update, Delete */
            <div
              className={`flex items-center gap-1 transition-opacity ${
                mState.enabled && !containsProtectedAdmin
                  ? "opacity-100"
                  : "opacity-30 pointer-events-none"
              }`}
            >
              {["read", "write", "update", "delete"].map((act) => {
                const isActive = mState[act];
                const hasDisc = modDiscrepancy?.[act];
                return (
                  <button
                    key={act}
                    type="button"
                    onClick={() => togglePermission(mod.id, act)}
                    className={`px-2.5 py-1 text-sm font-semibold capitalize rounded-md transition-all cursor-pointer border ${
                      isActive
                        ? "bg-emerald-50 text-emerald-800 border-emerald-300 shadow-2xs"
                        : "bg-white text-gray-700 border-gray-200 hover:border-gray-300 hover:text-gray-600"
                    } ${hasDisc ? "ring-2 ring-amber-400" : ""}`}
                  >
                    {act}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  const allFilteredAreSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedUserIds.includes(e.userId));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-white text-gray-900">
      {/* Top Filter & Employee Selection Toolbar (Unified Single-Row) */}
      <div className="border-b border-gray-200 px-4 py-2.5 flex items-center justify-between gap-3.5 bg-white flex-shrink-0">
        {/* Left Side: Filter and Employee Selector Controls */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 flex-wrap lg:flex-nowrap">
          {/* Department Filter */}
          <div className="w-[122px] flex-shrink-0">
            <CustomDropdown
              options={[
                { value: "All", label: "All Depts" },
                ...uniqueDepartments.map((d) => ({ value: d, label: d })),
              ]}
              value={selectedDepartment}
              onChange={(val) => setSelectedDepartment(val)}
              size="sm"
              className="w-full"
            />
          </div>

          {/* Role Filter */}
          <div className="w-[108px] flex-shrink-0">
            <CustomDropdown
              options={[
                { value: "All", label: "All Roles" },
                { value: "Admin", label: "Admin" },
                { value: "Supervisor", label: "Supervisor" },
                { value: "User", label: "User" },
              ]}
              value={selectedRoleFilter}
              onChange={(val) => setSelectedRoleFilter(val)}
              size="sm"
              className="w-full"
            />
          </div>

          {/* Searchable Multi-select Employees Dropdown */}
          <div className="w-[245px] flex-shrink-0">
            <CustomDropdown
              multiple
              searchable
              clearable
              isOpen={isEmployeeDropdownOpen}
              onOpenChange={setIsEmployeeDropdownOpen}
              searchPlaceholder="Search name or ID..."
              placeholder={hasSelectedEmployee ? `${selectedUserIds.length} employee(s) selected` : `Select Employees (${filteredEmployees.length})`}
              options={filteredEmployees.map((emp) => {
                const isAdmin = emp.role === "Admin" || emp.department === "Admin";
                return {
                  value: emp.userId,
                  label: emp.name,
                  description: emp.userId,
                  image: emp.profilePicture,
                  badge: isAdmin ? "Admin" : null,
                  badgeColor: "bg-purple-50 text-purple-700 border border-purple-200",
                };
              })}
              value={selectedUserIds}
              onChange={(ids) => setSelectedUserIds(ids)}
              size="sm"
              className="w-full"
              triggerClassName={
                !hasSelectedEmployee
                  ? "border-amber-400 bg-amber-50/20 text-gray-700 ring-2 ring-amber-300/40 hover:border-amber-500 font-medium"
                  : "border-gray-300 text-gray-800 hover:border-gray-400 font-medium"
              }
            />
          </div>

          {/* Compact Inline Selected Pills (When employees are selected - No scrollbar) */}
          {selectedEmployeesList.length > 0 && (
            <div className="flex items-center gap-1.5 flex-wrap py-px">
              {selectedEmployeesList.slice(0, 2).map((emp) => (
                <span
                  key={emp.userId}
                  className="inline-flex items-center gap-1 bg-blue-50/70 border border-blue-200 text-blue-900 rounded-full pl-1 pr-1.5 py-px text-sm font-semibold flex-shrink-0"
                >
                  <span className="w-4 h-4 rounded-full overflow-hidden bg-blue-200 text-blue-700 flex items-center justify-center text-xs font-bold">
                    {emp.profilePicture ? (
                      <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      (emp.name || "U").charAt(0).toUpperCase()
                    )}
                  </span>
                  <span className="truncate max-w-[79px]">{emp.name}</span>
                  <button
                    type="button"
                    onClick={() => toggleSelectUser(emp.userId)}
                    className="text-blue-400 hover:text-rose-600 rounded-full cursor-pointer ml-px"
                    title="Remove"
                  >
                    <Icon icon="solar:close-circle-bold" className="w-3 h-3" />
                  </button>
                </span>
              ))}

              {selectedEmployeesList.length > 2 && (
                <button
                  type="button"
                  onClick={() => setIsEmployeeDropdownOpen(true)}
                  className="text-sm font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 hover:border-blue-300 border border-blue-200 px-1.5 py-px rounded-full flex-shrink-0 cursor-pointer transition-colors"
                  title="Click to view and edit all selected employees in dropdown"
                >
                  +{selectedEmployeesList.length - 2} more
                </button>
              )}

              <button
                type="button"
                onClick={handleClearSelection}
                className="text-sm text-gray-700 hover:text-rose-600 underline cursor-pointer ml-1 flex-shrink-0"
                title="Clear all selected"
              >
                Clear
              </button>
            </div>
          )}

          {/* Compact Discrepancy Indicator */}
          {hasAnyDiscrepancy && (
            <div 
              className="flex items-center gap-1 text-sm font-semibold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-1 rounded-full flex-shrink-0"
              title="Selected users currently have differing permissions. Saving will standardize them."
            >
              <Icon icon="solar:danger-triangle-bold" className="w-3 h-3 text-amber-600" />
              <span>Differing Permissions</span>
            </div>
          )}

          {/* Protected Admin Alert */}
          {containsProtectedAdmin && (
            <div 
              className="flex items-center gap-1 text-sm font-semibold text-rose-800 bg-rose-50 border border-rose-200 px-2 py-1 rounded-full flex-shrink-0"
              title="Admin account selected (Locked from non-admin editing)"
            >
              <Icon icon="solar:lock-keyhole-bold" className="w-3 h-3 text-rose-600" />
              <span>Admin Locked</span>
            </div>
          )}
        </div>

        {/* Right Side: Mode Switcher & Save Button */}
        <div className="flex items-center gap-2.5 flex-shrink-0">
          {/* Mode Switcher: Custom vs Presets */}
          <div className="flex items-center bg-slate-100 p-1 rounded-full border border-slate-200">
            <button
              type="button"
              onClick={() => setAccessMode("preset")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                accessMode === "preset"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Role Presets
            </button>
            <button
              type="button"
              onClick={() => setAccessMode("custom")}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-full transition-all cursor-pointer ${
                accessMode === "custom"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Custom Permissions
            </button>
          </div>

          {/* Save Button (for custom edits) */}
          {accessMode === "custom" && canEditRoleAccess && (
            <button
              type="button"
              onClick={handleSaveMatrix}
              disabled={!hasSelectedEmployee || saving || containsProtectedAdmin}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed text-white font-semibold text-xs px-4 py-1.5 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              {saving ? (
                <>
                  <Loader2 className="w-3 h-3 animate-spin" /> Saving...
                </>
              ) : (
                <>
                  <Icon icon="solar:diskette-bold-duotone" className="w-3.5 h-3.5" /> Save Changes
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(94vh - 140px)" }}>
        {!hasSelectedEmployee ? (
          /* ── Universal Empty / Placeholder State when 0 Employees are Selected ── */
          <div className="flex-1 flex flex-col items-center justify-center p-7 text-center bg-gray-50/40 select-none">
            <div className="w-[60px] h-[60px] rounded-full bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 mb-3.5 shadow-xs">
              <Icon icon="solar:user-hand-up-bold-duotone" className="w-9 h-9" />
            </div>
            <h3 className="text-xs font-bold text-gray-800">
              Select an Employee First
            </h3>
            <p className="text-xs text-gray-700 max-w-[403px] mt-1.5 leading-relaxed">
              Please choose at least one employee from the <span className="font-semibold text-gray-700">"Employees"</span> dropdown above to {accessMode === "preset" ? "apply role presets" : "view, configure, and customize module permissions"}.
            </p>
          </div>
        ) : accessMode === "preset" ? (
          /* ── Role Preset Mode View (Clean, Minimal, Space-Filling Grid) ── */
          <div className="flex-1 p-5.5 overflow-y-auto min-h-0 bg-slate-50/40 flex flex-col justify-center items-center">
            <div className="w-full max-w-[1094px] space-y-5">
              <div className="text-center space-y-1.5">
                <h3 className="text-base font-bold text-gray-900">Select Role Preset</h3>
                <p className="text-xs text-gray-700">
                  Click a role to immediately apply standard operational permissions to the selected employee(s).
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-[19px]">
                {/* 1. Admin Preset */}
                <div className="border border-purple-200 rounded-xl p-[19px] bg-white flex flex-col justify-between hover:border-purple-400 hover:shadow-lg transition-all min-h-[317px]">
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-600 flex-shrink-0 shadow-2xs">
                        <Icon icon="solar:shield-user-bold-duotone" className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Administrator</h4>
                        <span className="text-xs text-purple-600 font-semibold tracking-wide">Full System Access</span>
                      </div>
                    </div>
                    
                    <ul className="text-xs text-gray-600 space-y-2.5 list-disc list-inside leading-relaxed pl-1">
                      <li><span className="font-semibold text-gray-900">Dashboard Admin</span></li>
                      <li><span className="font-semibold text-gray-900">Master Page</span> (All Master data & Customer)</li>
                      <li><span className="font-semibold text-gray-900">Service Call</span> Registry & Report pages</li>
                      <li><span className="font-semibold text-gray-900">Service Material</span> Inward & Report pages</li>
                      <li><span className="font-semibold text-gray-900">Production NC</span> Registry & Report pages</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={saving || containsProtectedAdmin || !canEditRoleAccess}
                      onClick={() => requestApplyPreset("Admin")}
                      className="w-full py-2 text-sm font-bold text-white bg-purple-600 hover:bg-purple-700 disabled:bg-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed rounded-md transition-all cursor-pointer shadow-sm hover:shadow"
                      title={!canEditRoleAccess ? "Read-only access: Cannot apply role presets" : undefined}
                    >
                      Set as Admin
                    </button>
                  </div>
                </div>

                {/* 2. Supervisor Preset */}
                <div className="border border-indigo-200 rounded-xl p-[19px] bg-white flex flex-col justify-between hover:border-indigo-400 hover:shadow-lg transition-all min-h-[317px]">
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-600 flex-shrink-0 shadow-2xs">
                        <Icon icon="solar:user-check-bold-duotone" className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Supervisor</h4>
                        <span className="text-xs text-indigo-600 font-semibold tracking-wide">Operations Management</span>
                      </div>
                    </div>
                    
                    <ul className="text-xs text-gray-600 space-y-2.5 list-disc list-inside leading-relaxed pl-1">
                      <li><span className="font-semibold text-gray-900">Normal User Privileges</span> (Response & Reports)</li>
                      <li><span className="font-semibold text-gray-900">Production NC</span> Supervisor / Management page</li>
                      <li><span className="font-semibold text-gray-900">Service Call & Material</span> Workspaces</li>
                      <li><span className="font-semibold text-gray-900">Troubleshooting</span> Diagnostics Chat</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={saving || containsProtectedAdmin || !canEditRoleAccess}
                      onClick={() => requestApplyPreset("Supervisor")}
                      className="w-full py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed rounded-md transition-all cursor-pointer shadow-sm hover:shadow"
                      title={!canEditRoleAccess ? "Read-only access: Cannot apply role presets" : undefined}
                    >
                      Set as Supervisor
                    </button>
                  </div>
                </div>

                {/* 3. User Preset */}
                <div className="border border-blue-200 rounded-xl p-[19px] bg-white flex flex-col justify-between hover:border-blue-400 hover:shadow-lg transition-all min-h-[317px]">
                  <div className="space-y-3.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-9 h-9 rounded-lg bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 flex-shrink-0 shadow-2xs">
                        <Icon icon="solar:user-speak-rounded-bold-duotone" className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-gray-900">Field / Workshop User</h4>
                        <span className="text-xs text-blue-600 font-semibold tracking-wide">Technician & Workspaces</span>
                      </div>
                    </div>
                    
                    <ul className="text-xs text-gray-600 space-y-2.5 list-disc list-inside leading-relaxed pl-1">
                      <li><span className="font-semibold text-gray-900">Dashboard Employee</span></li>
                      <li><span className="font-semibold text-gray-900">Service Call</span> Response & Report pages</li>
                      <li><span className="font-semibold text-gray-900">Service Material</span> Response & Report pages</li>
                      <li><span className="font-semibold text-gray-900">Production NC</span> Response & Report pages</li>
                      <li><span className="font-semibold text-gray-900">Troubleshooting</span> Chat assistant</li>
                    </ul>
                  </div>

                  <div className="pt-4">
                    <button
                      type="button"
                      disabled={saving || containsProtectedAdmin || !canEditRoleAccess}
                      onClick={() => requestApplyPreset("User")}
                      className="w-full py-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 disabled:bg-gray-200 disabled:text-gray-700 disabled:cursor-not-allowed rounded-md transition-all cursor-pointer shadow-sm hover:shadow"
                      title={!canEditRoleAccess ? "Read-only access: Cannot apply role presets" : undefined}
                    >
                      Set as User
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Custom Permission Matrix Mode (Visible when at least 1 employee selected) ── */
          <>
            {/* Left Side: Modules Navigation */}
            <div className="w-[187px] border-r border-gray-200 flex flex-col p-2.5 gap-1 overflow-y-auto h-full bg-white flex-shrink-0">
              <p className="text-sm font-semibold uppercase tracking-wider text-gray-700 px-2 mb-1">
                Categories
              </p>
              {groups.map((g) => {
                const isActive = activeGroup === g.id;
                const count = modules.filter((m) => g.id === "all" || m.group === g.id).length;

                return (
                  <button
                    key={g.id}
                    type="button"
                    onClick={() => setActiveGroup(g.id)}
                    className={`flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs transition-colors text-left cursor-pointer ${
                      isActive
                        ? "bg-blue-50 text-blue-700 font-semibold"
                        : "text-gray-700 hover:bg-gray-50 font-normal"
                    }`}
                  >
                    <span>{g.label}</span>
                    <span className={`text-sm px-1.5 py-px rounded-full font-medium ${isActive ? "bg-blue-100 text-blue-800" : "text-gray-700 bg-gray-100"}`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Right Side: Permission Cards Grid */}
            <div className="flex-1 p-3.5 overflow-y-auto min-h-0 space-y-3.5 bg-gray-50/30">
              {loadingConfig ? (
                <div className="w-full h-full min-h-[40vh] flex flex-col items-center justify-center gap-2 bg-white/70 rounded-lg">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                  <span className="text-xs text-gray-600 font-medium">Loading Permissions...</span>
                </div>
              ) : (
                groups.filter((g) => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
                const groupMods = modules.filter((mod) => mod.group === g.id);
                if (groupMods.length === 0) return null;

                return (
                  <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-3 space-y-2.5 shadow-none">
                    {/* Header for group */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-blue-600">{g.label}</h3>
                        <span className="text-sm text-gray-700 font-normal">({groupMods.length} modules)</span>
                      </div>

                      {/* Bulk toggles (hidden for Dashboard since it's mutually exclusive) */}
                      {g.id !== "dashboard" && (
                        <div className="flex items-center gap-1.5 bg-gray-50 p-1 rounded-md border border-gray-200">
                          <button
                            type="button"
                            disabled={containsProtectedAdmin}
                            onClick={() => handleBulkToggleGroup(g.id, "enable")}
                            className="px-2 py-1 text-sm font-medium rounded-md transition-all cursor-pointer disabled:opacity-40 text-blue-700 bg-white hover:bg-blue-50 border border-blue-200 shadow-2xs hover:border-blue-300"
                          >
                            Enable All
                          </button>
                          <button
                            type="button"
                            disabled={containsProtectedAdmin}
                            onClick={() => handleBulkToggleGroup(g.id, "disable")}
                            className="px-2 py-1 text-sm font-medium rounded-md transition-all cursor-pointer disabled:opacity-40 text-slate-600 bg-white hover:bg-slate-100 hover:text-slate-800 border border-gray-200 hover:border-gray-300 shadow-2xs"
                          >
                            Disable All
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Check if group is dashboard -> side by side view without inner cards */}
                    {g.id === "dashboard" ? (
                      <div className="flex items-center gap-9 py-1 px-1">
                        {groupMods.map((mod) => {
                          const mState = matrix[mod.id] || { enabled: false };
                          return (
                            <div key={mod.id} className="flex items-center gap-2.5">
                              <span className={`text-xs font-semibold ${mState.enabled ? "text-gray-900" : "text-gray-700"}`}>
                                {mod.label}
                              </span>
                              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                                <input
                                  type="checkbox"
                                  checked={mState.enabled}
                                  disabled={containsProtectedAdmin || !canEditRoleAccess}
                                  onChange={() => toggleModuleEnabled(mod.id)}
                                  className="sr-only peer"
                                />
                                <div className="w-7 h-4 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-blue-600"></div>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      (() => {
                        const hasSubGroups = groupMods.some((m) => m.subGroup);

                        if (!hasSubGroups) {
                          return (
                            <div className="flex flex-col gap-1.5">
                              {groupMods.map(renderModuleRow)}
                            </div>
                          );
                        }

                        const adminMods = groupMods.filter((m) => m.subGroup === "admin");
                        const userMods = groupMods.filter((m) => m.subGroup === "user");

                        return (
                          <div className="space-y-3">
                            {/* Admin Section */}
                            {adminMods.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
                                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    Admin Pages ({adminMods.length})
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {adminMods.map(renderModuleRow)}
                                </div>
                              </div>
                            )}

                            {/* User Section */}
                            {userMods.length > 0 && (
                              <div className="space-y-1.5">
                                <div className="flex items-center gap-1.5 pb-1 border-b border-gray-100">
                                  <span className="text-sm font-bold text-gray-700 uppercase tracking-wider">
                                    User Pages ({userMods.length})
                                  </span>
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  {userMods.map(renderModuleRow)}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()
                    )}
                    </div>
                  );
                })
                )}
              </div>
          </>
        )}
      </div>

      {/* ── Custom Confirmation Modal ── */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-3.5">
          <div className="bg-white rounded-lg shadow-xl border border-gray-200 w-full max-w-[403px] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 border-b border-gray-100 flex items-start gap-3">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${
                  confirmModal.type === "preset" && confirmModal.presetType === "Admin"
                    ? "bg-purple-100 text-purple-700"
                    : confirmModal.type === "preset" && confirmModal.presetType === "Supervisor"
                    ? "bg-indigo-100 text-indigo-700"
                    : "bg-blue-100 text-blue-700"
                }`}
              >
                <Icon
                  icon={
                    confirmModal.type === "preset"
                      ? "solar:shield-warning-bold-duotone"
                      : "solar:users-group-two-rounded-bold-duotone"
                  }
                  className="w-5 h-5"
                />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-xs font-bold text-gray-900 leading-snug">
                  {confirmModal.title}
                </h3>
                <p className="text-xs text-gray-700 mt-1 leading-relaxed">
                  {confirmModal.subtitle}
                </p>
              </div>
            </div>

            {/* Target Employees Preview List */}
            <div className="p-4 bg-gray-50/60 max-h-[202px] overflow-y-auto space-y-1.5 border-b border-gray-100">
              <span className="text-sm font-bold text-gray-700 uppercase tracking-wider block mb-1">
                Affected Employees ({confirmModal.targets.length})
              </span>
              <div className="flex flex-wrap gap-1.5">
                {confirmModal.targets.map((emp) => (
                  <span
                    key={emp.userId || emp._id}
                    className="inline-flex items-center gap-1 bg-white border border-gray-200 px-2 py-1 rounded-md text-sm text-gray-800 shadow-2xs font-medium"
                  >
                    <Icon icon="solar:user-bold" className="w-3 h-3 text-gray-700" />
                    {emp.name || emp.username}
                    <span className="text-gray-700 text-xs">({emp.role || emp.department})</span>
                  </span>
                ))}
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-3.5 bg-white flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={saving}
                onClick={() => setConfirmModal({ isOpen: false, type: null, presetType: null, title: "", subtitle: "", targets: [] })}
                className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => {
                  if (confirmModal.type === "preset") {
                    executeApplyPreset(confirmModal.presetType, confirmModal.targets);
                  } else {
                    executeSaveMatrix(confirmModal.targets);
                  }
                }}
                className={`px-4 py-1.5 text-xs font-bold text-white rounded-md transition-colors cursor-pointer flex items-center gap-1.5 shadow-xs ${
                  confirmModal.type === "preset" && confirmModal.presetType === "Admin"
                    ? "bg-purple-600 hover:bg-purple-700"
                    : confirmModal.type === "preset" && confirmModal.presetType === "Supervisor"
                    ? "bg-indigo-600 hover:bg-indigo-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {saving ? (
                  <>
                    <Icon icon="solar:refresh-circle-bold" className="w-3.5 h-3.5 animate-spin" />
                    Applying...
                  </>
                ) : (
                  <>
                    <Icon icon="solar:check-read-bold" className="w-3.5 h-3.5" />
                    Confirm & Apply
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleAccessSection;
