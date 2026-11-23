import React, { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  UserCheck, 
  Layers, 
  AlertCircle, 
  CheckCircle2, 
  X, 
  RefreshCw,
  Shield,
  Check,
  ChevronDown,
  Users,
  Eye,
  UserPlus
} from "lucide-react";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DEFAULT_STAGES = [
  "SMD", "WS", "MS", "SRV-Testing", "SRV-FI", "STA-Testing", 
  "STA-FI", "MPR-CVR", "MPR-Testing", "MPR-FI", "Panel-WA", 
  "Panel-Integration", "Panel-Testing", "Panel-FI"
];

const ProductionMaster = () => {
  const { toast } = useNotification();

  // Navigation tab state: "view" (View Employee) or "assign" (Assign Employee)
  const [activeTab, setActiveTab] = useState("view");

  // Master Data State
  const [stages, setStages] = useState(DEFAULT_STAGES);
  const [mappings, setMappings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Tab Filters & Search
  const [searchTerm, setSearchTerm] = useState("");
  const [stageFilter, setStageFilter] = useState("All");

  // Assign Tab Form State
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [selectedStage, setSelectedStage] = useState("");
  const [empSearch, setEmpSearch] = useState("");
  const [empDeptFilter, setEmpDeptFilter] = useState("All");
  const [isSaving, setIsSaving] = useState(false);

  // Edit Mapping Modal
  const [editingMapping, setEditingMapping] = useState(null);
  const [editSelectedStage, setEditSelectedStage] = useState("");

  // Manage Stages Modal State
  const [stageModalOpen, setStageModalOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [editingStageIdx, setEditingStageIdx] = useState(null);
  const [editingStageVal, setEditingStageVal] = useState("");

  const currentUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [settingsRes, mappingsRes, empRes] = await Promise.all([
        axios.get(`${API_URL}/master/settings/production_master_data`).catch(() => ({ data: null })),
        axios.get(`${API_URL}/production-material/stage-mappings`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/auth/employees`).catch(() => ({ data: [] }))
      ]);

      if (settingsRes.data?.stages && Array.isArray(settingsRes.data.stages)) {
        setStages(settingsRes.data.stages);
        if (!selectedStage && settingsRes.data.stages.length > 0) {
          setSelectedStage(settingsRes.data.stages[0]);
        }
      } else if (!selectedStage && DEFAULT_STAGES.length > 0) {
        setSelectedStage(DEFAULT_STAGES[0]);
      }

      setMappings(mappingsRes.data || []);
      setEmployees(empRes.data || []);
    } catch (err) {
      console.error("Failed to load Production Master data:", err);
      toast("Error loading production master data", "error");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Unique departments for filter in Assign tab
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  // Filtered employees for the Assign Tab
  const assignableEmployees = useMemo(() => {
    return employees.filter(emp => {
      const name = (emp.name || "").toLowerCase();
      const uid = (emp.userId || emp._id || "").toLowerCase();
      const dept = (emp.department || "").toLowerCase();
      const s = empSearch.toLowerCase().trim();

      const matchesSearch = !s || name.includes(s) || uid.includes(s) || dept.includes(s);
      const matchesDept = empDeptFilter === "All" || emp.department === empDeptFilter;

      return matchesSearch && matchesDept;
    });
  }, [employees, empSearch, empDeptFilter]);

  // Toggle single employee in Assign Tab
  const toggleEmployeeSelect = (uid) => {
    setSelectedUserIds(prev => 
      prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid]
    );
  };

  const selectAllVisible = () => {
    const ids = assignableEmployees.map(e => e.userId || e._id);
    setSelectedUserIds(prev => Array.from(new Set([...prev, ...ids])));
  };

  const clearSelection = () => {
    setSelectedUserIds([]);
  };

  // Batch Save from Assign Tab
  const handleBatchAssign = async (e) => {
    e.preventDefault();
    if (!selectedStage) return toast("Please select a target Detection Stage", "warning");
    if (selectedUserIds.length === 0) return toast("Please select at least one employee", "warning");

    setIsSaving(true);
    try {
      const usersPayload = selectedUserIds.map(uid => {
        const emp = employees.find(e => (e.userId || e._id) === uid);
        return {
          userId: uid,
          userName: emp?.name || uid,
          userEmail: emp?.email || ""
        };
      });

      const res = await axios.post(`${API_URL}/production-material/stage-mappings`, {
        stage: selectedStage,
        users: usersPayload,
        assignedBy: currentUser.userId || currentUser._id || "Admin",
        assignedByName: currentUser.name || "Administrator"
      });

      if (Array.isArray(res.data)) {
        setMappings(res.data);
      } else {
        await fetchData();
      }

      toast(`Successfully assigned ${selectedUserIds.length} employee(s) to ${selectedStage}`, "success");
      setSelectedUserIds([]);
      setActiveTab("view"); // switch over to View tab so user immediately sees updated table
    } catch (err) {
      console.error("Error saving mapping:", err);
      toast(err.response?.data?.message || "Failed to save assignments", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Edit Single Mapping
  const handleSaveEditMapping = async (e) => {
    e.preventDefault();
    if (!editSelectedStage) return toast("Please select a stage", "warning");

    try {
      const payload = {
        userId: editingMapping.userId,
        userName: editingMapping.userName,
        userEmail: editingMapping.userEmail || "",
        stage: editSelectedStage,
        assignedBy: currentUser.userId || currentUser._id || "Admin",
        assignedByName: currentUser.name || "Administrator"
      };

      const res = await axios.post(`${API_URL}/production-material/stage-mappings`, payload);
      setMappings(prev => prev.map(m => m.userId === editingMapping.userId ? res.data : m));
      toast("Employee stage updated successfully", "success");
      setEditingMapping(null);
    } catch (err) {
      toast("Failed to update mapping", "error");
    }
  };

  const handleDeleteMapping = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove stage assignment for ${name}?`)) return;
    try {
      await axios.delete(`${API_URL}/production-material/stage-mappings/${id}`);
      setMappings(prev => prev.filter(m => m._id !== id));
      toast("Assignment removed", "success");
    } catch (err) {
      toast("Failed to delete mapping", "error");
    }
  };

  // Manage Stages
  const handleAddStage = async () => {
    const s = newStageName.trim();
    if (!s) return;
    if (stages.includes(s)) return toast("Stage already exists", "warning");

    const updated = [...stages, s];
    setStages(updated);
    setNewStageName("");
    try {
      const existing = await axios.get(`${API_URL}/master/settings/production_master_data`).then(r => r.data || {}).catch(() => ({}));
      await axios.post(`${API_URL}/master/settings`, {
        key: "production_master_data",
        value: { ...existing, stages: updated }
      });
      toast("Stage added", "success");
    } catch (err) {
      toast("Failed to persist stage", "error");
    }
  };

  const handleUpdateStage = async (idx) => {
    const val = editingStageVal.trim();
    if (!val) return;
    const oldVal = stages[idx];
    const updated = stages.map((s, i) => i === idx ? val : s);
    setStages(updated);
    setEditingStageIdx(null);
    try {
      const existing = await axios.get(`${API_URL}/master/settings/production_master_data`).then(r => r.data || {}).catch(() => ({}));
      await axios.post(`${API_URL}/master/settings`, {
        key: "production_master_data",
        value: { ...existing, stages: updated }
      });
      toast(`Stage updated from "${oldVal}" to "${val}"`, "success");
    } catch (err) {
      toast("Failed to update stage", "error");
    }
  };

  const handleDeleteStage = async (stageToDelete) => {
    const isAssigned = mappings.some(m => m.stage === stageToDelete);
    if (isAssigned) {
      return toast(`Cannot delete "${stageToDelete}" as employees are currently mapped to it. Reassign them first.`, "error");
    }
    if (!window.confirm(`Delete stage "${stageToDelete}"?`)) return;

    const updated = stages.filter(s => s !== stageToDelete);
    setStages(updated);
    try {
      const existing = await axios.get(`${API_URL}/master/settings/production_master_data`).then(r => r.data || {}).catch(() => ({}));
      await axios.post(`${API_URL}/master/settings`, {
        key: "production_master_data",
        value: { ...existing, stages: updated }
      });
      toast("Stage deleted", "success");
    } catch (err) {
      toast("Failed to delete stage", "error");
    }
  };

  // Filtered Mappings for View Tab
  const filteredMappings = useMemo(() => {
    let list = mappings;
    if (stageFilter !== "All") {
      list = list.filter(m => m.stage === stageFilter);
    }
    if (searchTerm.trim()) {
      const s = searchTerm.toLowerCase();
      list = list.filter(m => 
        (m.userName || "").toLowerCase().includes(s) ||
        (m.userId || "").toLowerCase().includes(s) ||
        (m.stage || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [mappings, stageFilter, searchTerm]);

  const stageDropdownOptions = useMemo(() => {
    return stages.map(stg => ({ value: stg, label: stg }));
  }, [stages]);

  return (
    <div className="flex flex-col h-[calc(100vh-4.2vw)] bg-[#F8FAFC] overflow-hidden">
      {/* Top Header Bar */}
      <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[0.8vw] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Layers className="w-[1.2vw] h-[1.2vw]" />
          </div>
          <div>
            <h1 className="text-[1.15vw] font-bold text-slate-800 tracking-tight flex items-center gap-[0.5vw]">
              Production Master
              <span className="text-[0.72vw] font-semibold bg-blue-100 text-blue-700 px-[0.5vw] py-[0.1vw] rounded-full">
                Detection Stages
              </span>
            </h1>
            <p className="text-[0.77vw] text-slate-500 font-medium">
              Map employees to specific Detection Stages (1 Person = 1 Stage). Controls floor data visibility.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-[0.7vw]">
          {/* Main Two Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-[0.25vw] rounded-[0.5vw] border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab("assign")}
              className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.81vw] font-semibold transition-all cursor-pointer ${
                activeTab === "assign"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <UserPlus className="w-[0.9vw] h-[0.9vw]" />
              Assign Employee
            </button>
            <button
              onClick={() => setActiveTab("view")}
              className={`flex items-center gap-[0.4vw] px-[1vw] py-[0.4vw] rounded-[0.4vw] text-[0.81vw] font-semibold transition-all cursor-pointer ${
                activeTab === "view"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Eye className="w-[0.9vw] h-[0.9vw]" />
              View Employee ({mappings.length})
            </button>
          </div>

          <div className="h-[1.8vw] w-[1px] bg-slate-200" />

          <button
            onClick={() => setStageModalOpen(true)}
            className="flex items-center gap-[0.4vw] px-[0.9vw] py-[0.45vw] rounded-[0.45vw] bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-[0.81vw] font-medium transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <Shield className="w-[0.9vw] h-[0.9vw] text-slate-500" />
            Manage Stages ({stages.length})
          </button>

          <button
            onClick={fetchData}
            title="Refresh list"
            className="p-[0.45vw] rounded-[0.45vw] bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 shadow-2xs transition-all cursor-pointer"
          >
            <RefreshCw className={`w-[0.95vw] h-[0.95vw] ${isLoading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 1: ASSIGN EMPLOYEE (Dedicated In-Page View)            */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "assign" && (
        <div className="flex-1 p-[1.5vw] flex gap-[1.2vw] overflow-hidden">
          {/* Left Panel: Target Stage Selection & Submission Summary */}
          <div className="w-[24vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs p-[1.2vw] flex flex-col justify-between">
            <div className="space-y-[1.2vw]">
              <div>
                <h3 className="text-[1vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                  <UserPlus className="w-[1vw] h-[1vw] text-blue-600" />
                  Stage Assignment
                </h3>
                <p className="text-[0.77vw] text-slate-500 font-medium mt-[0.2vw]">
                  Choose target detection stage and apply to selected employees.
                </p>
              </div>

              {/* Target Stage Dropdown */}
              <div className="space-y-[0.4vw]">
                <label className="text-[0.81vw] font-semibold text-slate-700 uppercase tracking-wider">
                  Target Detection Stage <span className="text-red-500">*</span>
                </label>
                <CustomDropdown
                  value={selectedStage}
                  onChange={(val) => setSelectedStage(val)}
                  options={stageDropdownOptions}
                  placeholder="Select Stage..."
                  usePortal={true}
                  maxHeight="14vw"
                  triggerClassName="!py-[0.45vw] !h-[2.4vw] !rounded-[0.45vw] text-[0.83vw] font-semibold text-slate-800 bg-slate-50 border-slate-300"
                />
              </div>

              {/* Selected Count & Info Card */}
              <div className="bg-blue-50/70 border border-blue-200 rounded-[0.5vw] p-[0.9vw] space-y-[0.5vw]">
                <div className="flex items-center justify-between">
                  <span className="text-[0.78vw] font-semibold text-blue-900">Selected for Assignment:</span>
                  <span className="text-[0.9vw] font-bold text-blue-700 bg-white px-[0.6vw] py-[0.1vw] rounded-full border border-blue-200">
                    {selectedUserIds.length} person(s)
                  </span>
                </div>
                <p className="text-[0.72vw] text-blue-800/80 leading-relaxed">
                  Rule: <strong>1 Person = 1 Stage</strong>. Any existing stage for these selected users will automatically be updated to <span className="font-semibold">{selectedStage || "the chosen stage"}</span>.
                </p>
              </div>

              {/* Selected Chips List Preview */}
              {selectedUserIds.length > 0 && (
                <div className="space-y-[0.3vw]">
                  <div className="flex items-center justify-between text-[0.75vw]">
                    <span className="font-semibold text-slate-600">Selected List Preview:</span>
                    <button 
                      type="button" 
                      onClick={clearSelection}
                      className="text-rose-600 hover:underline font-semibold"
                    >
                      Clear All
                    </button>
                  </div>
                  <div className="max-h-[14vw] overflow-y-auto border border-slate-200 rounded-[0.4vw] p-[0.4vw] flex flex-wrap gap-[0.3vw] bg-slate-50/50">
                    {selectedUserIds.map(uid => {
                      const emp = employees.find(e => (e.userId || e._id) === uid);
                      return (
                        <span 
                          key={uid}
                          className="inline-flex items-center gap-[0.3vw] bg-white border border-blue-200 text-blue-800 text-[0.75vw] font-medium px-[0.45vw] py-[0.15vw] rounded shadow-2xs"
                        >
                          <span>{emp?.name || uid}</span>
                          <X 
                            className="w-[0.7vw] h-[0.7vw] hover:text-rose-600 cursor-pointer" 
                            onClick={() => toggleEmployeeSelect(uid)}
                          />
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-[1vw] border-t border-slate-200 flex flex-col gap-[0.6vw]">
              <button
                type="button"
                onClick={handleBatchAssign}
                disabled={isSaving || selectedUserIds.length === 0}
                className="w-full py-[0.6vw] rounded-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white text-[0.85vw] font-semibold shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-[0.4vw]"
              >
                <Check className="w-[0.9vw] h-[0.9vw]" />
                {isSaving ? "Saving Assignments..." : `Assign Selected (${selectedUserIds.length}) to ${selectedStage || "Stage"}`}
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("view")}
                className="w-full py-[0.45vw] rounded-[0.45vw] border border-slate-300 text-slate-600 hover:bg-slate-100 text-[0.81vw] font-medium transition-all"
              >
                Go to View Employee
              </button>
            </div>
          </div>

          {/* Right Panel: Employee Multi-Select Directory */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
            {/* Filter Bar */}
            <div className="p-[0.9vw] border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-[1vw]">
              <div className="flex items-center gap-[0.8vw] flex-1">
                {/* Search */}
                <div className="relative w-[18vw]">
                  <Search className="w-[0.85vw] h-[0.85vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search employee by name, ID..."
                    value={empSearch}
                    onChange={(e) => setEmpSearch(e.target.value)}
                    className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.38vw] bg-white border border-slate-200 rounded-[0.4vw] text-[0.81vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 transition-all"
                  />
                  {empSearch && (
                    <button onClick={() => setEmpSearch("")} className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                      <X className="w-[0.8vw] h-[0.8vw]" />
                    </button>
                  )}
                </div>

                {/* Dept Filter */}
                <div className="flex items-center gap-[0.4vw]">
                  <span className="text-[0.78vw] font-semibold text-slate-500 uppercase tracking-wider">Dept:</span>
                  <div className="w-[11vw]">
                    <CustomDropdown
                      value={empDeptFilter}
                      onChange={(val) => setEmpDeptFilter(val)}
                      options={[{ value: "All", label: "All Departments" }, ...departments.map(d => ({ value: d, label: d }))]}
                      size="sm"
                      triggerClassName="!py-[0.3vw] !h-[2.1vw] !rounded-[0.4vw] text-[0.81vw] font-medium bg-white border-slate-200"
                    />
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex items-center gap-[0.6vw]">
                <button
                  type="button"
                  onClick={selectAllVisible}
                  className="px-[0.8vw] py-[0.35vw] rounded-[0.4vw] bg-white border border-slate-300 hover:bg-slate-50 text-blue-700 text-[0.78vw] font-semibold transition-all cursor-pointer shadow-2xs"
                >
                  + Select All Visible ({assignableEmployees.length})
                </button>
                {selectedUserIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearSelection}
                    className="px-[0.8vw] py-[0.35vw] rounded-[0.4vw] bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 text-[0.78vw] font-semibold transition-all cursor-pointer shadow-2xs"
                  >
                    Clear All
                  </button>
                )}
              </div>
            </div>

            {/* Employee Selection List */}
            <div className="flex-1 overflow-auto divide-y divide-slate-100">
              {assignableEmployees.length === 0 ? (
                <div className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                  No employees found matching filter
                </div>
              ) : (
                <div className="grid grid-cols-2 divide-x divide-y divide-slate-100">
                  {assignableEmployees.map(emp => {
                    const uid = emp.userId || emp._id;
                    const isSelected = selectedUserIds.includes(uid);
                    const existingMapping = mappings.find(m => m.userId === uid);

                    return (
                      <div
                        key={uid}
                        onClick={() => toggleEmployeeSelect(uid)}
                        className={`p-[0.8vw] flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/80"
                        }`}
                      >
                        <div className="flex items-center gap-[0.7vw]">
                          <div className={`w-[1.2vw] h-[1.2vw] rounded-[0.25vw] border flex items-center justify-center transition-all ${
                            isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                          }`}>
                            {isSelected && <Check className="w-[0.8vw] h-[0.8vw] stroke-[3]" />}
                          </div>
                          <div>
                            <div className="text-[0.83vw] font-bold text-slate-800">{emp.name}</div>
                            <div className="text-[0.72vw] text-slate-500 font-mono">
                              ID: {uid} {emp.department ? `· ${emp.department}` : ""}
                            </div>
                          </div>
                        </div>

                        {existingMapping ? (
                          <span className="text-[0.7vw] font-semibold px-[0.5vw] py-[0.1vw] rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Current: {existingMapping.stage}
                          </span>
                        ) : (
                          <span className="text-[0.7vw] font-medium px-[0.45vw] py-[0.1vw] rounded-full bg-slate-100 text-slate-400 border border-slate-200">
                            Unassigned
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
              <span>Showing {assignableEmployees.length} employee(s)</span>
              <span>{selectedUserIds.length} currently selected</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: VIEW EMPLOYEE (Table View of All Mapped Persons)    */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "view" && (
        <div className="flex-1 p-[1.5vw] flex flex-col gap-[1vw] overflow-hidden">
          {/* Filter & Stat Bar */}
          <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.9vw] shadow-2xs flex items-center justify-between gap-[1vw]">
            <div className="flex items-center gap-[0.8vw] flex-1">
              {/* Search Box */}
              <div className="relative w-[18vw]">
                <Search className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search person or stage..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.4vw] bg-slate-50 border border-slate-200 rounded-[0.4vw] text-[0.81vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                {searchTerm && (
                  <button onClick={() => setSearchTerm("")} className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-[0.8vw] h-[0.8vw]" />
                  </button>
                )}
              </div>

              {/* Stage Filter */}
              <div className="flex items-center gap-[0.4vw]">
                <span className="text-[0.78vw] font-semibold text-slate-500 uppercase tracking-wider">Stage:</span>
                <div className="w-[12vw]">
                  <CustomDropdown
                    value={stageFilter}
                    onChange={(val) => setStageFilter(val)}
                    options={[{ value: "All", label: "All Stages" }, ...stages.map(s => ({ value: s, label: s }))]}
                    size="sm"
                    triggerClassName="!py-[0.35vw] !h-[2.1vw] !rounded-[0.4vw] text-[0.81vw] font-medium bg-slate-50 border-slate-200"
                  />
                </div>
              </div>
            </div>

            {/* Quick Metrics */}
            <div className="flex items-center gap-[1.2vw]">
              <button
                onClick={() => setActiveTab("assign")}
                className="flex items-center gap-[0.35vw] px-[0.9vw] py-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.81vw] font-semibold transition-all shadow-xs cursor-pointer"
              >
                <UserPlus className="w-[0.85vw] h-[0.85vw]" />
                + Assign New Employees
              </button>
              <div className="h-[2vw] w-[1px] bg-slate-200" />
              <div className="text-right">
                <div className="text-[0.7vw] font-semibold uppercase text-slate-400">Total Stages</div>
                <div className="text-[1.05vw] font-bold text-slate-800">{stages.length}</div>
              </div>
              <div className="h-[2vw] w-[1px] bg-slate-200" />
              <div className="text-right">
                <div className="text-[0.7vw] font-semibold uppercase text-slate-400">Mapped Persons</div>
                <div className="text-[1.05vw] font-bold text-blue-600">{mappings.length}</div>
              </div>
            </div>
          </div>

          {/* Table Area */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#E9EDF7] border-b border-slate-300 sticky top-0 z-10">
                    <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[4vw] text-center border-r border-slate-300">#</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[18vw] border-r border-slate-300">Person / Employee</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[10vw] border-r border-slate-300">Employee ID</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[16vw] border-r border-slate-300">Assigned Detection Stage</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[14vw] border-r border-slate-300">Assigned By</th>
                    <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[8vw] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                        <RefreshCw className="w-[1.4vw] h-[1.4vw] animate-spin mx-auto mb-[0.5vw] text-blue-500" />
                        Loading stage assignments...
                      </td>
                    </tr>
                  ) : filteredMappings.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                        <AlertCircle className="w-[1.6vw] h-[1.6vw] mx-auto mb-[0.4vw] text-slate-300" />
                        No stage mappings found. Click <span className="font-semibold text-blue-600 cursor-pointer" onClick={() => setActiveTab("assign")}>"Assign Employee"</span> tab to map employees.
                      </td>
                    </tr>
                  ) : (
                    filteredMappings.map((mapping, idx) => (
                      <tr key={mapping._id} className="hover:bg-blue-50/40 transition-colors group">
                        <td className="py-[0.6vw] px-[1vw] text-center text-[0.81vw] font-medium text-slate-500 border-r border-slate-200">
                          {idx + 1}
                        </td>
                        <td className="py-[0.6vw] px-[1.2vw] border-r border-slate-200">
                          <div className="flex items-center gap-[0.6vw]">
                            <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-100 text-blue-700 font-bold text-[0.75vw] flex items-center justify-center">
                              {(mapping.userName || "U")[0]?.toUpperCase()}
                            </div>
                            <div>
                              <div className="text-[0.83vw] font-semibold text-slate-800">{mapping.userName}</div>
                              {mapping.userEmail && (
                                <div className="text-[0.71vw] text-slate-400 font-normal">{mapping.userEmail}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-[0.6vw] px-[1.2vw] text-[0.81vw] font-mono text-slate-600 font-medium border-r border-slate-200">
                          {mapping.userId}
                        </td>
                        <td className="py-[0.6vw] px-[1.2vw] border-r border-slate-200">
                          <span className="inline-flex items-center gap-[0.35vw] px-[0.7vw] py-[0.15vw] rounded-full text-[0.79vw] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-[0.75vw] h-[0.75vw]" />
                            {mapping.stage}
                          </span>
                        </td>
                        <td className="py-[0.6vw] px-[1.2vw] text-[0.79vw] text-slate-600 border-r border-slate-200">
                          {mapping.assignedByName || mapping.assignedBy || "—"}
                        </td>
                        <td className="py-[0.6vw] px-[1vw] text-center">
                          <div className="flex items-center justify-center gap-[0.4vw]">
                            <button
                              onClick={() => {
                                setEditingMapping(mapping);
                                setEditSelectedStage(mapping.stage);
                              }}
                              className="p-[0.35vw] text-blue-600 hover:bg-blue-100 rounded-[0.3vw] transition-all cursor-pointer"
                              title="Edit Assignment"
                            >
                              <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                            </button>
                            <button
                              onClick={() => handleDeleteMapping(mapping._id, mapping.userName)}
                              className="p-[0.35vw] text-rose-600 hover:bg-rose-100 rounded-[0.3vw] transition-all cursor-pointer"
                              title="Remove Assignment"
                            >
                              <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Table Footer */}
            <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
              <span>Showing {filteredMappings.length} of {mappings.length} stage mapping(s)</span>
              <span>Rules: 1 Person = 1 Detection Stage · Controls production floor access</span>
            </div>
          </div>
        </div>
      )}

      {/* ── Modal: Edit Single Person Stage Assignment ── */}
      {editingMapping && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[28vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-[1.2vw] py-[0.9vw] flex items-center justify-between text-white">
              <div className="flex items-center gap-[0.5vw]">
                <Edit3 className="w-[1.1vw] h-[1.1vw]" />
                <h3 className="text-[1vw] font-bold">Edit Stage Assignment</h3>
              </div>
              <button 
                onClick={() => setEditingMapping(null)}
                className="text-white/80 hover:text-white p-[0.2vw] rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-[1.1vw] h-[1.1vw]" />
              </button>
            </div>

            <form onSubmit={handleSaveEditMapping} className="p-[1.4vw] space-y-[1.2vw]">
              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-500 uppercase">Employee</label>
                <div className="p-[0.6vw] bg-slate-100 border border-slate-200 rounded-[0.4vw] flex items-center justify-between">
                  <span className="text-[0.83vw] font-bold text-slate-800">{editingMapping.userName}</span>
                  <span className="text-[0.75vw] text-slate-500 font-mono">({editingMapping.userId})</span>
                </div>
              </div>

              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-700 uppercase">Change Detection Stage</label>
                <CustomDropdown
                  value={editSelectedStage}
                  onChange={(val) => setEditSelectedStage(val)}
                  options={stageDropdownOptions}
                  placeholder="Select Stage..."
                  usePortal={true}
                  maxHeight="12vw"
                  triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-[0.6vw] pt-[0.6vw] border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingMapping(null)}
                  className="px-[1vw] py-[0.45vw] rounded-[0.45vw] border border-slate-300 text-slate-600 hover:bg-slate-100 text-[0.81vw] font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[1.2vw] py-[0.45vw] rounded-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white text-[0.81vw] font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Update Stage
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal: Manage Detection Stages ── */}
      {stageModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[35vw] max-h-[85vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-800 px-[1.2vw] py-[0.9vw] flex items-center justify-between text-white">
              <div className="flex items-center gap-[0.5vw]">
                <Layers className="w-[1.2vw] h-[1.2vw] text-blue-400" />
                <h3 className="text-[1vw] font-bold">Manage Detection Stages</h3>
              </div>
              <button 
                onClick={() => setStageModalOpen(false)}
                className="text-white/80 hover:text-white p-[0.2vw] rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-[1.1vw] h-[1.1vw]" />
              </button>
            </div>

            <div className="p-[1.4vw] flex-1 overflow-y-auto space-y-[1.2vw]">
              {/* Add New Stage */}
              <div className="flex gap-[0.5vw]">
                <input
                  type="text"
                  placeholder="Enter new Detection Stage name..."
                  value={newStageName}
                  onChange={(e) => setNewStageName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAddStage(); } }}
                  className="flex-1 px-[0.8vw] py-[0.45vw] bg-slate-50 border border-slate-300 rounded-[0.45vw] text-[0.83vw] outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                <button
                  type="button"
                  onClick={handleAddStage}
                  className="px-[1vw] py-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.45vw] text-[0.81vw] font-semibold transition-all shadow-xs cursor-pointer"
                >
                  Add Stage
                </button>
              </div>

              {/* Stage List */}
              <div className="border border-slate-200 rounded-[0.5vw] overflow-hidden divide-y divide-slate-100">
                {stages.map((stg, idx) => {
                  const assignedCount = mappings.filter(m => m.stage === stg).length;
                  const isEditingThis = editingStageIdx === idx;

                  return (
                    <div key={stg} className="px-[1vw] py-[0.6vw] flex items-center justify-between hover:bg-slate-50/80 transition-colors">
                      {isEditingThis ? (
                        <div className="flex items-center gap-[0.4vw] flex-1 mr-[0.8vw]">
                          <input
                            type="text"
                            value={editingStageVal}
                            onChange={(e) => setEditingStageVal(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleUpdateStage(idx); }}
                            autoFocus
                            className="flex-1 px-[0.6vw] py-[0.25vw] bg-white border border-blue-400 rounded-[0.3vw] text-[0.81vw] outline-none"
                          />
                          <button
                            onClick={() => handleUpdateStage(idx)}
                            className="px-[0.6vw] py-[0.25vw] bg-emerald-600 text-white rounded-[0.3vw] text-[0.75vw] font-semibold hover:bg-emerald-700"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingStageIdx(null)}
                            className="px-[0.5vw] py-[0.25vw] text-slate-500 hover:bg-slate-200 rounded-[0.3vw] text-[0.75vw]"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-[0.6vw]">
                          <span className="text-[0.83vw] font-semibold text-slate-800">{stg}</span>
                          <span className="text-[0.7vw] font-medium px-[0.45vw] py-[0.05vw] rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                            {assignedCount} person{assignedCount === 1 ? "" : "s"}
                          </span>
                        </div>
                      )}

                      {!isEditingThis && (
                        <div className="flex items-center gap-[0.3vw]">
                          <button
                            onClick={() => {
                              setEditingStageIdx(idx);
                              setEditingStageVal(stg);
                            }}
                            className="p-[0.3vw] text-blue-600 hover:bg-blue-50 rounded-[0.3vw] transition-colors"
                            title="Edit Stage Name"
                          >
                            <Edit3 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            onClick={() => handleDeleteStage(stg)}
                            className="p-[0.3vw] text-red-500 hover:bg-red-50 rounded-[0.3vw] transition-colors"
                            title="Delete Stage"
                          >
                            <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.6vw] flex justify-end">
              <button
                type="button"
                onClick={() => setStageModalOpen(false)}
                className="px-[1.2vw] py-[0.4vw] bg-slate-800 hover:bg-slate-900 text-white text-[0.81vw] font-medium rounded-[0.4vw] transition-all"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMaster;
