import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import {
  Settings, Plus, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, AlertTriangle, Save, RotateCcw, Shield, Users, User,
  GripVertical, Info, CheckCircle, PhoneCall, UserCheck, Search, Tag,
  Edit2, Trash2, Check, Tags, HelpCircle, Columns, Eye, EyeOff, Clock,
  Wrench, Package, Mail, Calendar, Briefcase, Lock, ShieldCheck, ArrowLeft,
  Phone, Image as ImageIcon, IndianRupee, Activity, UserPlus, Loader2,
  MapPin, RefreshCw
} from "lucide-react";
import {
  API_URL, DEFAULT_DEPTS, TYPE_BADGE_COLORS, TYPE_COLORS, LEVEL_COLORS,
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS
} from "./masterConstants";

const RoleAccessSection = ({ employees, setEmployees }) => {
  const { toast } = useNotification();
  const [selectedDepartment, setSelectedDepartment] = useState("All");
  const [selectedUser, setSelectedUser] = useState("All");
  const [activeGroup, setActiveGroup] = useState("all");
  const [matrix, setMatrix] = useState({});
  const [saving, setSaving] = useState(false);

  const [groups, setGroups] = useState([]);
  const [modules, setModules] = useState([]);
  const [loadingConfig, setLoadingConfig] = useState(true);

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

  // Filter employees matching selected department
  const filteredEmployees = useMemo(() => {
    if (selectedDepartment === "All") return employees || [];
    return (employees || []).filter((emp) => emp.department === selectedDepartment);
  }, [employees, selectedDepartment]);

  // Find target employee for editing permissions
  const targetEmployee = useMemo(() => {
    if (selectedUser === "All") return null;
    return (employees || []).find((emp) => emp.userId === selectedUser);
  }, [employees, selectedUser]);

  // Load/initialize matrix permissions object when selection changes
  useEffect(() => {
    if (modules.length === 0) return;

    const initialMatrix = {};
    
    // Default initial permissions for all modules
    modules.forEach((mod) => {
      initialMatrix[mod.id] = { enabled: false, read: false, write: false, delete: false };
    });

    if (targetEmployee) {
      // If a specific employee is selected, load their permissions
      const userPerms = targetEmployee.permissions || {};
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const hasAnyAccess = userPerms[mod.id].read || userPerms[mod.id].write || userPerms[mod.id].delete;
          initialMatrix[mod.id] = {
            enabled: userPerms[mod.id].enabled ?? hasAnyAccess,
            read: userPerms[mod.id].read ?? true,
            write: userPerms[mod.id].write ?? false,
            delete: userPerms[mod.id].delete ?? false,
          };
        }
      });
    } else if (filteredEmployees.length > 0) {
      // If "All" is selected, average the permissions from the first matching employee
      const firstEmp = filteredEmployees[0];
      const userPerms = firstEmp.permissions || {};
      modules.forEach((mod) => {
        if (userPerms[mod.id]) {
          const hasAnyAccess = userPerms[mod.id].read || userPerms[mod.id].write || userPerms[mod.id].delete;
          initialMatrix[mod.id] = {
            enabled: userPerms[mod.id].enabled ?? hasAnyAccess,
            read: userPerms[mod.id].read ?? true,
            write: userPerms[mod.id].write ?? false,
            delete: userPerms[mod.id].delete ?? false,
          };
        }
      });
    }
    setMatrix(initialMatrix);
  }, [selectedUser, selectedDepartment, targetEmployee, filteredEmployees, modules]);

  // Handle local permission toggle
  const togglePermission = (modId, type) => {
    setMatrix((prev) => {
      const current = prev[modId] || { enabled: false, read: false, write: false, delete: false };
      return {
        ...prev,
        [modId]: {
          ...current,
          [type]: !current[type],
        },
      };
    });
  };

  // Toggle entire module enabled/disabled state
  const toggleModuleEnabled = (modId) => {
    setMatrix((prev) => {
      const current = prev[modId] || { enabled: false, read: false, write: false, delete: false };
      const nextEnabled = !current.enabled;
      return {
        ...prev,
        [modId]: {
          enabled: nextEnabled,
          read: nextEnabled, // Enable read access by default when module is enabled
          write: false,
          delete: false,
        },
      };
    });
  };

  // Bulk enable/disable all modules in a specific group
  const handleBulkToggleGroup = (groupId, action) => {
    setMatrix((prev) => {
      const updated = { ...prev };
      modules.forEach((mod) => {
        if (mod.group === groupId) {
          updated[mod.id] = {
            enabled: action === "enable",
            read: action === "enable",
            write: action === "enable",
            delete: action === "enable",
          };
        }
      });
      return updated;
    });
  };

  // Save changes to backend
  const handleSaveMatrix = async () => {
    setSaving(true);
    try {
      const targets = targetEmployee ? [targetEmployee] : filteredEmployees;
      if (targets.length === 0) {
        toast("No target employees selected", "warning");
        setSaving(false);
        return;
      }

      // Loop and perform put requests for each target employee
      await Promise.all(
        targets.map((emp) =>
          axios.put(`${API_URL}/auth/employees/${emp._id || emp.id}`, {
            permissions: matrix,
          })
        )
      );

      // Refresh employee list from database to keep frontend in sync
      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees(empRes.data);

      toast("Permission Matrix saved successfully");
    } catch (err) {
      console.error(err);
      toast("Failed to save matrix config", "error");
    } finally {
      setSaving(false);
    }
  };

  // Helper to count active modules count
  const activeCount = useMemo(() => {
    let count = 0;
    modules.forEach((mod) => {
      const mState = matrix[mod.id] || {};
      if (mState.read || mState.write || mState.delete) {
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
      <div className="flex items-center justify-between bg-white border-b border-slate-300 p-[1.2vw] shadow-sm flex-wrap gap-[1vw]">
        <div className="flex items-center gap-[1.5vw] flex-wrap">
          <div className="flex items-center gap-[0.5vw]">
            <span className="text-[0.8vw] font-bold text-slate-700">Select Department:</span>
            <select
              value={selectedDepartment}
              onChange={(e) => {
                setSelectedDepartment(e.target.value);
                setSelectedUser("All");
              }}
              className="border border-slate-400 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All Departments</option>
              {uniqueDepartments.map((d, i) => (
                <option key={i} value={d}>{d}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-[0.5vw]">
            <span className="text-[0.8vw] font-bold text-slate-700">Apply To:</span>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="border border-slate-400 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-semibold bg-white text-slate-800 outline-none focus:border-blue-500"
            >
              <option value="All">All {selectedDepartment === "All" ? "Employees" : selectedDepartment}</option>
              {filteredEmployees.map((emp) => (
                <option key={emp._id || emp.id} value={emp.userId}>
                  {emp.name} ({emp.userId})
                </option>
              ))}
            </select>
          </div>

          <div className="bg-blue-50/50 border border-blue-200 rounded-[0.4vw] px-[0.8vw] py-[0.4vw] text-[0.8vw] font-bold text-blue-800">
            Access Status: <span className="text-blue-600 font-extrabold">{activeCount} of {modules.length} Active</span>
          </div>
        </div>

        <button
          type="button"
          onClick={handleSaveMatrix}
          disabled={saving}
          className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold px-[1.5vw] py-[0.5vw] rounded-[0.4vw] text-[0.85vw] shadow-md shadow-blue-500/10 cursor-pointer flex items-center gap-[0.4vw] transition-all"
        >
          {saving ? "Saving Matrix..." : "Save Matrix"}
        </button>
      </div>

      {/* Main Content Pane Split */}
      <div className="flex flex-1 min-h-0 overflow-hidden" style={{ height: "calc(92vh - 160px)" }}>
        {/* Left Side: Modules Navigation */}
        <div className="w-[15vw] bg-white border-r border-slate-300 flex flex-col p-[0.8vw] gap-[0.3vw] overflow-y-auto h-full">
          <p className="text-[0.7vw] font-bold uppercase tracking-wider text-slate-400 px-[0.5vw] mb-[0.4vw]">
            Modules Navigation
          </p>
          {groups.map((g) => {
            const isActive = activeGroup === g.id;
            const count = modules.filter((m) => g.id === "all" || m.group === g.id).length;

            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setActiveGroup(g.id)}
                className={`flex items-center justify-between px-[0.8vw] py-[0.6vw] rounded-[0.4vw] text-[0.8vw] font-bold transition-all text-left cursor-pointer ${
                  isActive
                    ? "bg-blue-50 text-blue-600 border-l-[3px] border-blue-600"
                    : "text-slate-800 hover:bg-slate-50"
                }`}
              >
                <span>{g.label}</span>
                <span className={`text-[0.68vw] px-[0.4vw] py-[0.1vw] rounded font-semibold ${
                  isActive ? "bg-blue-100 text-blue-800" : "bg-slate-100 text-slate-700"
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Side: Permission Cards Grid */}
        <div className="flex-1 p-[1.2vw] overflow-y-auto min-h-0 space-y-[1.5vw] h-[73vh]">
          {groups.filter(g => g.id !== "all" && (activeGroup === "all" || activeGroup === g.id)).map((g) => {
            const groupMods = modules.filter((mod) => mod.group === g.id);
            if (groupMods.length === 0) return null;

            return (
              <div key={g.id} className="bg-white border border-slate-300 rounded-[0.6vw] p-[1vw] space-y-[1vw] shadow-sm">
                {/* Header for group */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-[0.5vw]">
                  <div className="flex items-center gap-[0.5vw]">
                    <span className="w-[0.3vw] h-[1.2vw] bg-blue-600 rounded-full" />
                    <h3 className="text-[0.9vw] font-bold text-slate-900">{g.label}</h3>
                    <span className="text-[0.7vw] font-semibold text-slate-700 bg-slate-100 px-[0.4vw] py-[0.1vw] rounded">
                      {groupMods.length} modules
                    </span>
                  </div>

                  <div className="flex items-center gap-[0.5vw]">
                    <button
                      type="button"
                      onClick={() => handleBulkToggleGroup(g.id, "enable")}
                      className="text-[0.72vw] font-bold text-blue-600 hover:bg-blue-50 px-[0.6vw] py-[0.2vw] rounded cursor-pointer border border-blue-200 transition-all"
                    >
                      Enable All
                    </button>
                    <button
                      type="button"
                      onClick={() => handleBulkToggleGroup(g.id, "disable")}
                      className="text-[0.72vw] font-bold text-slate-900 hover:bg-slate-50 px-[0.6vw] py-[0.2vw] rounded cursor-pointer border border-slate-300 transition-all"
                    >
                      Disable All
                    </button>
                  </div>
                </div>

                {/* Modules Grid */}
                <div className="grid grid-cols-3 gap-[1vw]">
                  {groupMods.map((mod) => {
                    const mState = matrix[mod.id] || { enabled: false, read: false, write: false, delete: false };

                    return (
                      <div
                        key={mod.id}
                        className="border border-slate-300 rounded-[0.5vw] p-[0.8vw] hover:shadow-md transition-all flex flex-col justify-between h-[7.2vw] bg-white"
                      >
                        <div className="flex items-center justify-between">
                          <h4 className="text-[0.82vw] font-bold text-slate-900 truncate max-w-[70%]" title={mod.label}>
                            {mod.label}
                          </h4>
                          <button
                            type="button"
                            onClick={() => toggleModuleEnabled(mod.id)}
                            className={`relative inline-flex h-[1vw] w-[1.8vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                              mState.enabled ? "bg-blue-600" : "bg-slate-300"
                            }`}
                          >
                            <span
                              className={`inline-block h-[0.6vw] w-[0.6vw] transform rounded-full bg-white transition-transform ${
                                mState.enabled ? "translate-x-[1vw]" : "translate-x-[0.2vw]"
                              }`}
                            />
                          </button>
                        </div>

                        {/* Three Toggle Controls */}
                        <div className={`grid grid-cols-3 gap-[0.3vw] bg-slate-50 p-[0.4vw] rounded-[0.4vw] border border-slate-200 mt-[0.5vw] transition-all duration-300 ${
                          mState.enabled ? "opacity-100" : "opacity-40 pointer-events-none"
                        }`}>
                          {/* Read Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Read</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "read")}
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.read ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.read ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
                                }`}
                              />
                            </button>
                          </div>

                          {/* Write Toggle */}
                          <div className="flex flex-col items-center gap-[0.1vw]">
                            <span className="text-[0.65vw] font-bold text-slate-700">Write</span>
                            <button
                              type="button"
                              onClick={() => togglePermission(mod.id, "write")}
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.write ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.write ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
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
                              className={`relative inline-flex h-[1.1vw] w-[2vw] items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
                                mState.delete ? "bg-emerald-500" : "bg-slate-300"
                              }`}
                            >
                              <span
                                className={`inline-block h-[0.7vw] w-[0.7vw] transform rounded-full bg-white transition-transform ${
                                  mState.delete ? "translate-x-[1.1vw]" : "translate-x-[0.2vw]"
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

// ─────────────────────────────────────────────────────────────────────────────
// Main SystemSettingsPage
// ─────────────────────────────────────────────────────────────────────────────

export default RoleAccessSection;
