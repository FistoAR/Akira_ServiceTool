import { Icon } from "@iconify/react";
import React, { useState, useEffect, useRef, useMemo } from "react";
import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS,
  loadCustomerDb
} from "./masterConstants";

const ITEMS_PER_PAGE = 9;

const PartyTypesSection = ({ partyTypes = [], setPartyTypes }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("partyTypes");
  const safePartyTypes = Array.isArray(partyTypes) ? partyTypes : [];
  const { toast, confirm } = useNotification();
  const [newType, setNewType] = useState({
    name: ""
  });
  const [editingType, setEditingType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleAdd = async () => {
    const t = newType.name.trim();
    if (!t) return;
    if (safePartyTypes.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/party-types`, newType);
      const newItem = { ...res.data, id: res.data._id };
      setPartyTypes([...safePartyTypes, newItem]);
      setNewType({
        name: ""
      });
      toast("Category added successfully");
    } catch (err) {
      toast("Failed to add category", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingType?.name?.trim()) return;
    const t = editingType.name.trim();
    if (
      safePartyTypes.some(
        (x) =>
          x.id !== editingType.id && x._id !== editingType._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/party-types/${editingType._id || editingType.id}`, editingType);
      const updatedItem = { ...res.data, id: res.data._id };
      setPartyTypes(
        safePartyTypes.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Category updated");
    } catch (err) {
      toast("Failed to update category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    if (safePartyTypes.length === 1) {
      toast("Cannot delete the last category!", "warning");
      return;
    }
    const type = safePartyTypes.find((t) => t.id === id || t._id === mongoId);
    const usageCount = loadCustomerDb().filter((r) => r.partyType === type.name).length;

    const confirmed = await confirm({
      title: "Delete Category",
      message: (
        <div className="flex flex-col gap-2">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{type.name}"</span>?</p>
          {usageCount > 0 && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-md">
              <p className="text-amber-700 font-semibold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" /> {usageCount} records affected
              </p>
              <p className="text-amber-600 text-xs mt-1">These records will be automatically reassigned to the first available category.</p>
            </div>
          )}
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/party-types/${mongoId || id}`);
        const remaining = safePartyTypes.filter((t) => t.id !== id && t._id !== mongoId);
        setPartyTypes(remaining);
        toast("Category deleted successfully");
      } catch (err) {
        toast("Failed to delete category", "error");
      }
    }
  };

  const filteredPartyTypes = useMemo(() => {
    return safePartyTypes.filter((type) =>
      (type.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safePartyTypes, searchTerm]);

  const totalPages = Math.ceil(filteredPartyTypes.length / ITEMS_PER_PAGE) || 1;
  const paginatedPartyTypes = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPartyTypes.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPartyTypes, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6.5 items-start">
        {/* Left Column: Categories List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100 gap-3.5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Configured Categories</h3>
              <p className="text-sm text-gray-700">Manage client classification groups</p>
            </div>
            <div className="relative">
              <Search className="absolute left-[9px] top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
              <input
                type="text"
                placeholder="Search categories..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[173px] pl-6.5 pr-2.5 py-1 border border-gray-200 rounded-md text-xs outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20 bg-white text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="divide-y divide-gray-100 min-h-[259px]">
              {paginatedPartyTypes.length === 0 ? (
                <div className="p-[43px] text-center text-gray-700 text-xs">
                  {searchTerm ? "No categories match your search." : "No categories configured yet."}
                </div>
              ) : (
                paginatedPartyTypes.map((type, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                  const badgeClass = TYPE_BADGE_COLORS[globalIdx % TYPE_BADGE_COLORS.length];
                  const isEditingThis = editingType && (editingType._id === type._id || editingType.id === type.id);
                  return (
                    <div
                      key={type.id || type._id}
                      className={`flex items-center justify-between px-3.5 py-3 transition-colors group ${isEditingThis ? "bg-blue-50/70" : "hover:bg-gray-50/70"
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="w-6 h-6 rounded-full bg-gray-100 text-gray-600 flex items-center justify-center text-sm font-bold">
                          {globalIdx + 1}
                        </span>
                        <span className={`text-xs font-semibold px-2.5 py-1 rounded-md border ${badgeClass}`}>
                          {type.name}
                        </span>
                      </div>

                      {(canUpdate || canDelete) && (
                        <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {canUpdate && (
                            <button
                              type="button"
                              onClick={() => setEditingType({ ...type })}
                              className="p-1.5 text-gray-700 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
                              title="Edit Category"
                            >
                              <Icon icon="solar:pen-new-square-linear" className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => handleDelete(type.id, type._id)}
                              className="p-1.5 text-gray-700 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                              disabled={safePartyTypes.length === 1}
                              title="Delete Category"
                            >
                              <Icon icon="solar:trash-bin-trash-linear" className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {filteredPartyTypes.length > 0 && (
              <div className="border-t border-gray-100 px-3.5 py-2 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="text-xs text-gray-700 font-medium">
                  Showing <span className="text-gray-900 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredPartyTypes.length)}</span> of <span className="text-gray-900 font-semibold">{filteredPartyTypes.length}</span> categories
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-1 border border-gray-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-3 h-3" />
                  </button>
                  <div className="flex gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                      const pNum = i + 1;
                      if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                        if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-gray-700 text-sm">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-6 h-6 flex items-center justify-center rounded-md text-xs font-semibold transition-all cursor-pointer ${currentPage === pNum
                              ? "bg-blue-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-blue-400 hover:text-blue-600"
                            }`}
                        >
                          {pNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1 border border-gray-200 rounded-md hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Next page"
                  >
                    <ChevronRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Clean Form Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-lg p-4">
          {editingType ? (
            canUpdate ? (
              <div className="space-y-3.5">
                <div className="flex items-center justify-between pb-2 border-b border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                    <h4 className="text-sm font-bold text-gray-900">Edit Category</h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="text-gray-700 hover:text-gray-600 text-sm"
                  >
                    Cancel
                  </button>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Category Name *</label>
                  <input
                    type="text"
                    value={editingType.name}
                    onChange={(e) => setEditingType({ ...editingType, name: e.target.value })}
                    placeholder="e.g. Domestic, Export..."
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                  />
                </div>

                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleUpdate}
                    disabled={!editingType.name.trim()}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer"
                  >
                    Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingType(null)}
                    className="px-3.5 bg-white border border-gray-300 hover:bg-gray-100 text-gray-700 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-7 text-center text-gray-700 text-xs">
                You do not have permission to edit categories.
              </div>
            )
          ) : canWrite ? (
            <div className="space-y-3.5">
              <div className="pb-2 border-b border-gray-200">
                <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                  <Icon icon="solar:add-circle-bold-duotone" className="w-4 h-4 text-emerald-600" />
                  Add New Category
                </h4>
                <p className="text-sm text-gray-700">Create a new customer classification tag</p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700">Category Name *</label>
                <input
                  type="text"
                  value={newType.name}
                  onChange={(e) => setNewType({ ...newType, name: e.target.value })}
                  placeholder="e.g. OEM, Tier 1, Direct Customer..."
                  className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all font-medium"
                />
              </div>

              <button
                type="button"
                onClick={handleAdd}
                disabled={!newType.name.trim()}
                className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-2 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-sm"
              >
                <Icon icon="solar:add-circle-linear" className="w-3.5 h-3.5" /> Add Category
              </button>
            </div>
          ) : (
            <div className="p-7 text-center text-gray-700 text-xs flex flex-col items-center justify-center gap-1.5">
              <Icon icon="solar:lock-keyhole-bold-duotone" className="w-6.5 h-6.5 text-gray-600" />
              <span>Read-only access. You can view existing categories on the left.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );


};

// ─────────────────────────────────────────────────────────────────────────────

export default PartyTypesSection;
