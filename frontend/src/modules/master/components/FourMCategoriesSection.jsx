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

const ITEMS_PER_PAGE = 10;

const FourMCategoriesSection = ({ items = [], setItems }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("fourM");
  const safeItems = Array.isArray(items) ? items : [];
  const { toast, confirm } = useNotification();
  const [newName, setNewName] = useState("");
  const [editingItem, setEditingItem] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const handleAdd = async () => {
    const t = newName.trim();
    if (!t) return;
    if (safeItems.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("4M Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/four-m-categories`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setItems([...safeItems, newItem]);
      setNewName("");
      toast("4M Category added");
    } catch (err) {
      toast("Failed to add 4M Category", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingItem?.name?.trim()) return;
    const t = editingItem.name.trim();
    if (
      safeItems.some(
        (x) =>
          x.id !== editingItem.id && x._id !== editingItem._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("4M Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/four-m-categories/${editingItem._id || editingItem.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setItems(
        safeItems.map((x) => (x.id === editingItem.id || x._id === editingItem._id ? updatedItem : x)),
      );
      setEditingItem(null);
      toast("4M Category updated");
    } catch (err) {
      toast("Failed to update 4M Category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const item = safeItems.find((s) => s.id === id || s._id === mongoId);
    const confirmed = await confirm({
      title: "Delete 4M Category",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{item.name}"</span>?</p>
        </div>
      ),
      type: "danger",
      confirmText: "Yes, Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/four-m-categories/${mongoId || id}`);
        const remaining = safeItems.filter((t) => t.id !== id && t._id !== mongoId);
        setItems(remaining);
        toast("4M Category deleted successfully");
      } catch (err) {
        toast("Failed to delete 4M Category", "error");
      }
    }
  };

  const filteredItems = useMemo(() => {
    return safeItems.filter((item) =>
      (item.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeItems, searchTerm]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-[1.4vw] grid grid-cols-1 lg:grid-cols-12 gap-[1.8vw] items-start">
        {/* Left Column: 4M Categories List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100 gap-[1vw]">
            <div>
              <h3 className="text-[0.88vw] font-bold text-gray-900">4M Categories</h3>
              <p className="text-[0.72vw] text-gray-500">Root-cause checklist categories (Man, Machine, Material, Method)</p>
            </div>
            <div className="relative">
              <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-gray-400" />
              <input
                type="text"
                placeholder="Search 4M..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-[12vw] pl-[1.8vw] pr-[0.6vw] py-[0.3vw] border border-gray-200 rounded-[0.4vw] text-[0.75vw] outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/20 bg-white text-gray-800 placeholder-gray-400 transition-all"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-[0.6vw] bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="divide-y divide-gray-100 min-h-[18vw]">
              {paginatedItems.length === 0 ? (
                <div className="p-[3vw] text-center text-gray-400 text-[0.8vw]">
                  {searchTerm ? "No 4M categories match your search." : "No 4M categories configured yet."}
                </div>
              ) : (
                paginatedItems.map((seg, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                  const isEditingThis = editingItem && (editingItem._id === seg._id || editingItem.id === seg.id);
                  return (
                    <div
                      key={seg.id || seg._id || idx}
                      className={`flex items-center justify-between px-[1vw] py-[0.75vw] transition-colors group ${
                        isEditingThis ? "bg-cyan-50/70" : "hover:bg-gray-50/70"
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="flex-1 flex items-center gap-[0.5vw]">
                          <input
                            autoFocus
                            type="text"
                            value={editingItem.name}
                            onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") setEditingItem(null);
                            }}
                            className="flex-1 bg-white border border-cyan-400 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-cyan-100 font-medium"
                          />
                          <button
                            type="button"
                            onClick={handleUpdate}
                            className="p-[0.4vw] bg-emerald-600 hover:bg-emerald-700 text-white rounded-[0.3vw] cursor-pointer"
                          >
                            <Check className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingItem(null)}
                            className="p-[0.4vw] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[0.3vw] cursor-pointer"
                          >
                            <X className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-[0.65vw]">
                            <span className="w-[1.6vw] h-[1.6vw] rounded-full bg-cyan-50 text-cyan-700 flex items-center justify-center text-[0.72vw] font-bold">
                              {globalIdx + 1}
                            </span>
                            <span className="text-[0.82vw] font-semibold text-gray-800">
                              {seg.name}
                            </span>
                          </div>

                          {(canUpdate || canDelete) && (
                            <div className="flex items-center gap-[0.35vw] opacity-0 group-hover:opacity-100 transition-opacity">
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={() => setEditingItem({ id: seg.id, _id: seg._id, name: seg.name })}
                                  className="p-[0.35vw] text-gray-500 hover:text-cyan-600 hover:bg-cyan-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                  title="Edit 4M Category"
                                >
                                  <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(seg.id, seg._id)}
                                  className="p-[0.35vw] text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                  title="Delete 4M Category"
                                >
                                  <Icon icon="solar:trash-bin-trash-linear" className="w-[0.95vw] h-[0.95vw]" />
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
            {filteredItems.length > 0 && (
              <div className="border-t border-gray-100 px-[1vw] py-[0.55vw] bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="text-[0.74vw] text-gray-500 font-medium">
                  Showing <span className="text-gray-900 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)}</span> of <span className="text-gray-900 font-semibold">{filteredItems.length}</span> categories
                </div>
                <div className="flex items-center gap-[0.5vw]">
                  <button
                    type="button"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-[0.3vw] border border-gray-200 rounded-[0.35vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Previous page"
                  >
                    <ChevronLeft className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                  <div className="flex gap-[0.25vw]">
                    {[...Array(totalPages)].map((_, i) => {
                      const pNum = i + 1;
                      if (totalPages > 5 && (pNum < currentPage - 1 || pNum > currentPage + 1) && pNum !== 1 && pNum !== totalPages) {
                        if (pNum === currentPage - 2 || pNum === currentPage + 2) return <span key={pNum} className="px-1 text-gray-400 text-[0.7vw]">...</span>;
                        return null;
                      }
                      return (
                        <button
                          key={pNum}
                          type="button"
                          onClick={() => setCurrentPage(pNum)}
                          className={`w-[1.6vw] h-[1.6vw] flex items-center justify-center rounded-[0.35vw] text-[0.74vw] font-semibold transition-all cursor-pointer ${
                            currentPage === pNum
                              ? "bg-cyan-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-cyan-400 hover:text-cyan-600"
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
                    className="p-[0.3vw] border border-gray-200 rounded-[0.35vw] hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed bg-white transition-all cursor-pointer text-gray-600"
                    title="Next page"
                  >
                    <ChevronRight className="w-[0.85vw] h-[0.85vw]" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Add Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-[0.6vw] p-[1.2vw]">
          <div className="space-y-[1vw]">
            <div className="pb-[0.5vw] border-b border-gray-200">
              <h4 className="text-[0.88vw] font-bold text-gray-900 flex items-center gap-[0.4vw]">
                <Icon icon="solar:widget-2-bold-duotone" className="w-[1.05vw] h-[1.05vw] text-cyan-600" />
                Add 4M Category
              </h4>
              <p className="text-[0.7vw] text-gray-500">Define a category for defect classification</p>
            </div>

            {canWrite ? (
              <div className="space-y-[0.8vw]">
                <div className="space-y-[0.35vw]">
                  <label className="text-[0.74vw] font-semibold text-gray-700">Category Name *</label>
                  <input
                    type="text"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="e.g. Man, Machine, Material, Method…"
                    className="w-full bg-white border border-gray-300 rounded-[0.4vw] px-[0.75vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100 transition-all font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newName.trim()}
                  className="w-full flex items-center justify-center gap-[0.4vw] bg-cyan-600 hover:bg-cyan-700 disabled:opacity-40 text-white py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-[0.9vw] h-[0.9vw]" /> Add 4M Category
                </button>
              </div>
            ) : (
              <div className="p-[2vw] text-center text-gray-400 text-[0.78vw] flex flex-col items-center justify-center gap-[0.4vw]">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1.8vw] h-[1.8vw] text-gray-300" />
                <span>Read-only access. You can view existing 4M categories on the left.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  
  
};

// ─────────────────────────────────────────────────────────────────────────────
// Service Material Escalation Flow Section
// ─────────────────────────────────────────────────────────────────────────────

export default FourMCategoriesSection;
