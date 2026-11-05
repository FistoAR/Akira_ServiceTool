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
  MapPin, RefreshCw
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
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-[1vw] shadow-2xl border border-slate-400 w-full max-w-[28vw] overflow-hidden flex flex-col max-h-[80vh]">
        <div className="p-[1.2vw] border-b border-slate-400 flex items-center justify-between bg-slate-50">
          <h3 className="text-[1vw] font-bold text-slate-900 flex items-center gap-[0.5vw]">
            <Briefcase className="w-[1.1vw] h-[1.1vw] text-blue-600" />
            Manage Departments
          </h3>
          <button onClick={onClose} className="p-[0.4vw] hover:bg-slate-200 rounded-full transition-colors"><X className="w-[1vw] h-[1vw]" /></button>
        </div>

        <div className="p-[1.2vw] flex flex-col gap-[1vw] overflow-y-auto">
          <div className="flex gap-[0.5vw]">
            <input 
              type="text" 
              value={newDept}
              onChange={(e) => setNewDept(e.target.value)}
              placeholder="Enter department name..."
              className="flex-1 border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]"
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
            />
            <button onClick={handleAdd} className="bg-blue-600 text-white px-[1vw] rounded-[0.4vw] hover:bg-blue-700 transition-colors"><Plus className="w-[1vw] h-[1vw]" /></button>
          </div>

          <div className="flex flex-col gap-[0.4vw]">
            {localDepts.map((dept, idx) => (
              <div key={idx} className="flex items-center justify-between p-[0.6vw] bg-slate-50 border border-slate-400 rounded-[0.4vw] hover:bg-slate-100 transition-colors group">
                <span className="text-[0.82vw] font-medium text-slate-700">{dept}</span>
                <button onClick={() => handleRemove(dept)} className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="w-[0.9vw] h-[0.9vw]" /></button>
              </div>
            ))}
            {localDepts.length === 0 && <p className="text-center text-slate-400 py-[2vw] text-[0.8vw]">No departments defined</p>}
          </div>
        </div>

        <div className="p-[1vw] border-t border-slate-400 bg-slate-50 flex justify-end gap-[0.6vw]">
          <button onClick={onClose} className="px-[1vw] py-[0.5vw] text-slate-600 hover:bg-slate-200 rounded-[0.4vw] text-[0.82vw] font-semibold">Cancel</button>
          <button onClick={handleSave} className="bg-blue-600 text-white px-[1.2vw] py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-bold shadow-lg hover:bg-blue-700 transition-all">Save Changes</button>
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
        toast("Employee updated successfully");
      } else {
        // Register new
        await axios.post(`${API_URL}/auth/register`, finalData);
        
        const createdRole = finalData.role || "User";
        const newUserId = finalData.userId;

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
          <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[1vw] h-[1vw] text-slate-400" />
          <input 
            type="text" 
            placeholder="Search employees by name, ID or department..."
            className="w-full pl-[2.4vw] pr-[1vw] py-[0.6vw] border border-slate-400 rounded-[0.5vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-[0.6vw]">
          {canWrite && (
            <button 
              onClick={() => setShowDeptModal(true)}
              className="flex items-center gap-[0.5vw] border border-slate-400 text-slate-600 hover:bg-slate-50 px-[1vw] py-[0.6vw] rounded-[0.5vw] font-semibold text-[0.82vw] cursor-pointer transition-all"
            >
              <Icon icon="solar:case-round-minimalistic-bold-duotone" className="w-[1vw] h-[1vw]" /> Dept Master
            </button>
          )}
          {canWrite && (
            <button 
              onClick={() => openRegModal()}
              className="flex items-center gap-[0.5vw] bg-blue-600 text-white px-[1.2vw] py-[0.6vw] rounded-[0.5vw] font-bold text-[0.85vw] cursor-pointer hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
            >
              <Icon icon="solar:user-plus-bold-duotone" className="w-[1.1vw] h-[1.1vw]" /> Register Employee
            </button>
          )}
        </div>
      </div>

      <div className="bg-white border border-slate-400 rounded-[0.8vw] overflow-hidden shadow-sm flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-50 shadow-sm">
            <tr className="bg-slate-50 border-b border-slate-400">
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">S. No.</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Employee</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">ID</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Department</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Designation</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Role</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider">Status</th>
              <th className="px-[1vw] py-[0.8vw] text-[0.75vw] font-bold text-gray-800 uppercase tracking-wider text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {paginatedData.map((emp, idx) => (
              <tr key={emp._id || idx} className="hover:bg-slate-50/50 transition-colors group">
                <td className="px-[1vw] py-[0.8vw]">
                  {(currentPage - 1) * ITEMS_PER_PAGE + idx + 1}
                </td>
                <td className="px-[1vw] py-[0.8vw]">
                  <div className="flex items-center gap-[0.8vw]">
                    <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-[0.9vw] overflow-hidden">
                      {emp.profilePicture ? <img src={emp.profilePicture} className="w-full h-full object-cover" /> : emp.name?.charAt(0)}
                    </div>
                    <div>
                      <div className="text-[0.85vw] font-bold text-slate-900">{emp.name}</div>
                      <div className="text-[0.7vw] text-slate-500">{emp.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-[0.82vw] font-medium text-slate-600">{emp.userId}</td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className="px-[0.6vw] py-[0.2vw] bg-slate-100 text-slate-700 rounded-full text-[0.7vw] font-bold">
                    {emp.department}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-[0.82vw] text-slate-600">{emp.designation}</td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.7vw] font-bold ${
                    emp.role === "Admin" || emp.role === "Supervisor" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"
                  }`}>
                    {emp.role || "User"}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw]">
                  <span className={`px-[0.6vw] py-[0.2vw] rounded-full text-[0.7vw] font-bold ${
                    emp.workingStatus === "Active" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {emp.workingStatus}
                  </span>
                </td>
                <td className="px-[1vw] py-[0.8vw] text-right">
                  {((emp.role === "Admin" || emp.department === "Admin") && !isCurrentRequesterAdmin) ? (
                    <span className="inline-flex items-center gap-[0.2vw] text-[0.68vw] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-[0.5vw] py-[0.15vw] rounded-full" title="Protected Admin profile">
                      <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[0.75vw] h-[0.75vw]" /> Protected
                    </span>
                  ) : (
                    <div className="flex items-center justify-end gap-[0.3vw]">
                      {canUpdate && (
                        <button 
                          onClick={() => openRegModal(emp)}
                          className="p-[0.4vw] hover:bg-slate-200 rounded-full transition-colors text-slate-400 hover:text-blue-600 cursor-pointer"
                          title="Edit Employee Details"
                        >
                          <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                        </button>
                      )}
                      {canDelete && (
                        <button 
                          onClick={() => handleDeleteEmployee(emp)}
                          className="p-[0.4vw] hover:bg-red-50 rounded-full transition-colors text-slate-400 hover:text-red-600 cursor-pointer"
                          title="Delete Employee"
                        >
                          <Icon icon="solar:trash-bin-trash-linear" className="w-[0.95vw] h-[0.95vw]" />
                        </button>
                      )}
                      {!canUpdate && !canDelete && (
                        <span className="text-[0.68vw] text-slate-400 italic">View only</span>
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
            <Users className="w-[3vw] h-[3vw] text-slate-200" />
            <p className="text-slate-400 text-[0.9vw]">No employees found matching your search</p>
          </div>
        )}

        {/* Pagination UI */}
        <div className="border-t border-slate-400 p-[0.8vw] bg-slate-50 flex justify-between items-center flex-shrink-0">
          <div className="text-[0.75vw] text-slate-500 font-medium">
            Showing <span className="text-slate-900 font-bold">{paginatedData.length > 0 ? (currentPage - 1) * ITEMS_PER_PAGE + 1 : 0}</span> to <span className="text-slate-900 font-bold">{Math.min(currentPage * ITEMS_PER_PAGE, filtered.length)}</span> of <span className="text-slate-900 font-bold">{filtered.length}</span> employees
          </div>
          <div className="flex items-center gap-[0.8vw]">
            <button 
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-[0.4vw] border border-slate-400 rounded-[0.4vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm transition-all cursor-pointer"
            >
              <ChevronLeft className="w-[1vw] h-[1vw] text-slate-600" />
            </button>
            <div className="flex gap-[0.4vw]">
              {[...Array(totalPages)].map((_, i) => {
                const pNum = i + 1;
                // Basic logic to show only few pages if there are many
                if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                  if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-slate-400">...</span>;
                  return null;
                }
                return (
                  <button
                    key={pNum}
                    onClick={() => setCurrentPage(pNum)}
                    className={`w-[1.8vw] h-[1.8vw] flex items-center justify-center rounded-[0.4vw] text-[0.75vw] font-bold transition-all cursor-pointer ${currentPage === pNum ? "bg-blue-600 text-white shadow-md shadow-blue-100" : "bg-white border border-slate-400 text-slate-600 hover:border-blue-400 hover:text-blue-600"}`}
                  >
                    {pNum}
                  </button>
                );
              })}
            </div>
            <button 
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages || totalPages === 0}
              className="p-[0.4vw] border border-slate-400 rounded-[0.4vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white shadow-sm transition-all cursor-pointer"
            >
              <ChevronRight className="w-[1vw] h-[1vw] text-slate-600" />
            </button>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <AnimatePresence>
        {showRegModal && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-[2vw]">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="bg-white rounded-[1.2vw] shadow-2xl border border-slate-400 w-full max-w-[50vw] overflow-hidden flex flex-col max-h-[90vh]">
              <div className="p-[1.5vw] border-b border-slate-400 flex items-center justify-between bg-gradient-to-r from-slate-50 to-white">
                <div className="flex items-center gap-[0.8vw]">
                  <div className="w-[2.2vw] h-[2.2vw] rounded-[0.5vw] bg-blue-600 flex items-center justify-center">
                    <UserPlus className="w-[1.1vw] h-[1.1vw] text-white" />
                  </div>
                  <div>
                    <h3 className="text-[1.1vw] font-bold text-slate-900">{editingEmp ? "Edit Employee Profile" : "Register New Employee"}</h3>
                    <p className="text-[0.75vw] text-slate-500">{editingEmp ? `Updating details for ${editingEmp.name}` : "Create a new user profile and credentials"}</p>
                  </div>
                </div>
                <button onClick={() => setShowRegModal(false)} className="p-[0.5vw] hover:bg-slate-200 rounded-full transition-colors"><X className="w-[1.2vw] h-[1.2vw]" /></button>
              </div>

              <form onSubmit={handleRegSubmit} className="p-[1.5vw] overflow-y-auto grid grid-cols-2 gap-[1.2vw]">
                {/* Personal Details */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw]">
                  <User className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Personal Details</span>
                </div>
                
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Users className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Full Name *</label>
                  <input type="text" required value={regData.name} onChange={e => setRegData({...regData, name: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="John Doe" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ShieldCheck className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Employee ID *</label>
                  <input type="text" required value={regData.userId} onChange={e => setRegData({...regData, userId: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="EMP001" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Mail className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Email Address *</label>
                  <input type="email" required value={regData.email} onChange={e => setRegData({...regData, email: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="john@akira.com" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Phone className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Phone Number</label>
                  <input type="tel" value={regData.phoneNumber} onChange={e => setRegData({...regData, phoneNumber: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="+91 ..." />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Calendar className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Date of Birth *</label>
                  <input type="date" required value={regData.dob} onChange={e => setRegData({...regData, dob: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Users className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Gender *</label>
                  <CustomDropdown
                    options={["Male", "Female", "Other"]}
                    value={regData.gender}
                    onChange={(val) => setRegData({ ...regData, gender: val })}
                    placeholder="Select Gender"
                    size="md"
                    className="w-full"
                  />
                </div>

                {/* Professional Details */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw] mt-[0.8vw]">
                  <Briefcase className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Professional Details</span>
                </div>

                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Briefcase className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Department *</label>
                  <div className="flex items-center gap-[0.4vw]">
                    <div className="flex-1">
                      <CustomDropdown
                        searchable
                        options={departments}
                        value={regData.department}
                        onChange={(val) => setRegData({ ...regData, department: val })}
                        placeholder="Select Department"
                        size="md"
                      />
                    </div>
                    <button type="button" onClick={() => setShowDeptModal(true)} className="p-[0.55vw] bg-slate-100 hover:bg-slate-200 rounded-[0.4vw] transition-colors"><Settings className="w-[1vw] h-[1vw] text-slate-600" /></button>
                  </div>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Tag className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Designation *</label>
                  <input type="text" required value={regData.designation} onChange={e => setRegData({...regData, designation: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="Senior Engineer" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ShieldCheck className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Role *</label>
                  <CustomDropdown
                    options={isCurrentRequesterAdmin ? ["User", "Supervisor", "Admin"] : ["User", "Supervisor"]}
                    value={regData.role}
                    onChange={(val) => setRegData({ ...regData, role: val })}
                    placeholder="Select Role"
                    size="md"
                    className="w-full"
                  />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><IndianRupee className="w-[0.9vw] h-[0.9vw] text-slate-400" /> CTC (Monthly)</label>
                  <input type="number" min="0" value={regData.ctc} onChange={e => {
                    const val = e.target.value;
                    if (val === "" || Number(val) >= 0) {
                      setRegData({...regData, ctc: val});
                    }
                  }} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" placeholder="Enter monthly CTC" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Calendar className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Date of Joining *</label>
                  <input type="date" required value={regData.dateOfJoining} onChange={e => setRegData({...regData, dateOfJoining: e.target.value})} className="w-full border border-slate-400 p-[0.6vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" />
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Activity className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Working Status *</label>
                  <CustomDropdown
                    options={["Active", "Inactive", "On Leave"]}
                    value={regData.workingStatus}
                    onChange={(val) => setRegData({ ...regData, workingStatus: val })}
                    placeholder="Select Working Status"
                    size="md"
                    className="w-full"
                  />
                </div>

                {/* Profile Picture */}
                <div className="col-span-2 space-y-[0.6vw] p-[1vw] bg-slate-50 rounded-[0.8vw] border border-slate-400">
                  <div className="flex items-center justify-between">
                    <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><ImageIcon className="w-[1vw] h-[1vw] text-blue-600" /> Profile Picture</label>
                    <span className="text-[0.7vw] text-slate-400">Optional: Max 2MB</span>
                  </div>
                  <div className="flex items-center gap-[1.2vw]">
                    <div className="w-[4vw] h-[4vw] rounded-full bg-white border-2 border-slate-400 flex items-center justify-center overflow-hidden shadow-inner">
                      {regData.profilePicture ? (
                        <img src={regData.profilePicture} className="w-full h-full object-cover" />
                      ) : (
                        <Users className="w-[1.8vw] h-[1.8vw] text-slate-200" />
                      )}
                    </div>
                    <div className="flex-1">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
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
                          }
                        }}
                        className="text-[0.75vw] file:mr-[1vw] file:py-[0.4vw] file:px-[1vw] file:rounded-full file:border-0 file:text-[0.75vw] file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer"
                      />
                      {regData.profilePicture && (
                        <button type="button" onClick={() => setRegData({...regData, profilePicture: null})} className="text-[0.7vw] text-red-500 hover:text-red-700 font-bold mt-[0.4vw] flex items-center gap-[0.2vw]">
                          <X className="w-[0.8vw] h-[0.8vw]" /> Remove Photo
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Security */}
                <div className="col-span-2 flex items-center gap-[0.5vw] pb-[0.4vw] border-b border-slate-400 mb-[0.4vw] mt-[0.8vw]">
                  <Lock className="w-[1vw] h-[1vw] text-blue-600" />
                  <span className="text-[0.85vw] font-bold text-slate-800 uppercase tracking-wider">Security</span>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Lock className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Password {!editingEmp && "*"}</label>
                  <div className="relative">
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required={!editingEmp}
                      value={regData.password} 
                      onChange={e => setRegData({...regData, password: e.target.value})} 
                      className="w-full border border-slate-400 p-[0.6vw] pr-[2.5vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-[1vw] h-[1vw]" /> : <Eye className="w-[1vw] h-[1vw]" />}
                    </button>
                  </div>
                </div>
                <div className="space-y-[0.4vw]">
                  <label className="text-[0.8vw] font-bold text-slate-700 flex items-center gap-[0.4vw]"><Lock className="w-[0.9vw] h-[0.9vw] text-slate-400" /> Confirm Password {!editingEmp && "*"}</label>
                  <div className="relative">
                    <input 
                      type={showConfirmPassword ? "text" : "password"} 
                      required={!editingEmp}
                      value={regData.confirmPassword} 
                      onChange={e => setRegData({...regData, confirmPassword: e.target.value})} 
                      className="w-full border border-slate-400 p-[0.6vw] pr-[2.5vw] rounded-[0.4vw] outline-none focus:ring-2 focus:ring-blue-500/20 text-[0.85vw]" 
                    />
                    <button 
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-[0.8vw] top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      {showConfirmPassword ? <EyeOff className="w-[1vw] h-[1vw]" /> : <Eye className="w-[1vw] h-[1vw]" />}
                    </button>
                  </div>
                </div>
                
                <div className="col-span-2 pt-[1.5vw] mt-[0.5vw] border-t border-slate-400 flex justify-end gap-[0.8vw]">
                  <button type="button" onClick={() => setShowRegModal(false)} className="px-[1.5vw] py-[0.7vw] text-slate-600 hover:bg-slate-100 rounded-[0.6vw] text-[0.85vw] font-semibold transition-all">Cancel</button>
                  <button type="submit" className="px-[2vw] py-[0.7vw] bg-blue-600 text-white rounded-[0.6vw] text-[0.85vw] font-bold shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all">
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
