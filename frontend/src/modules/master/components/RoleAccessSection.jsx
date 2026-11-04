import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import {
  Shield, Users, User, Search, Save, CheckCircle, AlertTriangle,
  Lock, ShieldCheck, Check, RotateCcw, Loader2
} from "lucide-react";
import { API_URL } from "./masterConstants";

const RoleAccessSection = ({ employees, setEmployees }) => {
  const { toast } = useNotification();
  const [selectedRoleFilter, setSelectedRoleFilter] = useState("All");
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUser, setSelectedUser] = useState("All");
  const [searchEmployeeQuery, setSearchEmployeeQuery] = useState("");
  const [activeGroup, setActiveGroup] = useState("all");
  const [matrix, setMatrix] = useState({});
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

  // Identify current logged-in user to check if they are a Super Admin
  const currentLoggedInUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    } catch {
      return null;
    }
  }, []);

  const isCurrentRequesterAdmin = currentLoggedInUser?.role === "Admin" || currentLoggedInUser?.department === "Admin";

  // Fetch groups and modules config dynamically from backend
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

  // Get list of unique departments
  const uniqueDepartments = useMemo(() => {
    const set = new Set();
    (employees || []).forEach((emp) => {
      if (emp.department) set.add(emp.department);
    });
    return Array.from(set).sort();
  }, [employees]);

  // Filter employees matching selected department, role filter, and search
  const filteredEmployees = useMemo(() => {
    return (employees || []).filter((emp) => {
      if (!emp) return false;
      const matchDept = selectedDepartment === "All" || emp.department === selectedDepartment;
      const matchRole = selectedRoleFilter === "All" || emp.role === selectedRoleFilter;
      const matchSearch =
        !searchEmployeeQuery ||
        emp.name?.toLowerCase().includes(searchEmployeeQuery.toLowerCase()) ||
        emp.userId?.toLowerCase().includes(searchEmployeeQuery.toLowerCase());
      return matchDept && matchRole && matchSearch;
    });
  }, [employees, selectedDepartment, selectedRoleFilter, searchEmployeeQuery]);

  // Find target employee for editing permissions
  const targetEmployee = useMemo(() => {
    if (selectedUser === "All") return null;
    return (employees || []).find((emp) => emp.userId === selectedUser);
  }, [employees, selectedUser]);

  // Check if target employee is an Admin (protected from non-admin editing)
  const isTargetAdmin = targetEmployee ? (targetEmployee.role === "Admin" || targetEmployee.department === "Admin") : false;
  const isTargetLocked = isTargetAdmin && !isCurrentRequesterAdmin;

  // Load/initialize matrix permissions object when selection changes
  useEffect(() => {
    if (modules.length === 0) return;

    const initialMatrix = {};

    // Default initial permissions for all modules (enabled, read, write, update, delete)
    modules.forEach((mod) => {
      initialMatrix[mod.id] = {
        enabled: false,
        read: false,
        write: false,
        update: false,
        delete: false,
      };
    });

    const populateFromUserPerms = (userPerms = {}) => {
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const p = userPerms[mod.id];
          const hasAnyAccess = p.read || p.write || p.update || p.delete;
          initialMatrix[mod.id] = {
            enabled: p.enabled ?? hasAnyAccess,
            read: p.read ?? true,
            write: p.write ?? false,
            update: p.update ?? p.write ?? false,
            delete: p.delete ?? false,
          };
        }
      });
    };

    if (targetEmployee) {
      populateFromUserPerms(targetEmployee.permissions || {});
    } else if (filteredEmployees.length > 0) {
      populateFromUserPerms(filteredEmployees[0].permissions || {});
    }

    setMatrix(initialMatrix);
  }, [selectedUser, selectedDepartment, targetEmployee, filteredEmployees, modules]);

  // Handle local permission toggle
  const togglePermission = (modId, type) => {
    if (isTargetLocked) return;

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

      // If user enables write, update, or delete, ensure read & enabled are true
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

  // Toggle entire module enabled/disabled state
  const toggleModuleEnabled = (modId) => {
    if (isTargetLocked) return;

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
          read: nextEnabled, // Enable read access by default when module is enabled
          write: false,
          update: false,
          delete: false,
        },
      };
    });
  };

  // Bulk enable/disable all modules in a specific group
  const handleBulkToggleGroup = (groupId, action) => {
    if (isTargetLocked) return;
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

  // Save changes to backend
  const handleSaveMatrix = async () => {
    if (isTargetLocked) {
      toast("Access Denied: You cannot modify an Admin account's permissions.", "error");
      return;
    }

    setSaving(true);
    try {
      const targets = targetEmployee ? [targetEmployee] : filteredEmployees;
      
      // Filter out admin targets if requester is non-admin
      const allowedTargets = targets.filter((emp) => {
        if (!isCurrentRequesterAdmin && (emp.role === "Admin" || emp.department === "Admin")) {
          return false;
        }
        return true;
      });

      if (allowedTargets.length === 0) {
        toast("No eligible employees to update. (Admin accounts are protected)", "warning");
        setSaving(false);
        return;
      }

      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // Save matrix for each target employee
      await Promise.all(
        allowedTargets.map((emp) =>
          axios.put(
            `${API_URL}/auth/employees/${emp._id || emp.id}`,
            { permissions: matrix },
            { headers }
          )
        )
      );

      // Refresh employee list from database to keep frontend in sync
      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees(empRes.data);

      toast("Permissions Matrix saved successfully!");
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to save matrix config", "error");
    } finally {
      setSaving(false);
    }
  };

  // Count active modules
  const activeCount = useMemo(() => {
    let count = 0;
    modules.forEach((mod) => {
      const mState = matrix[mod.id] || {};
      if (mState.read || mState.write || mState.update || mState.delete) {
        count++;
      }
    });
    return count;
  }, [matrix, modules]);

  if (loadingConfig) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-[1vw] bg-slate-50" style={{ height: "calc(92vh - 160px)" }}>
        <Loader2 className="w-[2.5vw] h-[2.5vw] animate-spin text-blue-600" />
        <span className="text-[0.95vw] text-slate-500 font-bold">Loading Matrix Config...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden bg-slate-50">
      {/* Top Filter Selection Panel */}
      <div className="flex items-center justify-between bg-white border-b border-slate-300 p-[1vw] shadow-sm flex-wrap gap-[0.8vw]">
        <div className="flex items-center gap-[1vw] flex-wrap">
          {/* Role Filter */}
          <div className="flex items-center gap-[0.4vw]">
            <span className="text-[0.78vw] font-bold text-slate-700">Role:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => {
                setSelectedRoleFilter(e.target.value);
                setSelectedUser("All");
              }}
              className="border border-slate-300 rounded-[0.4vw] px-[0.7vw] py-[0.35vw] text-[0.78vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Supervisor">Supervisor</option>
              <option value="User">User / Employee</option>
            </select>
          </div>

          {/* Department Filter */}
          <div className="flex items-center gap-[0.4vw]">
            <span className="text-[0.78vw] font-bold text-slate-700">Dept:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedUser("All");
              }}
              className="border border-slate-300 rounded-[0.4vw] px-[0.7vw] py-[0.35vw] text-[0.78vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          {/* Specific Employee Selector */}
          <div className="flex items-center gap-[0.4vw]">
            <span className="text-[0.78vw] font-bold text-slate-700">Apply To:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className={`border rounded-[0.4vw] px-[0.7vw] py-[0.35vw] text-[0.78vw] font-semibold bg-white outline-none ${
                isTargetAdmin ? "border-purple-400 text-purple-900 font-bold" : "border-slate-300 text-slate-800 focus:border-blue-500"
              }`}
            >
              <option value="All">All ({filteredEmployees.length} Matching Employees)</option>
              {filteredEmployees.map((emp) => (
                <option key={emp._id || emp.id} value={emp.userId}>
                  {emp.name} ({emp.userId}) — {emp.role || "User"}
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50/50 border border-blue-200 rounded-[0.4vw] px-[0.7vw] py-[0.3vw] text-[0.76vw] font-bold text-blue-800">
            Active: <span className="text-blue-600 font-extrabold">{activeCount} of {modules.length}</span>
          </div>
        </div>

        {/* Save / Status Button */}
        <div className="flex items-center gap-[0.8vw]">
          {isTargetLocked && (
            <div className="flex items-center gap-[0.3vw] bg-amber-50 border border-amber-300 px-[0.8vw] py-[0.35vw] rounded-[0.4vw] text-amber-800 text-[0.75vw] font-bold">
              <Lock className="w-[0.9vw] h-[0.9vw] text-amber-600" />
              <span>Admin Profile (Protected)</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSaveMatrix}
            disabled={saving || isTargetLocked}
            className={`font-bold px-[1.4vw] py-[0.45vw] rounded-[0.4vw] text-[0.82vw] cursor-pointer flex items-center gap-[0.4vw] transition-all shadow-sm ${
              isTargetLocked
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/10"
            }`}
          >
            {saving ? (
              <>
                <Loader2 className="w-[0.9vw] h-[0.9vw] animate-spin" /> Saving...
              </>
            ) : (
              <>
                <Save className="w-[0.9vw] h-[0.9vw]" /> Save Matrix
              </>
            )}
          </button>
        </div>
      </div>

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(92vh - 160px)" }}>
        {/* Left Side: Modules Navigation */}
        <div className="w-[14vw] bg-white border-r border-slate-300 flex flex-col p-[0.7vw] gap-[0.25vw] overflow-y-auto h-full">
          <p className="text-[0.68vw] font-bold uppercase tracking-wider text-slate-400 px-[0.4vw] mb-[0.3vw]">
            Module Domains
          </p>
          {groups.map((g) => {
            const isActive = activeGroup === g.id;
            const count = modules.filter((m) => g.id === "all" || m.group === g.id).length;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`flex items-center justify-between px-[0.7vw] py-[0.55vw] rounded-[0.4vw] text-[0.78vw] font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-l-[3px] border-blue-600"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-[0.65vw] px-[0.35vw] py-[0.1vw] rounded font-semibold ${
                  isActive ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Permission Cards Grid */}
        <div className="flex-1 p-[1vw] overflow-y-auto min-h-0 space-y-[1.2vw] h-[73vh]">
          {groups.filter(g => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
            const groupMods = modules.filter((mod) => mod.group === g.id);
            if (groupMods.length === 0) return null;

            return (
              <div key={g.id} className="bg-white border border-slate-300 rounded-[0.6vw] p-[0.9vw] space-y-[0.8vw] shadow-sm">
                {/* Header for group */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-[0.4vw]">
                  <div className="flex items-center gap-[0.5vw]">
                    <span className="w-[0.3vw] h-[1.1vw] bg-blue-600 rounded-full" />
                    <h3 className="text-[0.88vw] font-bold text-slate-900">{g.label}</h3>
                    <span className="text-[0.68vw] font-semibold text-slate-600 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                      {groupMods.length} modules
                    </span>
                  </div>

                  <div className="flex items-center gap-[0.4vw]">
                    <button
                      type="button"
                      disabled={isTargetLocked}
                      onClick={() => handleBulkToggleGroup(g.id, "enable")}
                      className="text-[0.7vw] font-bold text-blue-600 hover:bg-blue-50 px-[0.5vw] py-[0.2vw] rounded cursor-pointer border border-blue-200 transition-all disabled:opacity-40"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      disabled={isTargetLocked}
                      onClick={() => handleBulkToggleGroup(g.id, "disable")}
                      className="text-[0.7vw] font-bold text-slate-700 hover:bg-slate-50 px-[0.5vw] py-[0.2vw] rounded cursor-pointer border border-slate-300 transition-all disabled:opacity-40"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-[0.9vw]">
                  {groupMods.map((mod) => {
                    const mState = matrix[mod.id] || {
                      enabled: false,
                      read: false,
                      write: false,
                      update: false,
                      delete: false,
                    };

                    return (
                      <div
                        key={mod.id}
                        className={`border rounded-[0.5vw] p-[0.75vw] hover:shadow-md transition-all flex flex-col justify-between bg-white ${
                          mState.enabled ? "border-slate-300" : "border-slate-200 bg-slate-50/50"
                        }`}
                      >
                        {/* Module Title & Master Switch */}
                        <div className="flex items-center justify-between pb-[0.4vw] border-b border-slate-100">
                          <div className="flex flex-col max-w-[75%]">
                            <h4 className="text-[0.82vw] font-bold text-slate-900 truncate" title={mod.label}>
                              {mod.label}
                            </h4>
                            <span className="text-[0.65vw] text-slate-400 truncate" title={mod.desc}>
                              {mod.desc || mod.label}
                            </span>
                          </div>

                          <button
                            type="button"
                            disabled={isTargetLocked}
                            onClick={() => toggleModuleEnabled(mod.id)}
                            className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                              mState.enabled ? "bg-blue-600" : "bg-slate-300"
                            } ${isTargetLocked ? "opacity-50 cursor-not-allowed" : ""}`}
                          >
                            <span
                              className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                mState.enabled ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Four Clean CRUD Toggle Controls: Read, Write, Update, Delete */}
                        <div className={`grid grid-cols-4 gap-[0.25vw] bg-slate-50 p-[0.4vw] rounded-[0.4vw] border border-slate-200 mt-[0.6vw] transition-all duration-200 ${
                          mState.enabled && !isTargetLocked ? "opacity-100" : "opacity-40 pointer-events-none"
                        }`}>
                          {/* Read Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Read</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "read")}
                              className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors cursor-pointer ${
                                mState.read ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                  mState.read ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Write (Create) Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Write</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "write")}
                              className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors cursor-pointer ${
                                mState.write ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                  mState.write ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Update (Edit) Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Update</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "update")}
                              className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors cursor-pointer ${
                                mState.update ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                  mState.update ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Delete Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Delete</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "delete")}
                              className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors cursor-pointer ${
                                mState.delete ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                  mState.delete ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>
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
