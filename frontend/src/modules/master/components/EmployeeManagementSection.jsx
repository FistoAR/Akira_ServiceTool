import { Icon } from "@iconify/react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import CustomDropdown from "../../../components/CustomDropdown";
import useModulePermissions from "../../../components/useModulePermissions";
import {
  Settings, Plus, X, ChevronUp, ChevronDown, ChevronLeft, ChevronRight,
  ArrowRight, AlertTriangle, Save, RotateCcw, Shield, Users, User,
  GripVertical, Info, CheckCircle, PhoneCall, UserCheck, Search, Tag,
  Edit2, Trash2, Check, Tags, HelpCircle, Columns, Eye, EyeOff, Clock,
  Wrench, Package, Mail, Calendar, Briefcase, Lock, ShieldCheck, ArrowLeft,
  Phone, Image as ImageIcon, IndianRupee, Activity, UserPlus, Loader2,
  MapPin, RefreshCw, UploadCloud
} from "lucide-react";
import {
  API_URL, DEFAULT_DEPTS, TYPE_BADGE_COLORS, TYPE_COLORS, LEVEL_COLORS,
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS
} from "./masterConstants";

const DepartmentMasterModal = ({ isOpen, onClose, departments, onSave }) => {
  const [localDepts, setLocalDepts] = useState([]);
  const [newDept, setNewDept] = useState("");
  const { toast, confirm } = useNotification();

  useEffect(() => {
    if (isOpen) setLocalDepts([...departments]);
  }, [isOpen, departments]);

  const handleAdd = () => {
    if (!newDept.trim()) return;
    if (localDepts.includes(newDept.trim())) {
      toast("Department already exists", "warning");
      return;
    }
    setLocalDepts([...localDepts, newDept.trim()]);
    setNewDept("");
  };

  const handleRemove = async (dept) => {
    const ok = await confirm({
      title: "Remove Department",
      message: `Are you sure you want to remove "${dept}"?`,
      type: "danger"
    });
    if (ok) {
      setLocalDepts(localDepts.filter(d => d !== dept));
    }
  };

  const handleSave = () => {
    onSave(localDepts);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-[2vw]">
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-200 w-full max-w-[28vw] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="px-[1.2vw] py-[0.9vw] border-b border-gray-200 flex items-center justify-between bg-slate-50/70">
          <h3 className="text-[0.92vw] font-bold text-gray-900 flex items-center gap-[0.5vw]">
            <Briefcase className="w-[1vw] h-[1vw] text-blue-600" />
            Manage Departments
          </h3>
          <button onClick={onClose} className="p-[0.35vw] hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700 cursor-pointer"><X className="w-[1vw] h-[1vw]" /></button>
        </div>

        <div className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto">
          <div className="flex gap-[0.5vw]">
            <input 
              type="text" 
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Enter department name..."
              className="flex-1 border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="bg-blue-600 text-white px-[0.9vw] rounded-[0.4vw] hover:bg-blue-700 transition-colors cursor-pointer flex items-center justify-center"><Plus className="w-[1vw] h-[1vw]" /></button>
          </div>

          <div className="flex flex-col gap-[0.4vw]">
            {localDepts.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between px-[0.7vw] py-[0.5vw] bg-gray-50 border border-gray-200 rounded-[0.4vw] hover:bg-blue-50/40 hover:border-blue-200 transition-colors group">
                <span className="text-[0.8vw] font-medium text-gray-700">{dept}</span>
                <button onClick={() => handleRemove(dept)} className="text-gray-400 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-all cursor-pointer"><Trash2 className="w-[0.85vw] h-[0.85vw]" /></button>
              </div>
            ))}
            {localDepts.length === 0 && <p className="text-center text-gray-400 py-[2vw] text-[0.78vw]">No departments defined</p>}
          </div>
        </div>

        <div className="px-[1.2vw] py-[0.8vw] border-t border-gray-200 bg-slate-50/70 flex justify-end gap-[0.6vw]">
          <button onClick={onClose} className="px-[1vw] py-[0.45vw] text-gray-600 hover:bg-gray-200/60 rounded-[0.4vw] text-[0.8vw] font-semibold transition-colors cursor-pointer">Cancel</button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-[1.1vw] py-[0.45vw] rounded-[0.4vw] text-[0.8vw] font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer">Save Changes</button>
        </div>
      </motion.div>
    </div>
  );
};

const EmployeeManagementSection = ({ employees, setEmployees, departments, setDepartments }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("employees");
  const navigate = useNavigate();
  const [, setSearchParams] = useSearchParams();
  const ITEMS_PER_PAGE = 10;
  const [currentPage, setCurrentPage] = useState(1);
  const [showRegModal, setShowRegModal] = useState(false);
  const [showDeptModal, setShowDeptModal] = useState(false);
  const [editingEmp, setEditingEmp] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast, confirm } = useNotification();

  const currentLoggedInUser = useMemo(() => {
    try {
      return JSON.parse(sessionStorage.getItem("loggedInUser") || localStorage.getItem("loggedInUser") || "null");
    } catch {
      return null;
    }
  }, []);
  const isCurrentRequesterAdmin = currentLoggedInUser?.role === "Admin" || currentLoggedInUser?.department === "Admin";

  // Check if current user has roleAccess edit permissions
  const canEditRoleAccess = useMemo(() => {
    if (isCurrentRequesterAdmin) return true;
    const roleAccessPerm = currentLoggedInUser?.permissions?.roleAccess;
    return !!(roleAccessPerm?.enabled && (roleAccessPerm?.write || roleAccessPerm?.update));
  }, [currentLoggedInUser, isCurrentRequesterAdmin]);

  const [regData, setRegData] = useState({
    name: "", userId: "", email: "", phoneNumber: "", dob: "", gender: "",
    role: "User", department: "", designation: "", ctc: "", dateOfJoining: "",
    workingStatus: "Active", password: "", confirmPassword: "", profilePicture: null
  });

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const fileInputRef = useRef(null);

  const processImageFile = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast("Please upload a valid image file (PNG, JPG, WebP)", "warning");
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast("File size exceeds 2MB limit", "warning");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_SIZE = 180;
        let width = img.width;
        let height = img.height;
        if (width > height) {
          if (width > MAX_SIZE) {
            height = Math.round((height * MAX_SIZE) / width);
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width = Math.round((width * MAX_SIZE) / height);
            height = MAX_SIZE;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        const compressed = canvas.toDataURL("image/webp", 0.8) || canvas.toDataURL("image/jpeg", 0.8);
        setRegData((prev) => ({ ...prev, profilePicture: compressed }));
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const openRegModal = (emp = null) => {
    setShowPassword(false);
    setShowConfirmPassword(false);
    if (emp) {
      setEditingEmp(emp);
      setRegData({
        ...emp,
        password: "", // Don't show password
        confirmPassword: "",
        dob: emp.dob ? new Date(emp.dob).toISOString().split('T')[0] : "",
        dateOfJoining: emp.dateOfJoining ? new Date(emp.dateOfJoining).toISOString().split('T')[0] : "",
      });
    } else {
      setEditingEmp(null);
      setRegData({
        name: "", userId: "", email: "", phoneNumber: "", dob: "", gender: "",
        role: "User", department: "", designation: "", ctc: "", dateOfJoining: "",
        workingStatus: "Active", password: "", confirmPassword: "", profilePicture: null
      });
    }
    setShowRegModal(true);
  };

  const handleDeptSave = async (newList) => {
    try {
      await axios.post(`${API_URL}/master/settings`, { key: "departments", value: newList });
      setDepartments(newList);
      toast("Departments updated successfully");
    } catch (err) {
      toast("Failed to save departments", "error");
    }
  };

  const handleRegSubmit = async (e) => {
    e.preventDefault();
    
    // Check if passwords match (if password is being set or changed)
    if (regData.password || regData.confirmPassword) {
      if (regData.password !== regData.confirmPassword) {
        toast("Passwords do not match", "error");
        return;
      }
    }

    if (regData.ctc && Number(regData.ctc) < 0) {
      toast("CTC cannot be negative", "error");
      return;
    }

    try {
      // Clean up empty dates for Mongoose
      const finalData = { ...regData };
      if (!finalData.dob) delete finalData.dob;
      if (!finalData.dateOfJoining) delete finalData.dateOfJoining;
      if (!finalData.ctc) delete finalData.ctc;
      if (!finalData.password) delete finalData.password;
      if (!finalData.confirmPassword) delete finalData.confirmPassword;

      if (editingEmp) {
        // Update existing
        await axios.put(`${API_URL}/auth/employees/${editingEmp._id || editingEmp.id}`, finalData);
        
        const oldRole = editingEmp.role || "User";
        const newRole = finalData.role || "User";
        const roleChanged = oldRole !== newRole;

        if (roleChanged && canEditRoleAccess) {
          toast(
            <div className="space-y-[0.35vw]">
              <p>
                Employee updated. Role changed from <span className="font-semibold text-gray-700">{oldRole}</span> to <span className="font-bold text-gray-900">{newRole}</span>.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ tab: "role-access", userId: editingEmp.userId });
                }}
                className="inline-flex items-center gap-[0.3vw] text-[0.74vw] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                <Icon icon="solar:shield-user-bold-duotone" className="w-[0.9vw] h-[0.9vw]" />
                Update Role Access permissions for {editingEmp.name} &rarr;
              </button>
            </div>,
            "success",
            8000
          );
        } else {
          toast("Employee updated successfully", "success");
        }
      } else {
        // Register new
        const regRes = await axios.post(`${API_URL}/auth/register`, finalData);
        
        const createdRole = finalData.role || "User";
        const newUserId = finalData.userId;

        // Fetch freshly registered employee list and update sessionStorage immediately
        try {
          const empRes = await axios.get(`${API_URL}/auth/employees`);
          setEmployees(empRes.data);
          sessionStorage.setItem("all_employees", JSON.stringify(empRes.data));
          localStorage.setItem("all_employees", JSON.stringify(empRes.data));
        } catch (refreshErr) {
          console.error("Refresh failed:", refreshErr);
        }

        if (canEditRoleAccess && newUserId) {
          toast(
            <div className="space-y-[0.35vw]">
              <p>
                Employee registered successfully. Default <span className="font-bold text-gray-900">{createdRole}</span> permissions enabled.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchParams({ tab: "role-access", userId: newUserId });
                }}
                className="inline-flex items-center gap-[0.3vw] text-[0.74vw] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
              >
                <Icon icon="solar:shield-user-bold-duotone" className="w-[0.9vw] h-[0.9vw]" />
                To update role access click here &rarr;
              </button>
            </div>,
            "success",
            8000
          );
        } else {
          toast(`Employee registered successfully. Default ${createdRole} permissions enabled.`, "success");
        }
      }
      
      // Full refresh from backend to ensure state consistency
      try {
        const empRes = await axios.get(`${API_URL}/auth/employees`);
        setEmployees(empRes.data);
      } catch (refreshErr) {
        console.error("Refresh failed:", refreshErr);
      }
      
      // Clear states
      setShowRegModal(false);
      setEditingEmp(null);
    } catch (err) {
      console.error("Submit error:", err);
      toast(err.response?.data?.message || "Operation failed", "error");
    }
  };

  // Handle Employee Deletion
  const handleDeleteEmployee = async (emp) => {
    const isTargetAdmin = emp.role === "Admin" || emp.department === "Admin";
    if (isTargetAdmin && !isCurrentRequesterAdmin) {
      toast("Access Denied: Only an Administrator can delete an Admin account.", "error");
      return;
    }

    const confirmed = await confirm({
      title: "Delete Employee",
      message: `Are you sure you want to delete employee "${emp.name} (${emp.userId})"?`,
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Cancel",
    });

    if (!confirmed) return;

    try {
      const token = sessionStorage.getItem("token") || localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const res = await axios.delete(`${API_URL}/auth/employees/${emp._id || emp.id}`, { headers });

      if (res.data?.recordsExist) {
        // Records exist -> User cannot be deleted, offer Inactive option in confirmation dialog
        const setInactiveOk = await confirm({
          title: "Records Exist for Employee",
          message: (
            <div className="space-y-[0.5vw]">
              <p className="text-[0.82vw] text-slate-800">
                Records exist for <span className="font-bold">{emp.name}</span> in the system ({res.data.totalRecordCount} total across Service Call, Material, or Production).
              </p>
              <div className="p-[0.6vw] bg-amber-50 border border-amber-200 rounded-[0.4vw] text-[0.76vw] text-amber-900">
                <span className="font-semibold block mb-[0.2vw]">Cannot permanently delete operational history.</span>
                Would you like to set their status to <span className="font-bold underline text-amber-950">Inactive</span> instead to disable access while preserving records?
              </div>
            </div>
          ),
          type: "warning",
          confirmText: "Set Inactive",
          cancelText: "Cancel",
        });

        if (setInactiveOk) {
          await axios.put(
            `${API_URL}/auth/employees/${emp._id || emp.id}`,
            { workingStatus: "Inactive" },
            { headers }
          );

          // Refresh employee list
          const empRes = await axios.get(`${API_URL}/auth/employees`);
          setEmployees(empRes.data);
          toast(`Employee "${emp.name}" status updated to Inactive.`);
        }
        return;
      }

      // Safe deletion confirmed
      const empRes = await axios.get(`${API_URL}/auth/employees`);
      setEmployees(empRes.data);
      toast("Employee deleted successfully.");
    } catch (err) {
      console.error(err);
      toast(err.response?.data?.message || "Failed to delete employee", "error");
    }
  };

  const filtered = (employees || []).filter(e => 
    e && (
      e.name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      e.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.department?.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);
  const paginatedData = filtered.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="p-[0.8vw] flex flex-col gap-[0.7vw] flex-1 min-h-0 overflow-hidden">
      <div className="flex items-center justify-between gap-[1vw] flex-shrink-0">
        <div className="relative flex-1 max-w-[25vw]">
          <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-gray-400" />
          <input 
            type="text" 
            placeholder="Search employees by name, ID or department..."
            className="w-full pl-[2.4vw] pr-[1vw] py-[0.55vw] border border-gray-300 rounded-[0.5vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] bg-white text-gray-800 placeholder-gray-400 transition-all shadow-none"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-[0.6vw]">
          {canWrite && (
            <button 
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-[0.45vw] border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 px-[1vw] py-[0.55vw] rounded-[0.5vw] font-semibold text-[0.8vw] cursor-pointer transition-all shadow-none"
            >
              <Icon icon="solar:case-round-minimalistic-bold-duotone" className="w-[1vw] h-[1vw] text-gray-500" /> Dept Master
            </button>
          )}
          {canWrite && (
            <button 
              onClick={() => openRegModal()}
              className="flex items-center gap-[0.45vw] bg-blue-600 hover:bg-blue-700 text-white px-[1.1vw] py-[0.55vw] rounded-[0.5vw] font-semibold text-[0.82vw] cursor-pointer transition-all shadow-xs"
            >
              <Icon icon="solar:user-plus-bold-duotone" className="w-[1.05vw] h-[1.05vw]" /> Register Employee
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-[0.6vw] overflow-hidden shadow-none flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-gray-50/90 backdrop-blur-xs">
            <tr className="border-b border-gray-200">
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">S. No.</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">Employee</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">ID</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">Department</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">Designation</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">Role</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider">Status</th>
              <th className="px-[1vw] py-[0.65vw] text-[0.72vw] font-bold text-gray-600 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedData.map((emp, idx) => (
              <tr key={emp._id || idx} className="hover:bg-blue-50/20 transition-colors group">
                <td className="px-[1vw] py-[0.7vw] text-[0.78vw] text-gray-500 font-medium">
                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                </td>
                <td className="px-[1vw] py-[0.7vw]">
                  <div className="flex items-center gap-[0.75vw]">
                    <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-50 border border-blue-200 text-blue-700 font-bold text-[0.85vw] flex items-center justify-center overflow-hidden flex-shrink-0 shadow-2xs">
                      {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[0.82vw] font-bold text-gray-900 truncate">{emp.name}</div>
                      <div className="text-[0.7vw] text-gray-500 truncate">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[1vw] py-[0.7vw] text-[0.8vw] font-semibold text-gray-700">{emp.userId}</td>
                <td className="px-[1vw] py-[0.7vw]">
                  <span className="px-[0.6vw] py-[0.18vw] bg-gray-100 text-gray-700 border border-gray-200 rounded-full text-[0.7vw] font-semibold">
                    {emp.department}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.7vw] text-[0.8vw] text-gray-700 font-medium">{emp.designation}</td>
                <td className="px-[1vw] py-[0.7vw]">
                  <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.7vw] font-bold inline-flex items-center border ${
                    emp.role === "Admin"
                      ? "bg-purple-50 text-purple-700 border-purple-200"
                      : emp.role === "Supervisor"
                      ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                      : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {emp.role || "User"}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.7vw]">
                  <span className={`px-[0.6vw] py-[0.18vw] rounded-full text-[0.7vw] font-bold inline-flex items-center gap-[0.25vw] border ${
                    emp.workingStatus === "Active" 
                      ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                      : "bg-amber-50 text-amber-700 border-amber-200"
                  }`}>
                    <span className={`w-[0.35vw] h-[0.35vw] rounded-full ${emp.workingStatus === "Active" ? "bg-emerald-500" : "bg-amber-500"}`}></span>
                    {emp.workingStatus}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.7vw] text-right">
                  {((emp.role === "Admin" || emp.department === "Admin") && !isCurrentRequesterAdmin) ? (
                    <span className="inline-flex items-center gap-[0.2vw] text-[0.68vw] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-[0.5vw] py-[0.15vw] rounded-full" title="Protected Admin profile">
                      <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[0.75vw] h-[0.75vw]" /> Protected
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-[0.3vw]">
                      {canUpdate && (
                        <button 
                          onClick={() => openRegModal(emp)}
                          className="p-[0.35vw] hover:bg-blue-50 rounded-full transition-colors text-gray-400 hover:text-blue-600 cursor-pointer"
                          title="Edit Employee Details"
                        >
                          <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-[0.35vw] hover:bg-rose-50 rounded-full transition-colors text-gray-400 hover:text-rose-600 cursor-pointer"
                          title="Delete Employee"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" className="w-[0.95vw] h-[0.95vw]" />
                        </button>
                      )}
                      {!canUpdate && !canDelete && (
                        <span className="text-[0.68vw] text-gray-400 italic">View only</span>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        {paginatedData.length === 0 && (
          <div className="p-[4vw] text-center flex flex-col items-center gap-[1vw]">
            <Users className="w-[3vw] h-[3vw] text-gray-200" />
            <p className="text-gray-400 text-[0.85vw]">No employees found matching your search</p>
          </div>
        )}

        {/* Pagination UI */}
        <div className="border-t border-gray-200 px-[1vw] py-[0.6vw] bg-white flex justify-between items-center flex-shrink-0">
          <div className="text-[0.74vw] text-gray-500 font-medium">
            Showing <span className="text-gray-900 font-bold">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="text-gray-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="text-gray-900 font-bold">{filtered.length}</span> employees
          </div>
          <div className="flex items-center gap-[0.6vw]">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-[0.35vw] border border-gray-200 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronLeft className="w-[0.95vw] h-[0.95vw]" />
            </button>
            <div className="flex gap-[0.3vw]">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Basic logic to show only few pages if there are many
                if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                  if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-gray-400 text-[0.75vw]">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-[1.7vw] h-[1.7vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white shadow-2xs" : "bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.35vw] border border-gray-200 rounded-[0.4vw] hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
            >
              <ChevronRight className="w-[0.95vw] h-[0.95vw]" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration & Edit Modal */}
      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-[1.5vw]">
            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.96 }} className="bg-white rounded-[0.8vw] shadow-2xl border border-gray-200 w-full max-w-[50vw] overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="px-[1.4vw] py-[0.9vw] border-b border-gray-200 flex items-center justify-between bg-slate-50/70 flex-shrink-0">
                <div className="flex items-center gap-[0.7vw]">
                  <div className="w-[2vw] h-[2vw] rounded-[0.45vw] bg-blue-600 text-white flex items-center justify-center shadow-xs">
                    {editingEmp ? <Icon icon="solar:user-bold-duotone" className="w-[1.1vw] h-[1.1vw]" /> : <UserPlus className="w-[1.05vw] h-[1.05vw]" />}
                  </div>
                  <div>
                    <h3 className="text-[0.95vw] font-bold text-gray-900 leading-tight">
                      {editingEmp ? "Edit Employee Profile" : "Register New Employee"}
                    </h3>
                    <p className="text-[0.72vw] text-gray-500">
                      {editingEmp ? `Updating profile details for ${editingEmp.name}` : "Create a new user profile and credentials"}
                    </p>
                  </div>
                </div>
                <button 
                  type="button"
                  onClick={() => setShowRegModal(false)} 
                  className="p-[0.35vw] text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors cursor-pointer"
                >
                  <X className="w-[1.05vw] h-[1.05vw]" />
                </button>
              </div>

              {/* Modal Form Body */}
              <form onSubmit={handleRegSubmit} className="flex-1 overflow-y-auto px-[1.4vw] py-[1.2vw] flex flex-col gap-[1.2vw]">
                {/* 1. Personal Details Section */}
                <div className="space-y-[0.8vw]">
                  <div className="flex items-center gap-[0.4vw] pb-[0.35vw] border-b border-gray-200">
                    <User className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                    <span className="text-[0.76vw] font-bold text-gray-800 uppercase tracking-wider">Personal Details</span>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-[1.2vw] gap-y-[0.8vw]">
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Users className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Full Name *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={regData.name} 
                        onChange={e => setRegData({...regData, name: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        placeholder="John Doe" 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <ShieldCheck className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Employee ID *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={regData.userId} 
                        onChange={e => setRegData({...regData, userId: e.target.value})} 
                        disabled={!!editingEmp}
                        className={`w-full border p-[0.55vw] rounded-[0.4vw] outline-none text-[0.82vw] transition-colors ${
                          editingEmp 
                            ? "bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed" 
                            : "border-gray-300 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-gray-900 bg-white placeholder-gray-400"
                        }`}
                        placeholder="EMP001" 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Mail className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Email Address *
                      </label>
                      <input 
                        type="email" 
                        required 
                        value={regData.email} 
                        onChange={e => setRegData({...regData, email: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        placeholder="john@akira.com" 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Phone className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Phone Number
                      </label>
                      <input 
                        type="tel" 
                        value={regData.phoneNumber} 
                        onChange={e => setRegData({...regData, phoneNumber: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        placeholder="+91 ..." 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Calendar className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Date of Birth *
                      </label>
                      <input 
                        type="date" 
                        required 
                        value={regData.dob} 
                        onChange={e => setRegData({...regData, dob: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white transition-colors" 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Users className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Gender *
                      </label>
                      <CustomDropdown
                        options={["Male", "Female", "Other"]}
                        value={regData.gender}
                        onChange={(val) => setRegData({ ...regData, gender: val })}
                        placeholder="Select Gender"
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Professional Details Section */}
                <div className="space-y-[0.8vw]">
                  <div className="flex items-center gap-[0.4vw] pb-[0.35vw] border-b border-gray-200">
                    <Briefcase className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                    <span className="text-[0.76vw] font-bold text-gray-800 uppercase tracking-wider">Professional Details</span>
                  </div>

                  <div className="grid grid-cols-2 gap-x-[1.2vw] gap-y-[0.8vw]">
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Briefcase className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Department *
                      </label>
                      <div className="flex items-center gap-[0.4vw]">
                        <div className="flex-1 min-w-0">
                          <CustomDropdown
                            searchable
                            options={departments}
                            value={regData.department}
                            onChange={(val) => setRegData({ ...regData, department: val })}
                            placeholder="Select Department"
                            size="md"
                          />
                        </div>
                        <button 
                          type="button" 
                          onClick={() => setShowDeptModal(true)} 
                          className="p-[0.55vw] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[0.4vw] transition-colors cursor-pointer border border-gray-200 flex-shrink-0"
                          title="Manage Departments"
                        >
                          <Settings className="w-[0.95vw] h-[0.95vw]" />
                        </button>
                      </div>
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Tag className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Designation *
                      </label>
                      <input 
                        type="text" 
                        required 
                        value={regData.designation} 
                        onChange={e => setRegData({...regData, designation: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        placeholder="Senior Engineer" 
                      />
                    </div>

                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <ShieldCheck className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Role *
                      </label>
                      <CustomDropdown
                        options={isCurrentRequesterAdmin ? ["User", "Supervisor", "Admin"] : ["User", "Supervisor"]}
                        value={regData.role}
                        onChange={(val) => setRegData({ ...regData, role: val })}
                        placeholder="Select Role"
                        size="md"
                        className="w-full"
                      />
                      {/* Notice when role is modified in edit mode */}
                      {editingEmp && regData.role !== (editingEmp.role || "User") && (
                        <p className="text-[0.68vw] text-amber-700 bg-amber-50 border border-amber-200 rounded-[0.3vw] px-[0.45vw] py-[0.2vw] flex items-center gap-[0.25vw] animate-in fade-in">
                          <Icon icon="solar:info-circle-bold" className="w-[0.75vw] h-[0.75vw] text-amber-600 flex-shrink-0" />
                          <span>Role changed from <strong>{editingEmp.role || "User"}</strong> to <strong>{regData.role}</strong>. Update permissions in Role Access after saving.</span>
                        </p>
                      )}
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <IndianRupee className="w-[0.85vw] h-[0.85vw] text-gray-400" /> CTC (Monthly)
                      </label>
                      <input 
                        type="number" 
                        min="0" 
                        value={regData.ctc} 
                        onChange={e => {
                          const val = e.target.value;
                          if (val === "" || Number(val) >= 0) {
                            setRegData({...regData, ctc: val});
                          }
                        }} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        placeholder="Enter monthly CTC" 
                      />
                    </div>

                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Calendar className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Date of Joining *
                      </label>
                      <input 
                        type="date" 
                        required 
                        value={regData.dateOfJoining} 
                        onChange={e => setRegData({...regData, dateOfJoining: e.target.value})} 
                        className="w-full border border-gray-300 p-[0.55vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white transition-colors" 
                      />
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Activity className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Working Status *
                      </label>
                      <CustomDropdown
                        options={["Active", "Inactive", "On Leave"]}
                        value={regData.workingStatus}
                        onChange={(val) => setRegData({ ...regData, workingStatus: val })}
                        placeholder="Select Working Status"
                        size="md"
                        className="w-full"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Profile Picture Section */}
                <div 
                  className={`space-y-[0.5vw] p-[0.9vw] rounded-[0.6vw] border-2 transition-all ${
                    isDraggingFile
                      ? "border-blue-500 bg-blue-50/70 ring-2 ring-blue-500/30"
                      : "border-gray-200 bg-gray-50/50 hover:border-gray-300"
                  }`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (!isDraggingFile) setIsDraggingFile(true);
                  }}
                  onDragEnter={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (e.currentTarget.contains(e.relatedTarget)) return;
                    setIsDraggingFile(false);
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setIsDraggingFile(false);
                    const file = e.dataTransfer?.files?.[0];
                    if (file) {
                      processImageFile(file);
                    }
                  }}
                >
                  <div className="flex items-center justify-between">
                    <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.35vw]">
                      <ImageIcon className="w-[0.9vw] h-[0.9vw] text-blue-600" /> Profile Picture
                    </label>
                    <span className="text-[0.68vw] text-gray-400">Optional: Max 2MB</span>
                  </div>
                  
                  <div className="flex items-center gap-[1.2vw]">
                    <div 
                      className="w-[3.6vw] h-[3.6vw] rounded-full bg-white border border-gray-300 flex items-center justify-center overflow-hidden shadow-2xs cursor-pointer flex-shrink-0"
                      onClick={() => fileInputRef.current?.click()}
                      title="Click to select image"
                    >
                      {regData.profilePicture ? (
                        <img src={regData.profilePicture} alt="Profile preview" className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-[1.6vw] h-[1.6vw] text-gray-300" />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div 
                        onClick={() => fileInputRef.current?.click()}
                        className={`flex items-center justify-between px-[0.8vw] py-[0.55vw] border border-dashed rounded-[0.45vw] cursor-pointer transition-all ${
                          isDraggingFile 
                            ? "border-blue-500 bg-blue-100/50" 
                            : "border-gray-300 hover:border-blue-400 hover:bg-white bg-white/70"
                        }`}
                      >
                        <div className="flex items-center gap-[0.6vw]">
                          <span className="py-[0.25vw] px-[0.7vw] rounded-[0.35vw] text-[0.74vw] font-semibold bg-blue-50 text-blue-700 border border-blue-200 inline-flex items-center gap-[0.3vw]">
                            <UploadCloud className="w-[0.85vw] h-[0.85vw]" />
                            Choose File
                          </span>
                          <span className="text-[0.74vw] text-gray-500">
                            {isDraggingFile ? (
                              <span className="font-semibold text-blue-600">Drop image here...</span>
                            ) : (
                              <span>or drag & drop image here</span>
                            )}
                          </span>
                        </div>
                        <span className="text-[0.68vw] text-gray-400 font-medium">PNG, JPG, WebP</span>
                      </div>

                      <input 
                        ref={fileInputRef}
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            processImageFile(file);
                          }
                          e.target.value = "";
                        }}
                        className="hidden"
                      />

                      {regData.profilePicture && (
                        <button 
                          type="button" 
                          onClick={() => setRegData((prev) => ({ ...prev, profilePicture: null }))} 
                          className="text-[0.68vw] text-rose-500 hover:text-rose-700 font-semibold mt-[0.3vw] flex items-center gap-[0.2vw] transition-colors cursor-pointer"
                        >
                          <X className="w-[0.75vw] h-[0.75vw]" /> Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* 4. Security Section */}
                <div className="space-y-[0.8vw]">
                  <div className="flex items-center gap-[0.4vw] pb-[0.35vw] border-b border-gray-200">
                    <Lock className="w-[0.9vw] h-[0.9vw] text-blue-600" />
                    <span className="text-[0.76vw] font-bold text-gray-800 uppercase tracking-wider">Security</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-[1.2vw] gap-y-[0.8vw]">
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Lock className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Password {!editingEmp && "*"}
                      </label>
                      <div className="relative">
                        <input 
                          type={showPassword ? "text" : "password"} 
                          required={!editingEmp}
                          value={regData.password} 
                          onChange={e => setRegData({...regData, password: e.target.value})} 
                          placeholder={editingEmp ? "Leave blank to keep existing password" : "Enter password"}
                          className="w-full border border-gray-300 p-[0.55vw] pr-[2.2vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff className="w-[0.95vw] h-[0.95vw]" /> : <Eye className="w-[0.95vw] h-[0.95vw]" />}
                        </button>
                      </div>
                    </div>
                    <div className="space-y-[0.35vw]">
                      <label className="text-[0.76vw] font-semibold text-gray-700 flex items-center gap-[0.3vw]">
                        <Lock className="w-[0.85vw] h-[0.85vw] text-gray-400" /> Confirm Password {!editingEmp && "*"}
                      </label>
                      <div className="relative">
                        <input 
                          type={showConfirmPassword ? "text" : "password"} 
                          required={!editingEmp}
                          value={regData.confirmPassword} 
                          onChange={e => setRegData({...regData, confirmPassword: e.target.value})} 
                          placeholder={editingEmp ? "Leave blank to keep existing password" : "Confirm password"}
                          className="w-full border border-gray-300 p-[0.55vw] pr-[2.2vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-[0.82vw] text-gray-900 bg-white placeholder-gray-400 transition-colors" 
                        />
                        <button 
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-[0.7vw] top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                        >
                          {showConfirmPassword ? <EyeOff className="w-[0.95vw] h-[0.95vw]" /> : <Eye className="w-[0.95vw] h-[0.95vw]" />}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Form Action Buttons (Sticky Footer) */}
                <div className="pt-[1vw] border-t border-gray-200 flex justify-end gap-[0.6vw] flex-shrink-0">
                  <button 
                    type="button" 
                    onClick={() => setShowRegModal(false)} 
                    className="px-[1.2vw] py-[0.5vw] text-gray-600 hover:bg-gray-100 rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="px-[1.6vw] py-[0.5vw] bg-blue-600 text-white rounded-[0.4vw] text-[0.82vw] font-bold shadow-xs hover:bg-blue-700 transition-all cursor-pointer"
                  >
                    {editingEmp ? "Update Profile" : "Complete Registration"}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DepartmentMasterModal 
        isOpen={showDeptModal} 
        onClose={() => setShowDeptModal(false)} 
        departments={departments}
        onSave={handleDeptSave}
      />
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// UnitsSection
// ─────────────────────────────────────────────────────────────────────────────

export default EmployeeManagementSection;
