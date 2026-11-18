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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS
} from "./masterConstants";

const ITEMS_PER_PAGE = 9;

const UnitsSection = ({ units = [], setUnits }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("units");
  const safeUnits = Array.isArray(units) ? units : [];
  const { toast, confirm } = useNotification();
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleAdd = async () => {
    const t = newTypeName.trim();
    if (!t) return;
    if (safeUnits.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Unit already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/units`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setUnits([...safeUnits, newItem]);
      setNewTypeName("");
      toast("Unit added successfully");
    } catch (err) {
      toast("Failed to add unit", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingType?.name?.trim()) return;
    const t = editingType.name.trim();
    if (
      safeUnits.some(
        (x) =>
          x.id !== editingType.id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Unit already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/units/${editingType._id || editingType.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setUnits(
        safeUnits.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Unit updated");
    } catch (err) {
      toast("Failed to update unit", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const type = safeUnits.find((t) => t.id === id || t._id === mongoId);
    const confirmed = await confirm({
      title: "Delete Unit",
      message: (
        <div className="flex flex-col gap-2">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{type.name}"</span>?</p>
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/units/${mongoId || id}`);
        const remaining = safeUnits.filter((t) => t.id !== id && t._id !== mongoId);
        setUnits(remaining);
        toast("Unit deleted successfully");
      } catch (err) {
        toast("Failed to delete unit", "error");
      }
    }
  };

  const filteredUnits = useMemo(() => {
    return safeUnits.filter((u) =>
      (u.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeUnits, searchTerm]);

  const totalPages = Math.ceil(filteredUnits.length / ITEMS_PER_PAGE) || 1;
  const paginatedUnits = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUnits.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUnits, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6.5 items-start">
        {/* Left Column: Units List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-gray-100 gap-3.5">
            <div>
              <h3 className="text-sm font-bold text-gray-900">Configured Units of Measurement</h3>
              <p className="text-sm text-gray-700">Inventory and material measurement units</p>
            </div>
            <div className="relative">
              <Search className="absolute left-[9px] top-1/2 -translate-y-1/2 w-3 h-3 text-gray-700" />
              <input
                type="text"
                placeholder="Search units..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[173px] pl-6.5 pr-2.5 py-1 border border-gray-200 rounded-md text-xs outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/20 bg-white text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-lg bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="divide-y divide-gray-100 min-h-[259px]">
              {paginatedUnits.length === 0 ? (
                <div className="p-[43px] text-center text-gray-700 text-xs">
                  {searchTerm ? "No measurement units match your search." : "No units configured yet."}
                </div>
              ) : (
                paginatedUnits.map((type, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                  const badgeClass = TYPE_BADGE_COLORS[globalIdx % TYPE_BADGE_COLORS.length];
                  const isEditingThis = editingType && (editingType._id === type._id || editingType.id === type.id);
                  return (
                    <div
                      key={type.id || type._id || idx}
                      className={`flex items-center justify-between px-3.5 py-3 transition-colors group ${isEditingThis ? "bg-emerald-50/70" : "hover:bg-gray-50/70"
                        }`}
                    >
                      {isEditingThis ? (
                        <div className="flex-1 flex items-center gap-2">
                          <input
                            autoFocus
                            type="text"
                            value={editingType.name}
                            onChange={(e) =>
                              setEditingType({
                                ...editingType,
                                name: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") setEditingType(null);
                            }}
                            className="flex-1 bg-white border border-emerald-400 rounded-md px-2.5 py-1.5 text-xs outline-none ring-2 ring-emerald-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={handleUpdate}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md cursor-pointer"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingType(null)}
                            className="p-1.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2.5">
                            <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-sm font-bold">
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
                                  onClick={() =>
                                    setEditingType({ id: type.id, _id: type._id, name: type.name })
                                  }
                                  className="p-1.5 text-gray-700 hover:text-emerald-600 hover:bg-emerald-50 rounded-md transition-colors cursor-pointer"
                                  title="Edit Unit"
                                >
                                  <Icon icon="solar:pen-new-square-linear" className="w-3.5 h-3.5" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(type.id, type._id)}
                                  className="p-1.5 text-gray-700 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                                  title="Delete Unit"
                                >
                                  <Icon icon="solar:trash-bin-trash-linear" className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            {/* Pagination Controls */}
            {filteredUnits.length > 0 && (
              <div className="border-t border-gray-100 px-3.5 py-2 bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="text-xs text-gray-700 font-medium">
                  Showing <span className="text-gray-900 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredUnits.length)}</span> of <span className="text-gray-900 font-semibold">{filteredUnits.length}</span> units
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
                              ? "bg-emerald-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-emerald-400 hover:text-emerald-600"
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

        {/* Right Column: Quick Add Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-lg p-4">
          <div className="space-y-3.5">
            <div className="pb-2 border-b border-gray-200">
              <h4 className="text-sm font-bold text-gray-900 flex items-center gap-1.5">
                <Icon icon="solar:tuning-2-bold-duotone" className="w-4 h-4 text-emerald-600" />
                Add Measurement Unit
              </h4>
              <p className="text-sm text-gray-700">Define measurement units for service parts</p>
            </div>

            {canWrite ? (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">Unit Name *</label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="e.g. Nos, Kgs, Ltrs, Sets…"
                    className="w-full bg-white border border-gray-300 rounded-md px-3 py-2 text-xs outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newTypeName.trim()}
                  className="w-full flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-2 rounded-md text-xs font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Icon icon="solar:add-circle-linear" className="w-3.5 h-3.5" /> Add Unit
                </button>
              </div>
            ) : (
              <div className="p-7 text-center text-gray-700 text-xs flex flex-col items-center justify-center gap-1.5">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-6.5 h-6.5 text-gray-600" />
                <span>Read-only access. You can view existing units on the left.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );


};


// ─────────────────────────────────────────────────────────────────────────────
// SitesSection
// ─────────────────────────────────────────────────────────────────────────────

export default UnitsSection;
