import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import { 
  Plus, 
  Trash2, 
  Edit3, 
  Search, 
  MapPin, 
  UserPlus, 
  Users, 
  Layers, 
  CheckCircle2, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Database,
  Radio,
  Star,
  Settings,
  Briefcase,
  ChevronRight
} from "lucide-react";
import { useNotification } from "../../components/NotificationContext";
import CustomDropdown from "../../components/CustomDropdown";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const DEFAULT_STATION_ROLES = [
  "Manufacturing",
  "Assembly 1",
  "Assembly 2",
  "Machine Testing",
  "Manual Testing",
  "Quality Inspection"
];

const ProductionMaster = () => {
  const { toast } = useNotification();

  // 4 Tabs: "zones" (Zones CRUD), "roles" (Per-Zone Roles Management), "assign" (Assign Staff to Zone & Role), "master" (Inside Master)
  const [activeTab, setActiveTab] = useState("zones");

  // Core Data
  const [zones, setZones] = useState([]);
  const [zoneMappings, setZoneMappings] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Current logged in user
  const currentUser = useMemo(() => {
    try {
      const raw = sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || localStorage.getItem("user") || "{}";
      return JSON.parse(raw);
    } catch {
      return {};
    }
  }, []);

  // -------------------------------------------------------------
  // TAB 1: ZONE CRUD STATE
  // -------------------------------------------------------------
  const [zoneSearch, setZoneSearch] = useState("");
  const [isZoneModalOpen, setIsZoneModalOpen] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [zoneForm, setZoneForm] = useState({ 
    name: "", 
    description: "", 
    defaultReceiverRole: "Manual Testing" 
  });
  const [isSavingZone, setIsSavingZone] = useState(false);

  // -------------------------------------------------------------
  // TAB: PER-ZONE ROLE MASTER MANAGEMENT STATE
  // -------------------------------------------------------------
  const [selectedZoneForRoles, setSelectedZoneForRoles] = useState("");
  const [newRoleInput, setNewRoleInput] = useState("");
  const [editingRoleIdx, setEditingRoleIdx] = useState(null);
  const [editingRoleVal, setEditingRoleVal] = useState("");
  const [isUpdatingZoneRoles, setIsUpdatingZoneRoles] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: ASSIGN EMPLOYEES STATE
  // -------------------------------------------------------------
  const [assignSubTab, setAssignSubTab] = useState("assign"); // "assign" or "view"
  const [selectedZone, setSelectedZone] = useState("");
  const [selectedRoleInZone, setSelectedRoleInZone] = useState("");
  const [selectedUserIds, setSelectedUserIds] = useState([]);
  const [isDefaultReceiverCheck, setIsDefaultReceiverCheck] = useState(false);
  const [empSearch, setEmpSearch] = useState("");
  const [empDeptFilter, setEmpDeptFilter] = useState("All");
  const [isSavingAssignment, setIsSavingAssignment] = useState(false);

  // View / Search in Assigned list
  const [assignedSearch, setAssignedSearch] = useState("");
  const [assignedZoneFilter, setAssignedZoneFilter] = useState("All");
  const [assignedRoleFilter, setAssignedRoleFilter] = useState("All");

  // Edit single employee assignment modal
  const [editingAssignment, setEditingAssignment] = useState(null);
  const [editSelectedZone, setEditSelectedZone] = useState("");
  const [editSelectedRole, setEditSelectedRole] = useState("");
  const [editIsDefaultReceiver, setEditIsDefaultReceiver] = useState(false);

  // -------------------------------------------------------------
  // FETCH ALL DATA
  // -------------------------------------------------------------
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const [zonesRes, mappingsRes, empRes] = await Promise.all([
        axios.get(`${API_URL}/master/zones`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/production-material/zone-mappings`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/auth/employees`).catch(() => ({ data: [] }))
      ]);

      const fetchedZones = zonesRes.data || [];
      setZones(fetchedZones);
      setZoneMappings(mappingsRes.data || []);
      setEmployees(empRes.data || []);

      if (fetchedZones.length > 0) {
        if (!selectedZone) setSelectedZone(fetchedZones[0].name);
        if (!selectedZoneForRoles) setSelectedZoneForRoles(fetchedZones[0].name);
      }
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

  useEffect(() => {
    if (zones.length > 0) {
      if (!selectedZone || !zones.some(z => z.name === selectedZone)) {
        setSelectedZone(zones[0].name);
      }
      if (!selectedZoneForRoles || !zones.some(z => z.name === selectedZoneForRoles)) {
        setSelectedZoneForRoles(zones[0].name);
      }
    }
  }, [zones, selectedZone, selectedZoneForRoles]);

  // Active Zone Object selected for Role Master tab
  const activeZoneObjForRoles = useMemo(() => {
    return zones.find(z => z.name === selectedZoneForRoles) || null;
  }, [zones, selectedZoneForRoles]);

  // Roles belonging strictly to the zone chosen in "Assign Staff" tab
  const rolesForAssignZone = useMemo(() => {
    const zObj = zones.find(z => z.name === selectedZone);
    if (zObj && Array.isArray(zObj.roles) && zObj.roles.length > 0) {
      return zObj.roles;
    }
    return DEFAULT_STATION_ROLES;
  }, [zones, selectedZone]);

  // Automatically update selectedRoleInZone if not valid for selectedZone
  useEffect(() => {
    if (rolesForAssignZone.length > 0) {
      if (!selectedRoleInZone || !rolesForAssignZone.includes(selectedRoleInZone)) {
        setSelectedRoleInZone(rolesForAssignZone[0]);
      }
    }
  }, [rolesForAssignZone, selectedRoleInZone]);

  // Roles belonging strictly to the zone chosen in "Edit Single Assignment Modal"
  const rolesForEditModalZone = useMemo(() => {
    const zObj = zones.find(z => z.name === editSelectedZone);
    if (zObj && Array.isArray(zObj.roles) && zObj.roles.length > 0) {
      return zObj.roles;
    }
    return DEFAULT_STATION_ROLES;
  }, [zones, editSelectedZone]);

  // -------------------------------------------------------------
  // TAB 1 HANDLERS: ZONE CRUD
  // -------------------------------------------------------------
  const openAddZoneModal = () => {
    setEditingZone(null);
    setZoneForm({ 
      name: "", 
      description: "", 
      defaultReceiverRole: "Manual Testing" 
    });
    setIsZoneModalOpen(true);
  };

  const openEditZoneModal = (zone) => {
    setEditingZone(zone);
    setZoneForm({ 
      name: zone.name, 
      description: zone.description || "",
      defaultReceiverRole: zone.defaultReceiverRole || "Manual Testing"
    });
    setIsZoneModalOpen(true);
  };

  const handleSaveZone = async (e) => {
    e.preventDefault();
    const trimmedName = zoneForm.name.trim();
    if (!trimmedName) return toast("Zone name is required", "warning");

    setIsSavingZone(true);
    try {
      if (editingZone) {
        const res = await axios.put(`${API_URL}/master/zones/${editingZone._id}`, {
          name: trimmedName,
          description: zoneForm.description.trim(),
          defaultReceiverRole: zoneForm.defaultReceiverRole || "Manual Testing"
        });
        setZones(prev => prev.map(z => z._id === editingZone._id ? res.data : z));

        if (editingZone.name !== trimmedName) {
          fetchData();
        }
        toast(`Zone "${trimmedName}" updated successfully`, "success");
      } else {
        const res = await axios.post(`${API_URL}/master/zones`, {
          name: trimmedName,
          description: zoneForm.description.trim(),
          roles: DEFAULT_STATION_ROLES,
          defaultReceiverRole: zoneForm.defaultReceiverRole || "Manual Testing"
        });
        setZones(prev => [...prev, res.data]);
        toast(`Zone "${trimmedName}" created successfully`, "success");
        if (!selectedZone) setSelectedZone(trimmedName);
        if (!selectedZoneForRoles) setSelectedZoneForRoles(trimmedName);
      }
      setIsZoneModalOpen(false);
      setZoneForm({ name: "", description: "", defaultReceiverRole: "Manual Testing" });
      setEditingZone(null);
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save zone", "error");
    } finally {
      setIsSavingZone(false);
    }
  };

  const handleDeleteZone = async (zone) => {
    const assignedCount = zoneMappings.filter(m => m.zone === zone.name).length;
    if (assignedCount > 0) {
      return toast(`Cannot delete zone "${zone.name}". ${assignedCount} employee(s) are assigned to it. Reassign them first.`, "error");
    }

    if (!window.confirm(`Are you sure you want to delete zone "${zone.name}"?`)) return;

    try {
      await axios.delete(`${API_URL}/master/zones/${zone._id}`);
      setZones(prev => prev.filter(z => z._id !== zone._id));
      toast(`Zone "${zone.name}" deleted`, "success");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to delete zone", "error");
    }
  };

  const filteredZones = useMemo(() => {
    if (!zoneSearch.trim()) return zones;
    const s = zoneSearch.toLowerCase();
    return zones.filter(z => 
      z.name.toLowerCase().includes(s) || 
      (z.description && z.description.toLowerCase().includes(s))
    );
  }, [zones, zoneSearch]);

  // -------------------------------------------------------------
  // PER-ZONE ROLE MASTER MANAGEMENT HANDLERS
  // -------------------------------------------------------------
  const handleAddRoleToZone = async (e) => {
    e.preventDefault();
    if (!activeZoneObjForRoles) return toast("Please select a zone first", "warning");
    const roleName = newRoleInput.trim();
    if (!roleName) return toast("Station / Role name is required", "warning");

    const currentRoles = activeZoneObjForRoles.roles || DEFAULT_STATION_ROLES;
    if (currentRoles.some(r => r.toLowerCase() === roleName.toLowerCase())) {
      return toast(`Role "${roleName}" already exists in ${activeZoneObjForRoles.name}`, "warning");
    }

    const updatedRoles = [...currentRoles, roleName];
    setIsUpdatingZoneRoles(true);
    try {
      const res = await axios.put(`${API_URL}/master/zones/${activeZoneObjForRoles._id}`, {
        roles: updatedRoles
      });
      setZones(prev => prev.map(z => z._id === activeZoneObjForRoles._id ? res.data : z));
      setNewRoleInput("");
      toast(`Role "${roleName}" added to ${activeZoneObjForRoles.name}`, "success");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to add role", "error");
    } finally {
      setIsUpdatingZoneRoles(false);
    }
  };

  const handleUpdateRoleInZone = async (oldRoleName, newRoleName) => {
    if (!activeZoneObjForRoles) return;
    const trimmed = newRoleName.trim();
    if (!trimmed) return toast("Role name cannot be empty", "warning");
    if (trimmed.toLowerCase() === oldRoleName.toLowerCase()) {
      setEditingRoleIdx(null);
      return;
    }

    const currentRoles = activeZoneObjForRoles.roles || DEFAULT_STATION_ROLES;
    if (currentRoles.some(r => r.toLowerCase() === trimmed.toLowerCase())) {
      return toast(`Role "${trimmed}" already exists in ${activeZoneObjForRoles.name}`, "warning");
    }

    const updatedRoles = currentRoles.map(r => r === oldRoleName ? trimmed : r);
    setIsUpdatingZoneRoles(true);
    try {
      const res = await axios.put(`${API_URL}/master/zones/${activeZoneObjForRoles._id}`, {
        roles: updatedRoles,
        defaultReceiverRole: activeZoneObjForRoles.defaultReceiverRole === oldRoleName ? trimmed : activeZoneObjForRoles.defaultReceiverRole
      });
      setZones(prev => prev.map(z => z._id === activeZoneObjForRoles._id ? res.data : z));
      setEditingRoleIdx(null);
      setEditingRoleVal("");
      toast(`Role updated to "${trimmed}"`, "success");
    } catch (err) {
      toast("Failed to update role", "error");
    } finally {
      setIsUpdatingZoneRoles(false);
    }
  };

  const handleDeleteRoleFromZone = async (roleName) => {
    if (!activeZoneObjForRoles) return;
    const currentRoles = activeZoneObjForRoles.roles || DEFAULT_STATION_ROLES;

    // Check if staff in this zone are currently mapped to this role
    const assignedStaffCount = zoneMappings.filter(m => m.zone === activeZoneObjForRoles.name && (m.roleInZone || "").trim() === roleName).length;
    if (assignedStaffCount > 0) {
      return toast(`Cannot remove "${roleName}" from ${activeZoneObjForRoles.name}. ${assignedStaffCount} employee(s) are currently assigned to it. Reassign them first.`, "error");
    }

    if (!window.confirm(`Remove role "${roleName}" from ${activeZoneObjForRoles.name}?`)) return;

    const updatedRoles = currentRoles.filter(r => r !== roleName);
    setIsUpdatingZoneRoles(true);
    try {
      const res = await axios.put(`${API_URL}/master/zones/${activeZoneObjForRoles._id}`, {
        roles: updatedRoles
      });
      setZones(prev => prev.map(z => z._id === activeZoneObjForRoles._id ? res.data : z));
      toast(`Role "${roleName}" removed from ${activeZoneObjForRoles.name}`, "success");
    } catch (err) {
      toast("Failed to delete role", "error");
    } finally {
      setIsUpdatingZoneRoles(false);
    }
  };

  const handleSetDefaultReceiverRole = async (roleName) => {
    if (!activeZoneObjForRoles) return;
    try {
      const res = await axios.put(`${API_URL}/master/zones/${activeZoneObjForRoles._id}`, {
        defaultReceiverRole: roleName
      });
      setZones(prev => prev.map(z => z._id === activeZoneObjForRoles._id ? res.data : z));
      toast(`Default Intake Role for ${activeZoneObjForRoles.name} set to "${roleName}"`, "success");
    } catch (err) {
      toast("Failed to update default intake role", "error");
    }
  };

  // -------------------------------------------------------------
  // TAB 2 HANDLERS: ASSIGN EMPLOYEES TO ZONES & ROLES
  // -------------------------------------------------------------
  const departments = useMemo(() => {
    const set = new Set();
    employees.forEach(e => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set);
  }, [employees]);

  const zoneDropdownOptions = useMemo(() => {
    return zones.map(z => ({ value: z.name, label: z.name }));
  }, [zones]);

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

  const handleBatchAssign = async (e) => {
    e.preventDefault();
    if (!selectedZone) return toast("Please select a target Zone", "warning");
    if (!selectedRoleInZone) return toast("Please select a station role inside this zone", "warning");
    if (selectedUserIds.length === 0) return toast("Please select at least one employee", "warning");

    setIsSavingAssignment(true);
    try {
      const usersPayload = selectedUserIds.map(uid => {
        const emp = employees.find(e => (e.userId || e._id) === uid);
        return {
          userId: uid,
          userName: emp?.name || uid,
          userEmail: emp?.email || "",
          department: emp?.department || "",
          roleInZone: selectedRoleInZone,
          isDefaultReceiver: isDefaultReceiverCheck
        };
      });

      const res = await axios.post(`${API_URL}/production-material/zone-mappings`, {
        zone: selectedZone,
        roleInZone: selectedRoleInZone,
        isDefaultReceiver: isDefaultReceiverCheck,
        users: usersPayload,
        assignedBy: currentUser.userId || currentUser._id || "Admin",
        assignedByName: currentUser.name || "Administrator"
      });

      if (Array.isArray(res.data)) {
        setZoneMappings(res.data);
      } else {
        await fetchData();
      }

      toast(`Successfully assigned ${selectedUserIds.length} employee(s) to ${selectedZone} as ${selectedRoleInZone}`, "success");
      setSelectedUserIds([]);
      setIsDefaultReceiverCheck(false);
      setAssignSubTab("view");
    } catch (err) {
      toast(err.response?.data?.message || "Failed to save zone assignments", "error");
    } finally {
      setIsSavingAssignment(false);
    }
  };

  const handleSaveEditAssignment = async (e) => {
    e.preventDefault();
    if (!editSelectedZone) return toast("Please select a zone", "warning");
    if (!editSelectedRole) return toast("Please select a role", "warning");

    try {
      const payload = {
        userId: editingAssignment.userId,
        userName: editingAssignment.userName,
        userEmail: editingAssignment.userEmail || "",
        department: editingAssignment.department || "",
        zone: editSelectedZone,
        roleInZone: editSelectedRole,
        isDefaultReceiver: editIsDefaultReceiver,
        assignedBy: currentUser.userId || currentUser._id || "Admin",
        assignedByName: currentUser.name || "Administrator"
      };

      const res = await axios.post(`${API_URL}/production-material/zone-mappings`, payload);
      setZoneMappings(prev => prev.map(m => m.userId === editingAssignment.userId ? res.data : m));
      toast("Employee zone assignment updated successfully", "success");
      setEditingAssignment(null);
    } catch (err) {
      toast("Failed to update employee assignment", "error");
    }
  };

  const handleDeleteAssignment = async (id, name) => {
    if (!window.confirm(`Are you sure you want to remove zone assignment for ${name}?`)) return;
    try {
      await axios.delete(`${API_URL}/production-material/zone-mappings/${id}`);
      setZoneMappings(prev => prev.filter(m => m._id !== id));
      toast("Zone assignment removed", "success");
    } catch (err) {
      toast("Failed to remove assignment", "error");
    }
  };

  const filteredAssignedMappings = useMemo(() => {
    let list = zoneMappings;
    if (assignedZoneFilter !== "All") {
      list = list.filter(m => m.zone === assignedZoneFilter);
    }
    if (assignedRoleFilter !== "All") {
      list = list.filter(m => (m.roleInZone || "").trim() === assignedRoleFilter);
    }
    if (assignedSearch.trim()) {
      const s = assignedSearch.toLowerCase();
      list = list.filter(m => 
        (m.userName || "").toLowerCase().includes(s) ||
        (m.userId || "").toLowerCase().includes(s) ||
        (m.zone || "").toLowerCase().includes(s) ||
        (m.roleInZone || "").toLowerCase().includes(s) ||
        (m.department || "").toLowerCase().includes(s)
      );
    }
    return list;
  }, [zoneMappings, assignedZoneFilter, assignedRoleFilter, assignedSearch]);

  // All distinct roles across all zones for filter dropdown
  const allDistinctRoles = useMemo(() => {
    const set = new Set();
    zones.forEach(z => {
      (z.roles || DEFAULT_STATION_ROLES).forEach(r => set.add(r));
    });
    return Array.from(set);
  }, [zones]);

  return (
    <div className="flex flex-col h-[calc(100vh-4.2vw)] bg-[#F8FAFC] overflow-hidden">
      {/* ── TOP HEADER BAR ── */}
      <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[0.8vw] flex items-center justify-between shadow-2xs">
        <div className="flex items-center gap-[0.8vw]">
          <div className="w-[2.4vw] h-[2.4vw] rounded-[0.5vw] bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600 shadow-2xs">
            <Layers className="w-[1.2vw] h-[1.2vw]" />
          </div>
          <div>
            <h1 className="text-[1.15vw] font-bold text-slate-800 tracking-tight flex items-center gap-[0.5vw]">
              Production Master
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-[0.8vw]">
          {/* Main Navigation Tabs */}
          <div className="flex items-center bg-slate-100 p-[0.25vw] rounded-[0.5vw] border border-slate-200 shadow-inner">
            <button
              onClick={() => setActiveTab("zones")}
              className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-[0.4vw] text-[0.81vw] font-semibold transition-all cursor-pointer ${
                activeTab === "zones"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <MapPin className="w-[0.9vw] h-[0.9vw]" />
              Zones ({zones.length})
            </button>

            <button
              onClick={() => setActiveTab("roles")}
              className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-[0.4vw] text-[0.81vw] font-semibold transition-all cursor-pointer ${
                activeTab === "roles"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Briefcase className="w-[0.9vw] h-[0.9vw]" />
              Roles per Zone
            </button>

            <button
              onClick={() => setActiveTab("assign")}
              className={`flex items-center gap-[0.4vw] px-[0.9vw] py-[0.4vw] rounded-[0.4vw] text-[0.81vw] font-semibold transition-all cursor-pointer ${
                activeTab === "assign"
                  ? "bg-blue-600 text-white shadow-xs"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              }`}
            >
              <Users className="w-[0.9vw] h-[0.9vw]" />
              Assign Employees ({zoneMappings.length})
            </button>
          </div>

          <div className="h-[1.8vw] w-[1px] bg-slate-200" />

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
      {/* TAB 1: ZONE CREATE, UPDATE, DELETE                         */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "zones" && (
        <div className="flex-1 p-[1.5vw] flex flex-col gap-[1vw] overflow-hidden">
          <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.9vw] shadow-2xs flex items-center justify-between gap-[1vw]">
            <div className="flex items-center gap-[0.8vw] flex-1">
              <div className="relative w-[20vw]">
                <Search className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search zone by name or description..."
                  value={zoneSearch}
                  onChange={(e) => setZoneSearch(e.target.value)}
                  className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.4vw] bg-slate-50 border border-slate-200 rounded-[0.4vw] text-[0.81vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                />
                {zoneSearch && (
                  <button onClick={() => setZoneSearch("")} className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    <X className="w-[0.8vw] h-[0.8vw]" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center gap-[1vw]">
              <div className="text-right">
                <div className="text-[0.7vw] font-semibold uppercase text-slate-400">Total Zones</div>
                <div className="text-[1.05vw] font-bold text-slate-800">{zones.length}</div>
              </div>
              <div className="h-[2vw] w-[1px] bg-slate-200" />
              <button
                onClick={openAddZoneModal}
                className="flex items-center gap-[0.35vw] px-[1vw] py-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.81vw] font-semibold transition-all shadow-xs cursor-pointer active:scale-95"
              >
                <Plus className="w-[0.9vw] h-[0.9vw]" />
                Add New Zone
              </button>
            </div>
          </div>

          {/* Zones Table */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
            <div className="flex-1 overflow-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-[#E9EDF7] border-b border-slate-300 sticky top-0 z-10">
                    <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[4vw] text-center border-r border-slate-300">#</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[16vw] border-r border-slate-300">Zone Name</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider border-r border-slate-300">Allocated Employees</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[15vw] border-r border-slate-300">Custom Stations / Roles</th>
                    <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[14vw] border-r border-slate-300">Default Intake Role</th>
                    <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[10vw] text-center">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                        <RefreshCw className="w-[1.4vw] h-[1.4vw] animate-spin mx-auto mb-[0.5vw] text-blue-500" />
                        Loading zones...
                      </td>
                    </tr>
                  ) : filteredZones.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                        <AlertCircle className="w-[1.6vw] h-[1.6vw] mx-auto mb-[0.4vw] text-slate-300" />
                        No zones found. Click <span className="font-semibold text-blue-600 cursor-pointer" onClick={openAddZoneModal}>"Add New Zone"</span> to create your first production zone.
                      </td>
                    </tr>
                  ) : (
                    filteredZones.map((zone, idx) => {
                      const zoneRoleList = zone.roles && zone.roles.length > 0 ? zone.roles : DEFAULT_STATION_ROLES;
                      return (
                        <tr key={zone._id} className="hover:bg-blue-50/40 transition-colors group">
                          <td className="py-[0.65vw] px-[1vw] text-center text-[0.81vw] font-medium text-slate-500 border-r border-slate-200">
                            {idx + 1}
                          </td>
                          <td className="py-[0.65vw] px-[1.2vw] border-r border-slate-200">
                            <div className="flex items-center gap-[0.4vw]">
                              <span className="text-[0.85vw] font-bold text-slate-800">{zone.name}</span>
                              <span className="relative group/ztip inline-flex items-center shrink-0">
                                <AlertCircle className="w-[0.9vw] h-[0.9vw] text-slate-400 hover:text-blue-600 transition-colors" />
                                <span className="pointer-events-none opacity-0 invisible group-hover/ztip:opacity-100 group-hover/ztip:visible transition-all duration-150 absolute bottom-full left-1/2 -translate-x-1/2 mb-[0.35vw] px-[0.6vw] py-[0.3vw] rounded-[0.35vw] bg-slate-900 text-white text-[0.74vw] whitespace-nowrap shadow-md z-50">
                                  {zone.description || "No description"}
                                  <span className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900" />
                                </span>
                              </span>
                            </div>
                          </td>
                          <td className="py-[0.65vw] px-[1.2vw] border-r border-slate-200">
                            {(() => {
                              const empCount = zoneMappings.filter(m => m.zone === zone.name).length;
                              return (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAssignedZoneFilter(zone.name);
                                    setAssignSubTab("view");
                                    setActiveTab("assign");
                                  }}
                                  className="inline-flex items-center gap-[0.35vw] text-[0.76vw] font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 px-[0.6vw] py-[0.15vw] rounded border border-indigo-200 transition-colors cursor-pointer"
                                >
                                  <span>{empCount} {empCount === 1 ? "Employee" : "Employees"}</span>
                                  <ChevronRight className="w-[0.7vw] h-[0.7vw]" />
                                </button>
                              );
                            })()}
                          </td>
                          <td className="py-[0.65vw] px-[1.2vw] border-r border-slate-200">
                            <button
                              onClick={() => {
                                setSelectedZoneForRoles(zone.name);
                                setActiveTab("roles");
                              }}
                              className="inline-flex items-center gap-[0.35vw] text-[0.76vw] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-[0.6vw] py-[0.15vw] rounded border border-blue-200 transition-colors cursor-pointer"
                            >
                              <span>{zoneRoleList.length} Station Roles</span>
                              <ChevronRight className="w-[0.7vw] h-[0.7vw]" />
                            </button>
                          </td>
                          <td className="py-[0.65vw] px-[1.2vw] border-r border-slate-200">
                            <span className="inline-flex items-center gap-[0.3vw] px-[0.6vw] py-[0.15vw] rounded-full text-[0.76vw] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <Star className="w-[0.7vw] h-[0.7vw] fill-emerald-600" />
                              {zone.defaultReceiverRole || "Manual Testing"}
                            </span>
                          </td>
                          <td className="py-[0.65vw] px-[1vw] text-center">
                            <div className="flex items-center justify-center gap-[0.4vw]">
                              <button
                                onClick={() => openEditZoneModal(zone)}
                                className="p-[0.35vw] text-blue-600 hover:bg-blue-100 rounded-[0.3vw] transition-all cursor-pointer"
                                title="Edit Zone"
                              >
                                <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                              <button
                                onClick={() => handleDeleteZone(zone)}
                                className="p-[0.35vw] text-rose-600 hover:bg-rose-100 rounded-[0.3vw] transition-all cursor-pointer"
                                title="Delete Zone"
                              >
                                <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
              <span>Showing {filteredZones.length} of {zones.length} zone(s)</span>
              <span>Click "Station Roles" on any zone to customize roles specific to that zone</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB: PER-ZONE ROLES CUSTOMIZATION                          */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "roles" && (
        <div className="flex-1 p-[1.5vw] flex gap-[1.2vw] overflow-hidden">
          {/* Left Panel: Zone Selection & Add Role */}
          <div className="w-[25vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs p-[1.2vw] flex flex-col justify-between">
            <div className="space-y-[1.2vw]">
              <div>
                <h3 className="text-[1vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                  <Briefcase className="w-[1vw] h-[1vw] text-blue-600" />
                  Customize Zone Roles
                </h3>
                <p className="text-[0.77vw] text-slate-500 font-medium mt-[0.2vw]">
                  Configure unique stations & roles independently for each zone.
                </p>
              </div>

              {/* Select Active Zone */}
              <div className="space-y-[0.35vw]">
                <label className="text-[0.8vw] font-semibold text-slate-700 uppercase tracking-wider">
                  Select Zone to Configure <span className="text-red-500">*</span>
                </label>
                {zones.length === 0 ? (
                  <div className="p-[0.6vw] bg-amber-50 border border-amber-200 rounded-[0.4vw] text-[0.78vw] text-amber-800">
                    No zones found. Please create a zone first in the <strong>Zones</strong> tab.
                  </div>
                ) : (
                  <CustomDropdown
                    value={selectedZoneForRoles}
                    onChange={(val) => {
                      setSelectedZoneForRoles(val);
                      setEditingRoleIdx(null);
                    }}
                    options={zoneDropdownOptions}
                    placeholder="Choose Zone..."
                    usePortal={true}
                    maxHeight="14vw"
                    triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-bold text-blue-800 bg-blue-50/50 border-blue-200"
                  />
                )}
              </div>

              {/* Add New Station/Role to this Zone */}
              {activeZoneObjForRoles && (
                <form onSubmit={handleAddRoleToZone} className="space-y-[0.6vw] pt-[0.4vw] border-t border-slate-200">
                  <label className="text-[0.8vw] font-semibold text-slate-700 uppercase tracking-wider">
                    Add Station / Role to {activeZoneObjForRoles.name}
                  </label>
                  <div className="flex gap-[0.4vw]">
                    <input
                      type="text"
                      placeholder="e.g. Wave Soldering, SMD Inspection..."
                      value={newRoleInput}
                      onChange={(e) => setNewRoleInput(e.target.value)}
                      className="flex-1 px-[0.7vw] py-[0.4vw] bg-slate-50 border border-slate-300 rounded-[0.4vw] text-[0.81vw] outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                    />
                    <button
                      type="submit"
                      disabled={isUpdatingZoneRoles || !newRoleInput.trim()}
                      className="px-[0.9vw] py-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.8vw] font-semibold transition-all disabled:opacity-50 cursor-pointer flex items-center gap-[0.2vw]"
                    >
                      <Plus className="w-[0.8vw] h-[0.8vw]" />
                      Add
                    </button>
                  </div>
                </form>
              )}

              {/* Info Card */}
              {activeZoneObjForRoles && (
                <div className="bg-slate-50 border border-slate-200 rounded-[0.5vw] p-[0.65vw] flex items-center justify-between text-[0.78vw]">
                  <span className="font-semibold text-slate-600">Default Intake:</span>
                  <span className="font-bold text-emerald-700 bg-emerald-50 px-[0.5vw] py-[0.1vw] rounded border border-emerald-200">
                    {activeZoneObjForRoles.defaultReceiverRole || "Manual Testing"}
                  </span>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                setSelectedZone(selectedZoneForRoles);
                setActiveTab("assign");
              }}
              className="w-full py-[0.45vw] rounded-[0.45vw] bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 text-[0.81vw] font-medium transition-all"
            >
              Assign Employees to {selectedZoneForRoles || "Zone"} →
            </button>
          </div>

          {/* Right Panel: Role List for Selected Zone */}
          <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
            <div className="p-[0.9vw] border-b border-slate-200 bg-slate-50/70 flex items-center justify-between">
              <div>
                <h4 className="text-[0.9vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                  <MapPin className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                  Stations / Roles for: <span className="text-blue-700">{activeZoneObjForRoles?.name || "None Selected"}</span>
                </h4>
                <p className="text-[0.74vw] text-slate-500">
                  Total {(activeZoneObjForRoles?.roles || DEFAULT_STATION_ROLES).length} station roles configured for this zone
                </p>
              </div>

              <div className="text-[0.75vw] text-slate-500 font-medium">
                ★ = Default Intake Role for Cross-Zone Tickets
              </div>
            </div>

            <div className="flex-1 overflow-auto divide-y divide-slate-100 p-[0.6vw]">
              {!activeZoneObjForRoles ? (
                <div className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                  Please select a zone to view and customize its roles.
                </div>
              ) : (
                <div className="space-y-[0.4vw]">
                  {(activeZoneObjForRoles.roles || DEFAULT_STATION_ROLES).map((role, idx) => {
                    const isDefault = activeZoneObjForRoles.defaultReceiverRole === role;
                    const assignedStaffCount = zoneMappings.filter(m => m.zone === activeZoneObjForRoles.name && (m.roleInZone || "").trim() === role).length;
                    const isEditingThis = editingRoleIdx === idx;

                    return (
                      <div
                        key={`${role}-${idx}`}
                        className={`p-[0.75vw] rounded-[0.45vw] border flex items-center justify-between transition-all ${
                          isDefault ? "bg-emerald-50/40 border-emerald-200" : "bg-white border-slate-200 hover:bg-slate-50/70"
                        }`}
                      >
                        {isEditingThis ? (
                          <div className="flex items-center gap-[0.4vw] flex-1 mr-[0.8vw]">
                            <input
                              type="text"
                              value={editingRoleVal}
                              onChange={(e) => setEditingRoleVal(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleUpdateRoleInZone(role, editingRoleVal);
                                if (e.key === "Escape") setEditingRoleIdx(null);
                              }}
                              autoFocus
                              className="flex-1 px-[0.6vw] py-[0.25vw] bg-white border border-blue-400 rounded-[0.3vw] text-[0.81vw] outline-none font-medium"
                            />
                            <button
                              onClick={() => handleUpdateRoleInZone(role, editingRoleVal)}
                              className="px-[0.6vw] py-[0.25vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.3vw] text-[0.75vw] font-semibold"
                            >
                              Save
                            </button>
                            <button
                              onClick={() => setEditingRoleIdx(null)}
                              className="px-[0.5vw] py-[0.25vw] text-slate-500 hover:bg-slate-200 rounded-[0.3vw] text-[0.75vw]"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-[0.6vw]">
                            <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-slate-100 text-slate-700 flex items-center justify-center font-bold text-[0.75vw]">
                              {idx + 1}
                            </div>
                            <div>
                              <div className="text-[0.83vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                                {role}
                                {isDefault && (
                                  <span className="px-[0.4vw] py-[0.05vw] rounded bg-emerald-100 text-emerald-800 text-[0.68vw] font-bold border border-emerald-300">
                                    ★ Default Intake
                                  </span>
                                )}
                              </div>
                              <div className="text-[0.72vw] text-slate-500 font-mono">
                                {assignedStaffCount} staff assigned in {activeZoneObjForRoles.name}
                              </div>
                            </div>
                          </div>
                        )}

                        {!isEditingThis && (
                          <div className="flex items-center gap-[0.4vw]">
                            {!isDefault && (
                              <button
                                onClick={() => handleSetDefaultReceiverRole(role)}
                                className="px-[0.6vw] py-[0.25vw] rounded bg-white hover:bg-emerald-50 text-emerald-700 border border-emerald-300 text-[0.72vw] font-semibold transition-all cursor-pointer"
                                title="Set as Default Intake Role for Cross-Zone tickets"
                              >
                                Set as Intake Lead ★
                              </button>
                            )}
                            <button
                              onClick={() => {
                                setEditingRoleIdx(idx);
                                setEditingRoleVal(role);
                              }}
                              className="p-[0.3vw] text-blue-600 hover:bg-blue-50 rounded-[0.3vw] transition-colors cursor-pointer"
                              title="Edit Role Name"
                            >
                              <Edit3 className="w-[0.85vw] h-[0.85vw]" />
                            </button>
                            <button
                              onClick={() => handleDeleteRoleFromZone(role)}
                              className="p-[0.3vw] text-rose-600 hover:bg-rose-50 rounded-[0.3vw] transition-colors cursor-pointer"
                              title="Delete Role"
                            >
                              <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
              <span>Roles defined here will appear in the "Station / Role" dropdown when assigning staff to {activeZoneObjForRoles?.name || "this zone"}</span>
            </div>
          </div>
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 2: ASSIGN EMPLOYEES TO SPECIFIC ZONES & ROLES         */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "assign" && (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Sub Navigation Bar for Assign Tab */}
          <div className="bg-white border-b border-slate-200 px-[1.5vw] py-[0.6vw] flex items-center justify-between">
            <div className="flex items-center gap-[0.5vw]">
              <button
                onClick={() => setAssignSubTab("assign")}
                className={`flex items-center gap-[0.35vw] px-[0.9vw] py-[0.35vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer ${
                  assignSubTab === "assign"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <UserPlus className="w-[0.85vw] h-[0.85vw]" />
                Assign Employees to Zone & Role
              </button>
              <button
                onClick={() => setAssignSubTab("view")}
                className={`flex items-center gap-[0.35vw] px-[0.9vw] py-[0.35vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer ${
                  assignSubTab === "view"
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "text-slate-600 hover:bg-slate-100"
                }`}
              >
                <Users className="w-[0.85vw] h-[0.85vw]" />
                View Assigned Staff ({zoneMappings.length})
              </button>
            </div>

            <span className="text-[0.75vw] text-slate-500 font-medium">
              Rule: <strong>1 Employee = 1 Zone + Station Role</strong> (Controls cross-zone pickup)
            </span>
          </div>

          {/* Sub Tab: ASSIGN FORM */}
          {assignSubTab === "assign" && (
            <div className="flex-1 p-[1.5vw] flex gap-[1.2vw] overflow-hidden">
              {/* Left Panel: Target Zone & Role Selection */}
              <div className="w-[25vw] bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs p-[1.2vw] flex flex-col justify-between">
                <div className="space-y-[1.1vw]">
                  <div>
                    <h3 className="text-[1vw] font-bold text-slate-800 flex items-center gap-[0.4vw]">
                      <MapPin className="w-[1vw] h-[1vw] text-blue-600" />
                      Zone & Role Assignment
                    </h3>
                    <p className="text-[0.77vw] text-slate-500 font-medium mt-[0.2vw]">
                      Select target zone and specific station role for employees.
                    </p>
                  </div>

                  {/* Target Zone Dropdown */}
                  <div className="space-y-[0.3vw]">
                    <label className="text-[0.8vw] font-semibold text-slate-700 uppercase tracking-wider">
                      Target Zone <span className="text-red-500">*</span>
                    </label>
                    {zones.length === 0 ? (
                      <div className="p-[0.6vw] bg-amber-50 border border-amber-200 rounded-[0.4vw] text-[0.78vw] text-amber-800">
                        No zones exist yet. Please create a zone first in the <strong>Zones</strong> tab.
                      </div>
                    ) : (
                      <CustomDropdown
                        value={selectedZone}
                        onChange={(val) => setSelectedZone(val)}
                        options={zoneDropdownOptions}
                        placeholder="Select Zone..."
                        usePortal={true}
                        maxHeight="14vw"
                        triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-semibold text-slate-800 bg-slate-50 border-slate-300"
                      />
                    )}
                  </div>

                  {/* Station / Role In Zone Dropdown (STRICTLY POPULATED FOR THIS ZONE) */}
                  <div className="space-y-[0.3vw]">
                    <div className="flex items-center justify-between">
                      <label className="text-[0.8vw] font-semibold text-slate-700 uppercase tracking-wider">
                        Station / Role inside {selectedZone || "Zone"} <span className="text-red-500">*</span>
                      </label>
                      <button 
                        type="button" 
                        onClick={() => {
                          setSelectedZoneForRoles(selectedZone);
                          setActiveTab("roles");
                        }} 
                        className="text-[0.72vw] text-blue-600 hover:underline font-semibold flex items-center gap-[0.2vw]"
                      >
                        <Settings className="w-[0.7vw] h-[0.7vw]" />
                        Customize {selectedZone} Roles
                      </button>
                    </div>
                    <CustomDropdown
                      value={selectedRoleInZone}
                      onChange={(val) => setSelectedRoleInZone(val)}
                      options={rolesForAssignZone.map(r => ({ value: r, label: r }))}
                      placeholder="Select Role..."
                      usePortal={true}
                      maxHeight="14vw"
                      triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-semibold text-slate-800 bg-slate-50 border-slate-300"
                    />
                  </div>

                  {/* Default Receiver Checkbox */}
                  <div className="bg-slate-50 border border-slate-200 rounded-[0.45vw] p-[0.7vw] flex items-start gap-[0.5vw]">
                    <input
                      type="checkbox"
                      id="defaultReceiverCheck"
                      checked={isDefaultReceiverCheck}
                      onChange={(e) => setIsDefaultReceiverCheck(e.target.checked)}
                      className="mt-[0.15vw] w-[0.9vw] h-[0.9vw] text-blue-600 rounded cursor-pointer"
                    />
                    <label htmlFor="defaultReceiverCheck" className="text-[0.77vw] text-slate-700 cursor-pointer">
                      <strong>Designated Intake Contact:</strong> Set this employee as primary receiver when cross-zone tickets are sent to <strong>{selectedZone || "this zone"}</strong>.
                    </label>
                  </div>

                  {/* Selected Info Card */}
                  <div className="bg-blue-50/70 border border-blue-200 rounded-[0.5vw] p-[0.65vw] flex items-center justify-between">
                    <span className="text-[0.78vw] font-semibold text-blue-900">Selected:</span>
                    <span className="text-[0.85vw] font-bold text-blue-700 bg-white px-[0.55vw] py-[0.1vw] rounded-full border border-blue-200">
                      {selectedUserIds.length}
                    </span>
                  </div>

                  {/* Selected Chips */}
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
                      <div className="max-h-[10vw] overflow-y-auto border border-slate-200 rounded-[0.4vw] p-[0.4vw] flex flex-wrap gap-[0.3vw] bg-slate-50/50">
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

                {/* Bottom Action */}
                <div className="pt-[1vw] border-t border-slate-200 flex flex-col gap-[0.6vw]">
                  <button
                    type="button"
                    onClick={handleBatchAssign}
                    disabled={isSavingAssignment || selectedUserIds.length === 0 || !selectedZone || !selectedRoleInZone}
                    className="w-full py-[0.6vw] rounded-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white text-[0.85vw] font-semibold shadow-xs hover:shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-[0.4vw]"
                  >
                    <Check className="w-[0.9vw] h-[0.9vw]" />
                    {isSavingAssignment ? "Saving..." : `Assign (${selectedUserIds.length}) to ${selectedZone}`}
                  </button>
                  <button
                    type="button"
                    onClick={() => setAssignSubTab("view")}
                    className="w-full py-[0.45vw] rounded-[0.45vw] border border-slate-300 text-slate-600 hover:bg-slate-100 text-[0.81vw] font-medium transition-all"
                  >
                    View Assigned Staff ({zoneMappings.length})
                  </button>
                </div>
              </div>

              {/* Right Panel: Employee Directory */}
              <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
                <div className="p-[0.9vw] border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-[1vw]">
                  <div className="flex items-center gap-[0.8vw] flex-1">
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

                {/* Employees Grid */}
                <div className="flex-1 overflow-auto divide-y divide-slate-100">
                  {assignableEmployees.length === 0 ? (
                    <div className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                      No employees found matching filter
                    </div>
                  ) : (
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-50 sticky top-0 z-10 border-b border-slate-300 text-[0.82vw] font-bold text-slate-600 uppercase tracking-wider">
                        <tr>
                          <th className="py-[0.65vw] px-[0.8vw] w-[2.8vw] border-r border-slate-200"></th>
                          <th className="py-[0.65vw] px-[0.9vw] border-r border-slate-200">Employee</th>
                          <th className="py-[0.65vw] px-[0.9vw] border-r border-slate-200">ID</th>
                          <th className="py-[0.65vw] px-[0.9vw] border-r border-slate-200">Department</th>
                          <th className="py-[0.65vw] px-[0.9vw] border-r border-slate-200">Zone</th>
                          <th className="py-[0.65vw] px-[0.9vw]">Station Role</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-[0.88vw]">
                        {assignableEmployees.map(emp => {
                          const uid = emp.userId || emp._id;
                          const isSelected = selectedUserIds.includes(uid);
                          const existingMapping = zoneMappings.find(m => m.userId === uid);

                          return (
                            <tr
                              key={uid}
                              onClick={() => toggleEmployeeSelect(uid)}
                              className={`cursor-pointer transition-colors ${
                                isSelected ? "bg-blue-50/70" : "hover:bg-slate-50/80"
                              }`}
                            >
                              <td className="py-[0.6vw] px-[0.8vw] border-r border-slate-200">
                                <div className={`w-[1.15vw] h-[1.15vw] rounded-[0.25vw] border flex items-center justify-center transition-all ${
                                  isSelected ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                                }`}>
                                  {isSelected && <Check className="w-[0.8vw] h-[0.8vw] stroke-[3]" />}
                                </div>
                              </td>
                              <td className="py-[0.6vw] px-[0.9vw] font-semibold text-slate-800 border-r border-slate-200">{emp.name}</td>
                              <td className="py-[0.6vw] px-[0.9vw] font-mono text-[0.84vw] text-slate-600 border-r border-slate-200">{uid}</td>
                              <td className="py-[0.6vw] px-[0.9vw] text-[0.84vw] text-slate-600 border-r border-slate-200">{emp.department || "—"}</td>
                              <td className="py-[0.6vw] px-[0.9vw] border-r border-slate-200">
                                {existingMapping ? (
                                  <span className="text-[0.78vw] font-semibold px-[0.55vw] py-[0.12vw] rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                                    {existingMapping.zone}
                                  </span>
                                ) : (
                                  <span className="text-[0.78vw] text-slate-400">Unassigned</span>
                                )}
                              </td>
                              <td className="py-[0.6vw] px-[0.9vw]">
                                {existingMapping ? (
                                  <div className="inline-flex items-center gap-[0.3vw]">
                                    <span className="text-[0.78vw] font-medium px-[0.5vw] py-[0.12vw] rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                                      {existingMapping.roleInZone || "Manual Testing"}
                                    </span>
                                    {existingMapping.isDefaultReceiver && (
                                      <span title="Designated Intake Lead" className="text-[0.8vw] text-amber-600 font-bold">★</span>
                                    )}
                                  </div>
                                ) : (
                                  <span className="text-[0.78vw] text-slate-400">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
                  <span>Showing {assignableEmployees.length} employee(s)</span>
                  <span>{selectedUserIds.length} currently selected</span>
                </div>
              </div>
            </div>
          )}

          {/* Sub Tab: VIEW ASSIGNED EMPLOYEES TABLE */}
          {assignSubTab === "view" && (
            <div className="flex-1 p-[1.5vw] flex flex-col gap-[1vw] overflow-hidden">
              <div className="bg-white border border-slate-200 rounded-[0.6vw] p-[0.9vw] shadow-2xs flex items-center justify-between gap-[1vw]">
                <div className="flex items-center gap-[0.8vw] flex-1">
                  <div className="relative w-[18vw]">
                    <Search className="w-[0.9vw] h-[0.9vw] absolute left-[0.7vw] top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search employee, zone, role..."
                      value={assignedSearch}
                      onChange={(e) => setAssignedSearch(e.target.value)}
                      className="w-full pl-[2.2vw] pr-[0.8vw] py-[0.4vw] bg-slate-50 border border-slate-200 rounded-[0.4vw] text-[0.81vw] text-slate-800 placeholder-slate-400 outline-none focus:border-blue-500 focus:bg-white transition-all"
                    />
                    {assignedSearch && (
                      <button onClick={() => setAssignedSearch("")} className="absolute right-[0.6vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                        <X className="w-[0.8vw] h-[0.8vw]" />
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-[0.4vw]">
                    <span className="text-[0.78vw] font-semibold text-slate-500 uppercase tracking-wider">Zone:</span>
                    <div className="w-[11vw]">
                      <CustomDropdown
                        value={assignedZoneFilter}
                        onChange={(val) => setAssignedZoneFilter(val)}
                        options={[{ value: "All", label: "All Zones" }, ...zones.map(z => ({ value: z.name, label: z.name }))]}
                        size="sm"
                        triggerClassName="!py-[0.35vw] !h-[2.1vw] !rounded-[0.4vw] text-[0.81vw] font-medium bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-[0.4vw]">
                    <span className="text-[0.78vw] font-semibold text-slate-500 uppercase tracking-wider">Role:</span>
                    <div className="w-[11vw]">
                      <CustomDropdown
                        value={assignedRoleFilter}
                        onChange={(val) => setAssignedRoleFilter(val)}
                        options={[{ value: "All", label: "All Roles" }, ...allDistinctRoles.map(r => ({ value: r, label: r }))]}
                        size="sm"
                        triggerClassName="!py-[0.35vw] !h-[2.1vw] !rounded-[0.4vw] text-[0.81vw] font-medium bg-slate-50 border-slate-200"
                      />
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-[1vw]">
                  <button
                    onClick={() => setAssignSubTab("assign")}
                    className="flex items-center gap-[0.35vw] px-[0.9vw] py-[0.4vw] bg-blue-600 hover:bg-blue-700 text-white rounded-[0.4vw] text-[0.81vw] font-semibold transition-all shadow-xs cursor-pointer"
                  >
                    <UserPlus className="w-[0.85vw] h-[0.85vw]" />
                    + Assign More Employees
                  </button>
                  <div className="h-[2vw] w-[1px] bg-slate-200" />
                  <div className="text-right">
                    <div className="text-[0.7vw] font-semibold uppercase text-slate-400">Total Staff</div>
                    <div className="text-[1.05vw] font-bold text-blue-600">{zoneMappings.length}</div>
                  </div>
                </div>
              </div>

              {/* Table */}
              <div className="flex-1 bg-white border border-slate-200 rounded-[0.6vw] shadow-2xs overflow-hidden flex flex-col">
                <div className="flex-1 overflow-auto">
                  <table className="w-full border-collapse text-left">
                    <thead>
                      <tr className="bg-[#E9EDF7] border-b border-slate-300 sticky top-0 z-20">
                        <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[4vw] text-center border-r border-slate-300">#</th>
                        <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[18vw] border-r border-slate-300">Employee</th>
                        <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[9vw] border-r border-slate-300">Employee ID</th>
                        <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[11vw] border-r border-slate-300">Department</th>
                        <th className="py-[0.6vw] px-[1.2vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[14vw] border-r border-slate-300">Station / Role</th>
                        <th className="py-[0.6vw] px-[1vw] text-[0.78vw] font-bold text-slate-700 uppercase tracking-wider w-[8vw] text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {isLoading ? (
                        <tr>
                          <td colSpan={7} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                            <RefreshCw className="w-[1.4vw] h-[1.4vw] animate-spin mx-auto mb-[0.5vw] text-blue-500" />
                            Loading assigned staff...
                          </td>
                        </tr>
                      ) : filteredAssignedMappings.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-[4vw] text-center text-slate-400 text-[0.85vw]">
                            <AlertCircle className="w-[1.6vw] h-[1.6vw] mx-auto mb-[0.4vw] text-slate-300" />
                            No employee zone assignments found.
                          </td>
                        </tr>
                      ) : (
                        Object.entries(
                          filteredAssignedMappings.reduce((acc, m) => {
                            const z = m.zone || "Unassigned";
                            if (!acc[z]) acc[z] = [];
                            acc[z].push(m);
                            return acc;
                          }, {})
                        ).map(([zoneName, zoneStaff]) => (
                          <React.Fragment key={zoneName}>
                            <tr className="bg-blue-50/95 border-y border-blue-200 sticky top-[2.3vw] z-10 shadow-2xs">
                              <td colSpan={6} className="py-[0.45vw] px-[1.2vw]">
                                <div className="flex items-center justify-between">
                                  <span className="inline-flex items-center gap-[0.35vw] text-[0.82vw] font-bold text-blue-800">
                                    <MapPin className="w-[0.85vw] h-[0.85vw] text-blue-600" />
                                    {zoneName}
                                  </span>
                                  <span className="text-[0.72vw] font-semibold text-blue-700 bg-white px-[0.5vw] py-[0.05vw] rounded-full border border-blue-200">
                                    {zoneStaff.length} staff
                                  </span>
                                </div>
                              </td>
                            </tr>
                            {zoneStaff.map((m, idx) => (
                          <tr key={m._id} className="hover:bg-blue-50/40 transition-colors group">
                            <td className="py-[0.6vw] px-[1vw] text-center text-[0.81vw] font-medium text-slate-500 border-r border-slate-200">
                              {idx + 1}
                            </td>
                            <td className="py-[0.6vw] px-[1.2vw] border-r border-slate-200">
                              <div className="flex items-center gap-[0.6vw]">
                                <div className="w-[1.8vw] h-[1.8vw] rounded-full bg-blue-100 text-blue-700 font-bold text-[0.75vw] flex items-center justify-center">
                                  {(m.userName || "U")[0]?.toUpperCase()}
                                </div>
                                <div>
                                  <div className="text-[0.83vw] font-semibold text-slate-800 flex items-center gap-[0.3vw]">
                                    {m.userName}
                                    {m.isDefaultReceiver && (
                                      <span title="Default Intake Lead for Cross-Zone NC" className="px-[0.35vw] py-[0.05vw] rounded bg-amber-100 text-amber-800 text-[0.68vw] font-bold border border-amber-300">
                                        ★ Receiver Lead
                                      </span>
                                    )}
                                  </div>
                                  {m.userEmail && <div className="text-[0.71vw] text-slate-400">{m.userEmail}</div>}
                                </div>
                              </div>
                            </td>
                            <td className="py-[0.6vw] px-[1.2vw] text-[0.81vw] font-mono text-slate-600 font-medium border-r border-slate-200">
                              {m.userId}
                            </td>
                            <td className="py-[0.6vw] px-[1.2vw] text-[0.81vw] text-slate-600 border-r border-slate-200">
                              {m.department || "—"}
                            </td>
                            <td className="py-[0.6vw] px-[1.2vw] border-r border-slate-200">
                              <span className="inline-flex items-center gap-[0.3vw] px-[0.65vw] py-[0.15vw] rounded-full text-[0.78vw] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                <CheckCircle2 className="w-[0.7vw] h-[0.7vw]" />
                                {m.roleInZone || "Manual Testing"}
                              </span>
                            </td>
                            <td className="py-[0.6vw] px-[1vw] text-center">
                              <div className="flex items-center justify-center gap-[0.4vw]">
                                <button
                                  onClick={() => {
                                    setEditingAssignment(m);
                                    setEditSelectedZone(m.zone);
                                    setEditSelectedRole(m.roleInZone || "Manual Testing");
                                    setEditIsDefaultReceiver(Boolean(m.isDefaultReceiver));
                                  }}
                                  className="p-[0.35vw] text-blue-600 hover:bg-blue-100 rounded-[0.3vw] transition-all cursor-pointer"
                                  title="Edit Assignment"
                                >
                                  <Edit3 className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                                <button
                                  onClick={() => handleDeleteAssignment(m._id, m.userName)}
                                  className="p-[0.35vw] text-rose-600 hover:bg-rose-100 rounded-[0.3vw] transition-all cursor-pointer"
                                  title="Remove Assignment"
                                >
                                  <Trash2 className="w-[0.9vw] h-[0.9vw]" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                          </React.Fragment>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="bg-slate-50 border-t border-slate-200 px-[1.2vw] py-[0.55vw] flex items-center justify-between text-[0.78vw] text-slate-500 font-medium">
                  <span>Showing {filteredAssignedMappings.length} of {zoneMappings.length} employee mapping(s)</span>
                  <span>Employees can be assigned to exactly 1 zone & role</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ────────────────────────────────────────────────────────── */}
      {/* TAB 3: INSIDE MASTER (EMPTY / PLACEHOLDER FOR NOW)        */}
      {/* ────────────────────────────────────────────────────────── */}
      {activeTab === "master" && (
        <div className="flex-1 p-[2vw] flex items-center justify-center">
          <div className="bg-white border border-slate-200 rounded-[0.8vw] p-[3vw] max-w-[32vw] text-center shadow-sm space-y-[1vw]">
            <div className="w-[4vw] h-[4vw] rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400">
              <Database className="w-[2vw] h-[2vw]" />
            </div>
            <div>
              <h3 className="text-[1.1vw] font-bold text-slate-800">Inside Master</h3>
              <p className="text-[0.82vw] text-slate-500 mt-[0.3vw] leading-relaxed">
                This section is reserved for future production master configurations. It will be updated soon.
              </p>
            </div>
            <div className="pt-[0.5vw]">
              <span className="inline-flex items-center gap-[0.4vw] px-[0.8vw] py-[0.25vw] rounded-full bg-slate-100 text-slate-600 text-[0.75vw] font-medium border border-slate-200">
                Coming soon
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── MODAL: CREATE / EDIT ZONE ── */}
      {isZoneModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[30vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-[1.2vw] py-[0.9vw] flex items-center justify-between text-white">
              <div className="flex items-center gap-[0.5vw]">
                <MapPin className="w-[1.1vw] h-[1.1vw]" />
                <h3 className="text-[1vw] font-bold">
                  {editingZone ? `Edit Zone: ${editingZone.name}` : "Create New Zone"}
                </h3>
              </div>
              <button 
                onClick={() => setIsZoneModalOpen(false)}
                className="text-white/80 hover:text-white p-[0.2vw] rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-[1.1vw] h-[1.1vw]" />
              </button>
            </div>

            <form onSubmit={handleSaveZone} className="p-[1.4vw] space-y-[1.2vw]">
              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-700 uppercase tracking-wider">
                  Zone Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Zone A, SMD Area, Assembly Line 1..."
                  value={zoneForm.name}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  autoFocus
                  className="w-full px-[0.8vw] py-[0.45vw] bg-slate-50 border border-slate-300 rounded-[0.45vw] text-[0.83vw] outline-none focus:border-blue-500 focus:bg-white transition-all font-medium"
                />
              </div>

              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-700 uppercase tracking-wider">
                  Description <span className="text-slate-400 font-normal lowercase">(optional)</span>
                </label>
                <textarea
                  rows={3}
                  placeholder="Optional details or description for this zone..."
                  value={zoneForm.description}
                  onChange={(e) => setZoneForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-[0.8vw] py-[0.45vw] bg-slate-50 border border-slate-300 rounded-[0.45vw] text-[0.83vw] outline-none focus:border-blue-500 focus:bg-white transition-all resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-[0.6vw] pt-[0.6vw] border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsZoneModalOpen(false)}
                  className="px-[1vw] py-[0.45vw] rounded-[0.45vw] border border-slate-300 text-slate-600 hover:bg-slate-100 text-[0.81vw] font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingZone}
                  className="px-[1.2vw] py-[0.45vw] rounded-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white text-[0.81vw] font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSavingZone ? "Saving..." : editingZone ? "Update Zone" : "Create Zone"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── MODAL: EDIT SINGLE EMPLOYEE ZONE ASSIGNMENT ── */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px] flex items-center justify-center p-[1vw]">
          <div className="bg-white rounded-[0.8vw] shadow-2xl border border-slate-200 w-[28vw] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-[1.2vw] py-[0.9vw] flex items-center justify-between text-white">
              <div className="flex items-center gap-[0.5vw]">
                <Edit3 className="w-[1.1vw] h-[1.1vw]" />
                <h3 className="text-[1vw] font-bold">Edit Staff Zone & Role</h3>
              </div>
              <button 
                onClick={() => setEditingAssignment(null)}
                className="text-white/80 hover:text-white p-[0.2vw] rounded-full hover:bg-white/10 transition-colors"
              >
                <X className="w-[1.1vw] h-[1.1vw]" />
              </button>
            </div>

            <form onSubmit={handleSaveEditAssignment} className="p-[1.4vw] space-y-[1.1vw]">
              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-500 uppercase">Employee</label>
                <div className="p-[0.6vw] bg-slate-100 border border-slate-200 rounded-[0.4vw] flex items-center justify-between">
                  <span className="text-[0.83vw] font-bold text-slate-800">{editingAssignment.userName}</span>
                  <span className="text-[0.75vw] text-slate-500 font-mono">({editingAssignment.userId})</span>
                </div>
              </div>

              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-700 uppercase">Target Zone</label>
                <CustomDropdown
                  value={editSelectedZone}
                  onChange={(val) => {
                    setEditSelectedZone(val);
                    const targetZoneRoles = zones.find(z => z.name === val)?.roles || DEFAULT_STATION_ROLES;
                    if (targetZoneRoles.length > 0 && !targetZoneRoles.includes(editSelectedRole)) {
                      setEditSelectedRole(targetZoneRoles[0]);
                    }
                  }}
                  options={zoneDropdownOptions}
                  placeholder="Select Zone..."
                  usePortal={true}
                  maxHeight="12vw"
                  triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-medium"
                />
              </div>

              <div className="space-y-[0.3vw]">
                <label className="text-[0.78vw] font-semibold text-slate-700 uppercase">Station / Role In {editSelectedZone || "Zone"}</label>
                <CustomDropdown
                  value={editSelectedRole}
                  onChange={(val) => setEditSelectedRole(val)}
                  options={rolesForEditModalZone.map(r => ({ value: r, label: r }))}
                  placeholder="Select Role..."
                  usePortal={true}
                  maxHeight="12vw"
                  triggerClassName="!py-[0.45vw] !h-[2.3vw] !rounded-[0.45vw] text-[0.83vw] font-medium"
                />
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-[0.45vw] p-[0.6vw] flex items-start gap-[0.5vw]">
                <input
                  type="checkbox"
                  id="editDefaultReceiverCheck"
                  checked={editIsDefaultReceiver}
                  onChange={(e) => setEditIsDefaultReceiver(e.target.checked)}
                  className="mt-[0.15vw] w-[0.9vw] h-[0.9vw] text-blue-600 rounded cursor-pointer"
                />
                <label htmlFor="editDefaultReceiverCheck" className="text-[0.77vw] text-slate-700 cursor-pointer">
                  <strong>Designated Receiver:</strong> Primary contact for incoming cross-zone NCs.
                </label>
              </div>

              <div className="flex items-center justify-end gap-[0.6vw] pt-[0.6vw] border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-[1vw] py-[0.45vw] rounded-[0.45vw] border border-slate-300 text-slate-600 hover:bg-slate-100 text-[0.81vw] font-medium transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-[1.2vw] py-[0.45vw] rounded-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white text-[0.81vw] font-semibold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  Update Staff
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProductionMaster;
