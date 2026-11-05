import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import {
  Users, User, Search, Save, Lock, Loader2, ChevronDown, Check, X,
  AlertCircle
} from "lucide-react";
import { Icon } from "@iconify/react";
import { API_URL } from "./masterConstants";

const RoleAccessSection = ({ employees = [], setEmployees }) => {
  const { toast } = useNotification();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");

  // Multi-select state for employees (Array of userIds)
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isEmployeeDropdownOpen, setIsEmployeeDropdownOpen] = useState(false);
  const [employeeSearchInput, setEmployeeSearchInput] = useState("");
  const dropdownRef = useRef(null);

  const [activeGroup, setActiveGroup] = useState("all");
  const [matrix, setMatrix] = useState({});
  const [saving, setSaving] = useState(false);

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

  // Close multi-select dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsEmployeeDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch groups and modules config & profile pictures for avatars
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

  // Dropdown list further filtered by employee search text
  const dropdownEmployees = useMemo(() => {
    if (!employeeSearchInput.trim()) return filteredEmployees;
    const query = employeeSearchInput.toLowerCase().trim();
    return filteredEmployees.filter((emp) =>
      emp.name?.toLowerCase().includes(query) || emp.userId?.toLowerCase().includes(query)
    );
  }, [filteredEmployees, employeeSearchInput]);

  // Selected employee objects
  const selectedEmployeesList = useMemo(() => {
    if (selectedUserIds.length === 0) return [];
    return (employees || []).filter((emp) => selectedUserIds.includes(emp.userId));
  }, [employees, selectedUserIds]);

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
    if (containsProtectedAdmin) return;

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

      if (nextVal && (type === "write" || type === "update" || type === "delete")) {
        updated.enabled = true;
        updated.read = true;
      }

      return {
        ...prev,
        [modId]: updated,
      };
    });
  };

  // Toggle whole module
  const toggleModuleEnabled = (modId) => {
    if (containsProtectedAdmin) return;

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

      // Dashboard exclusivity: Only one of Admin Dashboard OR User Dashboard can be enabled
      if (modId === "dashboardAdmin" && nextEnabled) {
        updated["dashboardUser"] = {
          enabled: false,
          read: false,
          write: false,
          update: false,
          delete: false,
        };
      } else if (modId === "dashboardUser" && nextEnabled) {
        updated["dashboardAdmin"] = {
          enabled: false,
          read: false,
          write: false,
          update: false,
          delete: false,
        };
      }

      return updated;
    });
  };

  // Bulk enable/disable group
  const handleBulkToggleGroup = (groupId, action) => {
    if (containsProtectedAdmin) return;
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

  // Save changes
  const handleSaveMatrix = async () => {
    if (containsProtectedAdmin) {
      toast("Access Denied: One or more selected accounts are Admins and cannot be modified.", "error");
      return;
    }

    const targets = selectedEmployeesList.length > 0 ? selectedEmployeesList : filteredEmployees;

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

    setSaving(true);
    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      await Promise.all(
        allowedTargets.map((emp) =>
          axios.put(
            `${API_URL}/auth/employees/${emp._id || emp.id}`,
            { permissions: matrix },
            { headers }
          )
        )
      );

      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees(empRes.data);
      sessionStorage.setItem("all_employees", JSON.stringify(empRes.data));

      toast(`Permissions saved successfully for ${allowedTargets.length} employee(s)!`);
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to save permissions", "error");
    } finally {
      setSaving(false);
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

  
  const renderModuleCard = (mod) => {
    const mState = matrix[mod.id] || {
      enabled: false,
      read: false,
      write: false,
      update: false,
      delete: false,
    };
    const modDiscrepancy = discrepancies[mod.id];

    return (
      <div
        key={mod.id}
        className={`border rounded-[0.4vw] px-[0.75vw] py-[0.55vw] bg-white flex flex-col justify-between transition-all ${
          mState.enabled ? "border-gray-300 shadow-sm" : "border-gray-200 bg-gray-50/30"
        }`}
      >
        {/* Title and Module Enable Switch */}
        <div className="flex items-center justify-between gap-[0.6vw] pb-[0.35vw] border-b border-gray-100">
          <span className="text-[0.82vw] font-semibold text-gray-900 truncate" title={mod.label}>
            {mod.label}
          </span>

          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
            <input
              type="checkbox"
              checked={mState.enabled}
              disabled={containsProtectedAdmin}
              onChange={() => toggleModuleEnabled(mod.id)}
              className="sr-only peer"
            />
            <div className="w-[2vw] h-[1.1vw] bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[0.12vw] after:left-[0.15vw] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-[0.85vw] after:w-[0.85vw] after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {/* Action Toggles: Read, Write, Update, Delete (hidden for toggle-only modules like Dashboard) */}
        {mod.group !== "dashboard" ? (
          <div
            className={`grid grid-cols-4 gap-[0.3vw] pt-[0.45vw] text-center transition-opacity ${
              mState.enabled && !containsProtectedAdmin
                ? "opacity-100"
                : "opacity-35 pointer-events-none"
            }`}
          >
            <button
              type="button"
              onClick={() => togglePermission(mod.id, "read")}
              className={`py-[0.2vw] text-[0.72vw] font-medium rounded-[0.25vw] transition-colors cursor-pointer border ${
                mState.read
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold"
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              } ${modDiscrepancy?.read ? "ring-2 ring-amber-400" : ""}`}
            >
              Read
            </button>

            <button
              type="button"
              onClick={() => togglePermission(mod.id, "write")}
              className={`py-[0.2vw] text-[0.72vw] font-medium rounded-[0.25vw] transition-colors cursor-pointer border ${
                mState.write
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold"
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              } ${modDiscrepancy?.write ? "ring-2 ring-amber-400" : ""}`}
            >
              Write
            </button>

            <button
              type="button"
              onClick={() => togglePermission(mod.id, "update")}
              className={`py-[0.2vw] text-[0.72vw] font-medium rounded-[0.25vw] transition-colors cursor-pointer border ${
                mState.update
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold"
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              } ${modDiscrepancy?.update ? "ring-2 ring-amber-400" : ""}`}
            >
              Update
            </button>

            <button
              type="button"
              onClick={() => togglePermission(mod.id, "delete")}
              className={`py-[0.2vw] text-[0.72vw] font-medium rounded-[0.25vw] transition-colors cursor-pointer border ${
                mState.delete
                  ? "bg-emerald-50 text-emerald-800 border-emerald-400 font-semibold"
                  : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
              } ${modDiscrepancy?.delete ? "ring-2 ring-amber-400" : ""}`}
            >
              Delete
            </button>
          </div>
        ) : (
          <div className="pt-[0.4vw] flex items-center justify-between text-[0.68vw] text-gray-500">
            <span className="italic">
              {mState.enabled ? "Active view for this user" : "Inactive view"}
            </span>
            <span
              className={`font-semibold px-[0.4vw] py-[0.1vw] rounded text-[0.65vw] ${
                mState.enabled
                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                  : "bg-gray-100 text-gray-400"
              }`}
            >
              {mState.enabled ? "ENABLED" : "DISABLED"}
            </span>
          </div>
        )}
      </div>
    );
  };

  const allFilteredAreSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedUserIds.includes(e.userId));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-white text-gray-900">
      {/* Top Filter Selection Panel */}
      <div className="border-b border-gray-200 px-[1vw] py-[0.55vw] flex items-center justify-between flex-wrap gap-[0.8vw] bg-white">
        <div className="flex items-center gap-[0.9vw] flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-[0.4vw]">
            <label className="text-[0.78vw] font-medium text-gray-600">Role:</label>
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
              }}
              className="border border-gray-300 rounded-[0.35vw] px-[0.65vw] py-[0.32vw] text-[0.76vw] font-normal bg-white text-gray-800 outline-none focus:border-blue-500 cursor-pointer shadow-none"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="User">User / Employee</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-[0.4vw]">
            <label className="text-[0.78vw] font-medium text-gray-600">Dept:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
              }}
              className="border border-gray-300 rounded-[0.35vw] px-[0.65vw] py-[0.32vw] text-[0.76vw] font-normal bg-white text-gray-800 outline-none focus:border-blue-500 cursor-pointer shadow-none"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Select Employees Dropdown (Searchable Multi-select) */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-[0.4vw]">
              <label className="text-[0.78vw] font-medium text-gray-600">Employees:</label>
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="border border-gray-300 rounded-[0.35vw] px-[0.75vw] py-[0.32vw] text-[0.76vw] bg-white text-gray-800 outline-none hover:border-gray-400 flex items-center justify-between gap-[0.6vw] min-w-[14vw] text-left cursor-pointer"
              >
                <span className="truncate font-medium text-gray-800">
                  {selectedUserIds.length === 0
                    ? `All (${filteredEmployees.length} matching)`
                    : `${selectedUserIds.length} employee${selectedUserIds.length > 1 ? "s" : ""} selected`}
                </span>
                <Icon icon="solar:alt-arrow-down-linear" className="w-[0.9vw] h-[0.9vw] text-gray-500 flex-shrink-0" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isEmployeeDropdownOpen && (
              <div className="absolute left-[5.5vw] top-full mt-[0.3vw] w-[20vw] bg-white border border-gray-200 rounded-[0.5vw] shadow-2xl z-50 p-[0.7vw] space-y-[0.5vw]">
                {/* Search Box */}
                <div className="relative">
                  <Icon icon="solar:magnifer-linear" className="w-[1vw] h-[1vw] text-gray-400 absolute left-[0.7vw] top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={employeeSearchInput}
                    onChange={(e) => setEmployeeSearchInput(e.target.value)}
                    className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.4vw] text-[0.85vw] font-normal border border-gray-300 rounded-[0.4vw] outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Quick Selection Actions */}
                <div className="flex items-center justify-between pt-[0.2vw] border-b border-gray-100 pb-[0.4vw] text-[0.78vw]">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-blue-600 hover:underline font-medium cursor-pointer"
                  >
                    {allFilteredAreSelected ? "Deselect All" : "Select All Filtered"}
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-gray-500 hover:text-red-600 font-normal cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Employee List */}
                <div className="max-h-[16vw] overflow-y-auto space-y-[0.3vw]">
                  {dropdownEmployees.map((emp) => {
                    const isSelected = selectedUserIds.includes(emp.userId);
                    const isAdmin = emp.role === "Admin" || emp.department === "Admin";

                    return (
                      <div
                        key={emp._id || emp.id}
                        onClick={() => toggleSelectUser(emp.userId)}
                        className={`flex items-center justify-between px-[0.6vw] py-[0.4vw] rounded-[0.35vw] text-[0.8vw] cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700 font-normal"
                        }`}
                      >
                        <div className="flex items-center gap-[0.5vw] truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-[0.9vw] h-[0.9vw] rounded border-gray-300 text-blue-600 cursor-pointer pointer-events-none"
                          />
                          <div className="w-[1.4vw] h-[1.4vw] rounded-full overflow-hidden bg-slate-100 border border-slate-200 flex-shrink-0 flex items-center justify-center text-[0.65vw] font-bold text-slate-600">
                            {emp.profilePicture ? (
                              <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (emp.name || "U").charAt(0).toUpperCase()
                            )}
                          </div>
                          <span className="truncate">
                            {emp.name} <span className="text-gray-400 text-[0.72vw]">({emp.userId})</span>
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="text-[0.65vw] text-purple-700 bg-purple-50 border border-purple-200 px-[0.35vw] py-[0.08vw] rounded font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {dropdownEmployees.length === 0 && (
                    <p className="text-center text-[0.85vw] text-gray-400 py-[0.8vw] font-normal">No matching employees</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Discrepancy Indicator */}
          {hasAnyDiscrepancy && (
            <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-normal text-amber-800 bg-amber-50 border border-amber-200 px-[0.8vw] py-[0.4vw] rounded-[0.4vw]">
              <Icon icon="solar:danger-triangle-bold-duotone" className="w-[1vw] h-[1vw] text-amber-600 flex-shrink-0" />
              <span>Differing permissions across selected users. Saving standardizes them.</span>
            </div>
          )}

          {/* Protected Admin Warning */}
          {containsProtectedAdmin && (
            <div className="flex items-center gap-[0.4vw] text-[0.8vw] font-medium text-red-800 bg-red-50 border border-red-200 px-[0.8vw] py-[0.4vw] rounded-[0.4vw]">
              <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1vw] h-[1vw] text-red-600 flex-shrink-0" />
              <span>Admin account selected (Locked from non-admin editing)</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveMatrix}
          disabled={saving || containsProtectedAdmin}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium text-[0.78vw] px-[1vw] py-[0.38vw] rounded-[0.35vw] shadow-none flex items-center gap-[0.4vw] transition-colors cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Icon icon="solar:diskette-bold-duotone" className="w-[0.95vw] h-[0.95vw]" /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Selected Employee Badges (Visible outside dropdown) */}
      {selectedEmployeesList.length > 0 && (
        <div className="bg-slate-50/80 border-b border-gray-200 px-[1vw] py-[0.35vw] flex items-center gap-[0.4vw] flex-wrap">
          <span className="text-[0.7vw] font-bold text-gray-500 uppercase tracking-wider mr-[0.2vw]">
            Selected ({selectedEmployeesList.length}):
          </span>
          <div className="flex items-center gap-[0.35vw] flex-wrap max-h-[5.5vw] overflow-y-auto">
            {selectedEmployeesList.map((emp) => (
              <div
                key={emp.userId}
                className="inline-flex items-center gap-[0.3vw] bg-white border border-blue-200 text-blue-900 rounded-full pl-[0.18vw] pr-[0.45vw] py-[0.12vw] shadow-2xs hover:border-blue-400 transition-colors"
              >
                <div className="w-[1.2vw] h-[1.2vw] rounded-full overflow-hidden bg-blue-100 flex-shrink-0 flex items-center justify-center text-[0.6vw] font-bold text-blue-700">
                  {emp.profilePicture ? (
                    <img src={emp.profilePicture} alt="" className="w-full h-full object-cover" />
                  ) : (
                    (emp.name || "U").charAt(0).toUpperCase()
                  )}
                </div>
                <span className="text-[0.72vw] font-semibold">{emp.name}</span>
                <span className="text-[0.65vw] text-gray-400">({emp.userId})</span>
                <button
                  type="button"
                  onClick={() => toggleSelectUser(emp.userId)}
                  className="text-gray-400 hover:text-red-600 rounded-full p-[0.05vw] transition-colors cursor-pointer ml-[0.1vw]"
                  title="Remove"
                >
                  <Icon icon="solar:close-circle-bold" className="w-[0.8vw] h-[0.8vw]" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-[0.68vw] text-gray-500 hover:text-red-600 underline font-medium px-[0.3vw] cursor-pointer"
            >
              Clear all
            </button>
          </div>
        </div>
      )}

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(94vh - 140px)" }}>
        {/* Left Side: Modules Navigation */}
        <div className="w-[13vw] border-r border-gray-200 flex flex-col p-[0.6vw] gap-[0.2vw] overflow-y-auto h-full bg-white flex-shrink-0">
          <p className="text-[0.68vw] font-semibold uppercase tracking-wider text-gray-400 px-[0.5vw] mb-[0.3vw]">
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
                className={`flex items-center justify-between px-[0.65vw] py-[0.45vw] rounded-[0.35vw] text-[0.78vw] transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-semibold"
                    : "text-gray-700 hover:bg-gray-50 font-normal"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-[0.66vw] px-[0.4vw] py-[0.08vw] rounded-full font-medium ${isActive ? "bg-blue-100 text-blue-800" : "text-gray-500 bg-gray-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Permission Cards Grid */}
        <div className="flex-1 p-[0.9vw] overflow-y-auto min-h-0 space-y-[0.9vw] bg-gray-50/30">
          {loadingConfig ? (
            <div className="w-full h-full min-h-[40vh] flex flex-col items-center justify-center gap-2 bg-white/70 rounded-[0.5vw]">
              <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
              <span className="text-[0.8vw] text-gray-600 font-medium">Loading Permissions...</span>
            </div>
          ) : (
            groups.filter((g) => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
            const groupMods = modules.filter((mod) => mod.group === g.id);
            if (groupMods.length === 0) return null;

            return (
              <div key={g.id} className="bg-white border border-gray-200 rounded-[0.5vw] p-[0.85vw] space-y-[0.7vw] shadow-none">
                {/* Header for group */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-[0.45vw]">
                  <div className="flex items-center gap-[0.5vw]">
                    <h3 className="text-[0.9vw] font-bold text-blue-600">{g.label}</h3>
                    <span className="text-[0.7vw] text-gray-400 font-normal">({groupMods.length} modules)</span>
                  </div>

                  <div className="flex items-center gap-[0.6vw]">
                    <button
                      type="button"
                      disabled={containsProtectedAdmin}
                      onClick={() => handleBulkToggleGroup(g.id, "enable")}
                      className="text-[0.74vw] font-medium text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Enable All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      disabled={containsProtectedAdmin}
                      onClick={() => handleBulkToggleGroup(g.id, "disable")}
                      className="text-[0.74vw] font-medium text-gray-500 hover:text-gray-700 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Check if group has subGroups (Admin vs User separation) */}
                {(() => {
                  const hasSubGroups = groupMods.some((m) => m.subGroup);

                  if (!hasSubGroups) {
                    return (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[0.6vw]">
                        {groupMods.map(renderModuleCard)}
                      </div>
                    );
                  }

                  const adminMods = groupMods.filter((m) => m.subGroup === "admin");
                  const userMods = groupMods.filter((m) => m.subGroup === "user");

                  return (
                    <div className="space-y-[0.8vw]">
                      {/* Admin Section */}
                      {adminMods.length > 0 && (
                        <div className="bg-slate-50/60 border border-slate-200/80 rounded-[0.45vw] p-[0.7vw] space-y-[0.6vw]">
                          <div className="flex items-center gap-[0.4vw] pb-[0.25vw] border-b border-slate-200/60">
                            <span className="text-[0.68vw] font-bold uppercase tracking-wider text-indigo-700 bg-indigo-50 border border-indigo-200 px-[0.45vw] py-[0.1vw] rounded">
                              Admin Pages (Management)
                            </span>
                            <span className="text-[0.66vw] text-slate-500 font-medium">
                              ({adminMods.length} management modules)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[0.6vw]">
                            {adminMods.map(renderModuleCard)}
                          </div>
                        </div>
                      )}

                      {/* User Section */}
                      {userMods.length > 0 && (
                        <div className="bg-blue-50/20 border border-blue-100 rounded-[0.45vw] p-[0.7vw] space-y-[0.6vw]">
                          <div className="flex items-center gap-[0.4vw] pb-[0.25vw] border-b border-blue-200/40">
                            <span className="text-[0.68vw] font-bold uppercase tracking-wider text-blue-700 bg-blue-50 border border-blue-200 px-[0.45vw] py-[0.1vw] rounded">
                              User Pages (Staff / Response)
                            </span>
                            <span className="text-[0.66vw] text-slate-500 font-medium">
                              ({userMods.length} workspace modules)
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[0.6vw]">
                            {userMods.map(renderModuleCard)}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleAccessSection;
