import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import {
  Users, User, Search, Save, Lock, Loader2, ChevronDown, Check, X,
  AlertCircle
} from "lucide-react";
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

  // Fetch groups and modules config
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
      // Single employee selected: load their exact permissions
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
      // Multiple employees selected: union / first employee baseline
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
      return {
        ...prev,
        [modId]: {
          enabled: nextEnabled,
          read: nextEnabled,
          write: false,
          update: false,
          delete: false,
        },
      };
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
          updated[mod.id] = {
            enabled: isEn,
            read: isEn,
            write: isEn,
            update: isEn,
            delete: isEn,
          };
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

  if (loadingConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 bg-white" style={{ height: "calc(92vh - 160px)" }}>
        <Loader2 className="w-9 h-9 animate-spin text-blue-600" />
        <span className="text-base text-gray-600 font-medium">Loading Permissions...</span>
      </div>
    );
  }

  const allFilteredAreSelected =
    filteredEmployees.length > 0 &&
    filteredEmployees.every((e) => selectedUserIds.includes(e.userId));

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-white text-gray-800">
      {/* Top Filter Selection Panel */}
      <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between flex-wrap gap-4 bg-white">
        <div className="flex items-center gap-5 flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Role:</label>
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setSelectedUserIds([]);
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="User">User / Employee</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-2">
            <label className="text-sm font-semibold text-gray-700">Dept:</label>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedUserIds([]);
              }}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm bg-white text-gray-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Select Employees Dropdown (Searchable Multi-select) */}
          <div className="relative" ref={dropdownRef}>
            <div className="flex items-center gap-2">
              <label className="text-sm font-semibold text-gray-700">Employees:</label>
              <button
                type="button"
                onClick={() => setIsEmployeeDropdownOpen(!isEmployeeDropdownOpen)}
                className="border border-gray-300 rounded-md px-3.5 py-1.5 text-sm bg-white text-gray-800 outline-none hover:border-gray-400 flex items-center justify-between gap-3 min-w-[240px] text-left cursor-pointer"
              >
                <span className="truncate font-medium">
                  {selectedUserIds.length === 0
                    ? `All (${filteredEmployees.length} matching)`
                    : `${selectedUserIds.length} employee${selectedUserIds.length > 1 ? "s" : ""} selected`}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500 flex-shrink-0" />
              </button>
            </div>

            {/* Dropdown Menu */}
            {isEmployeeDropdownOpen && (
              <div className="absolute left-[85px] top-full mt-1.5 w-80 bg-white border border-gray-200 rounded-lg shadow-xl z-50 p-2.5 space-y-2">
                {/* Search Box */}
                <div className="relative">
                  <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search by name or ID..."
                    value={employeeSearchInput}
                    onChange={(e) => setEmployeeSearchInput(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md outline-none focus:border-blue-500"
                    autoFocus
                  />
                </div>

                {/* Quick Selection Actions */}
                <div className="flex items-center justify-between pt-1 border-b border-gray-100 pb-1.5 text-xs">
                  <button
                    type="button"
                    onClick={handleSelectAllFiltered}
                    className="text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    {allFilteredAreSelected ? "Deselect All" : "Select All Filtered"}
                  </button>
                  {selectedUserIds.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearSelection}
                      className="text-gray-500 hover:text-red-600 font-medium cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  )}
                </div>

                {/* Employee List */}
                <div className="max-h-60 overflow-y-auto space-y-1">
                  {dropdownEmployees.map((emp) => {
                    const isSelected = selectedUserIds.includes(emp.userId);
                    const isAdmin = emp.role === "Admin" || emp.department === "Admin";

                    return (
                      <div
                        key={emp._id || emp.id}
                        onClick={() => toggleSelectUser(emp.userId)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-md text-sm cursor-pointer hover:bg-gray-50 transition-colors ${
                          isSelected ? "bg-blue-50 text-blue-700 font-medium" : "text-gray-700"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 truncate">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {}}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 cursor-pointer pointer-events-none"
                          />
                          <span className="truncate">
                            {emp.name} <span className="text-gray-400 text-xs">({emp.userId})</span>
                          </span>
                        </div>
                        {isAdmin && (
                          <span className="text-xs text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded font-medium">
                            Admin
                          </span>
                        )}
                      </div>
                    );
                  })}
                  {dropdownEmployees.length === 0 && (
                    <p className="text-center text-sm text-gray-400 py-3">No matching employees</p>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Discrepancy Indicator */}
          {hasAnyDiscrepancy && (
            <div className="flex items-center gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-md">
              <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0" />
              <span>Selected users have differing permissions. Saving will standardize them.</span>
            </div>
          )}

          {/* Protected Admin Warning */}
          {containsProtectedAdmin && (
            <div className="flex items-center gap-2 text-xs font-semibold text-red-800 bg-red-50 border border-red-200 px-3 py-1.5 rounded-md">
              <Lock className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>Admin account selected (Locked from non-admin editing)</span>
            </div>
          )}
        </div>

        {/* Save Button */}
        <button
          type="button"
          onClick={handleSaveMatrix}
          disabled={saving || containsProtectedAdmin}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-semibold text-sm px-5 py-2 rounded-md shadow-sm flex items-center gap-2 transition-colors cursor-pointer"
        >
          {saving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" /> Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4" /> Save Changes
            </>
          )}
        </button>
      </div>

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(92vh - 160px)" }}>
        {/* Left Side: Modules Navigation */}
        <div className="w-56 border-r border-gray-200 flex flex-col p-3.5 gap-1 overflow-y-auto h-full bg-white flex-shrink-0">
          <p className="text-xs font-bold uppercase tracking-wider text-gray-400 px-2.5 mb-2">
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
                className={`flex items-center justify-between px-3 py-2.5 rounded-md text-sm transition-colors text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : "text-gray-700 hover:bg-gray-50 font-medium"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full ${isActive ? "bg-blue-100 text-blue-800" : "text-gray-400 bg-gray-100"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Permission Cards Grid */}
        <div className="flex-1 p-6 overflow-y-auto min-h-0 space-y-7 h-[73vh] bg-gray-50/40">
          {groups.filter((g) => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
            const groupMods = modules.filter((mod) => mod.group === g.id);
            if (groupMods.length === 0) return null;

            return (
              <div key={g.id} className="bg-white border border-gray-200 rounded-lg p-5 space-y-4 shadow-sm">
                {/* Header for group */}
                <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-base font-bold text-gray-900">{g.label}</h3>
                    <span className="text-xs text-gray-500 font-medium">({groupMods.length} modules)</span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      disabled={containsProtectedAdmin}
                      onClick={() => handleBulkToggleGroup(g.id, "enable")}
                      className="text-sm font-semibold text-blue-600 hover:text-blue-800 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Enable All
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      type="button"
                      disabled={containsProtectedAdmin}
                      onClick={() => handleBulkToggleGroup(g.id, "disable")}
                      className="text-sm font-semibold text-gray-500 hover:text-gray-700 hover:underline cursor-pointer disabled:opacity-40"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {groupMods.map((mod) => {
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
                        className={`border rounded-lg p-4 bg-white flex flex-col justify-between transition-all ${
                          mState.enabled ? "border-gray-300 shadow-sm" : "border-gray-200 bg-gray-50/40"
                        }`}
                      >
                        {/* Title and Module Enable Switch */}
                        <div className="flex items-start justify-between gap-3 pb-3 border-b border-gray-100">
                          <div className="flex flex-col min-w-0">
                            <span className="text-sm font-bold text-gray-900 truncate" title={mod.label}>
                              {mod.label}
                            </span>
                            <span className="text-xs text-gray-500 truncate mt-0.5" title={mod.desc}>
                              {mod.desc || mod.label}
                            </span>
                          </div>

                          <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                            <input
                              type="checkbox"
                              checked={mState.enabled}
                              disabled={containsProtectedAdmin}
                              onChange={() => toggleModuleEnabled(mod.id)}
                              className="sr-only peer"
                            />
                            <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                          </label>
                        </div>

                        {/* Four Action Toggles: Read, Write, Update, Delete with comfortable readable text */}
                        <div
                          className={`grid grid-cols-4 gap-1.5 pt-3 text-center transition-opacity ${
                            mState.enabled && !containsProtectedAdmin
                              ? "opacity-100"
                              : "opacity-30 pointer-events-none"
                          }`}
                        >
                          {/* Read */}
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.id, "read")}
                            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                              mState.read
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                            } ${modDiscrepancy?.read ? "ring-2 ring-amber-400" : ""}`}
                          >
                            Read
                          </button>

                          {/* Write */}
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.id, "write")}
                            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                              mState.write
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                            } ${modDiscrepancy?.write ? "ring-2 ring-amber-400" : ""}`}
                          >
                            Write
                          </button>

                          {/* Update */}
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.id, "update")}
                            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                              mState.update
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                            } ${modDiscrepancy?.update ? "ring-2 ring-amber-400" : ""}`}
                          >
                            Update
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={() => togglePermission(mod.id, "delete")}
                            className={`py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer border ${
                              mState.delete
                                ? "bg-emerald-50 text-emerald-800 border-emerald-300"
                                : "bg-white text-gray-400 border-gray-200 hover:border-gray-300"
                            } ${modDiscrepancy?.delete ? "ring-2 ring-amber-400" : ""}`}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default RoleAccessSection;
