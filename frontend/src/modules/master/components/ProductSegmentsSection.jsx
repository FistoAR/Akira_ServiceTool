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

const ITEMS_PER_PAGE = 10;

const ProductSegmentsSection = ({ segments = [], setSegments }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("segments");
  const safeSegments = Array.isArray(segments) ? segments : [];
  const { toast, confirm } = useNotification();
  const [newSegmentName, setNewSegmentName] = useState("");
  const [editingSegment, setEditingSegment] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const db = loadCustomerDb();

  const save = async (items) => {
    setSegments(items);
  };

  const handleAdd = async () => {
    const t = newSegmentName.trim();
    if (!t) return;
    if (safeSegments.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/product-segments`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setSegments([...safeSegments, newItem]);
      setNewSegmentName("");
      toast("Segment added");
    } catch (err) {
      toast("Failed to add segment", "error");
    }
  };

  const handleUpdate = async () => {
    if (!editingSegment?.name?.trim()) return;
    const t = editingSegment.name.trim();
    if (
      safeSegments.some(
        (x) =>
          x.id !== editingSegment.id && x._id !== editingSegment._id && x.name.toLowerCase() === t.toLowerCase(),
      )
    ) {
      toast("Segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.put(`${API_URL}/master/product-segments/${editingSegment._id || editingSegment.id}`, { name: t });
      const updatedItem = { ...res.data, id: res.data._id };
      setSegments(
        safeSegments.map((x) => (x.id === editingSegment.id || x._id === editingSegment._id ? updatedItem : x)),
      );
      setEditingSegment(null);
      toast("Segment updated");
    } catch (err) {
      toast("Failed to update segment", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const segment = safeSegments.find((s) => s.id === id || s._id === mongoId);
    const db = loadCustomerDb();
    const usageCount = db.filter((r) => r.productSegment === segment.name).length;

    const confirmed = await confirm({
      title: "Delete Segment",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{segment.name}"</span>?</p>
          {usageCount > 0 && (
            <div className="p-[0.8vw] bg-amber-50 border border-amber-200 rounded-[0.4vw]">
              <p className="text-amber-700 font-semibold flex items-center gap-[0.4vw]">
                <AlertTriangle className="w-[1vw] h-[1vw]" /> {usageCount} records affected
              </p>
              <p className="text-amber-600 text-[0.75vw] mt-[0.2vw]">Configuration and history for this segment will be lost.</p>
            </div>
          )}
        </div>
      ),
      type: "danger",
      confirmText: "Delete",
      cancelText: "Keep it"
    });

    if (confirmed) {
      try {
        await axios.delete(`${API_URL}/master/product-segments/${mongoId || id}`);
        setSegments(safeSegments.filter((s) => s.id !== id && s._id !== mongoId));
        toast("Product segment removed");
      } catch (err) {
        toast("Failed to delete segment", "error");
      }
    }
  };

  const filteredSegments = useMemo(() => {
    return safeSegments.filter((seg) =>
      (seg.name || "").toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [safeSegments, searchTerm]);

  const totalPages = Math.ceil(filteredSegments.length / ITEMS_PER_PAGE) || 1;
  const paginatedSegments = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredSegments.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredSegments, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-[1.4vw] grid grid-cols-1 lg:grid-cols-12 gap-[1.8vw] items-start">
        {/* Left Column: Segments List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100 gap-[1vw]">
            <div>
              <h3 className="text-[0.88vw] font-bold text-gray-900">Configured Product Segments</h3>
              <p className="text-[0.72vw] text-gray-500">Auto-completion product lines and families</p>
            </div>
            <div className="flex items-center gap-[0.6vw]">
              <div className="relative">
                <Search className="absolute left-[0.6vw] top-1/2 -translate-y-1/2 w-[0.8vw] h-[0.8vw] text-gray-400" />
                <input
                  type="text"
                  placeholder="Search segments..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-[11vw] pl-[1.8vw] pr-[0.6vw] py-[0.3vw] border border-gray-200 rounded-[0.4vw] text-[0.75vw] outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/20 bg-white text-gray-800 placeholder-gray-400 transition-all"
                />
              </div>
              <span className="text-[0.7vw] font-semibold text-gray-500 bg-gray-100 px-[0.6vw] py-[0.2vw] rounded-full flex-shrink-0">
                {safeSegments.length} total
              </span>
            </div>
          </div>

          <div className="border border-gray-200 rounded-[0.6vw] bg-white overflow-hidden shadow-2xs flex flex-col">
            <div className="divide-y divide-gray-100 min-h-[18vw]">
              {paginatedSegments.length === 0 ? (
                <div className="p-[3vw] text-center text-gray-400 text-[0.8vw]">
                  {searchTerm ? "No product segments match your search." : "No segments defined yet."}
                </div>
              ) : (
                paginatedSegments.map((seg, idx) => {
                  const globalIdx = (currentPage - 1) * ITEMS_PER_PAGE + idx;
                  const isEditingThis = editingSegment && (editingSegment._id === seg._id || editingSegment.id === seg.id);
                  return (
                    <div
                      key={seg.id || seg._id || idx}
                      className={`flex items-center justify-between px-[1vw] py-[0.75vw] transition-colors group ${
                        isEditingThis ? "bg-teal-50/70" : "hover:bg-gray-50/70"
                      }`}
                    >
                      {isEditingThis ? (
                        <div className="flex-1 flex items-center gap-[0.5vw]">
                          <input
                            autoFocus
                            type="text"
                            value={editingSegment.name}
                            onChange={(e) =>
                              setEditingSegment({
                                ...editingSegment,
                                name: e.target.value,
                              })
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleUpdate();
                              if (e.key === "Escape") setEditingSegment(null);
                            }}
                            className="flex-1 bg-white border border-teal-400 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-teal-100 font-medium"
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
                            onClick={() => setEditingSegment(null)}
                            className="p-[0.4vw] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[0.3vw] cursor-pointer"
                          >
                            <X className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-[0.65vw]">
                            <span className="w-[1.6vw] h-[1.6vw] rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-[0.72vw] font-bold">
                              {globalIdx + 1}
                            </span>
                            <span className="text-[0.82vw] font-semibold text-gray-800">
                              {seg.name}
                            </span>
                            {seg.isFromDb && (
                              <span className="text-[0.62vw] bg-amber-50 text-amber-700 border border-amber-200 px-[0.4vw] py-[0.08vw] rounded-full font-semibold">
                                In Customer Records
                              </span>
                            )}
                          </div>

                          {(canUpdate || canDelete) && (
                            <div className="flex items-center gap-[0.35vw] opacity-0 group-hover:opacity-100 transition-opacity">
                              {canUpdate && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setEditingSegment({ id: seg.id, _id: seg._id, name: seg.name })
                                  }
                                  className="p-[0.35vw] text-gray-500 hover:text-teal-600 hover:bg-teal-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                  title="Edit Segment"
                                >
                                  <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                                </button>
                              )}
                              {canDelete && (
                                <button
                                  type="button"
                                  onClick={() => handleDelete(seg.id, seg._id)}
                                  className="p-[0.35vw] text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                  title="Delete Segment"
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
            {filteredSegments.length > 0 && (
              <div className="border-t border-gray-100 px-[1vw] py-[0.55vw] bg-gray-50/50 flex justify-between items-center flex-shrink-0">
                <div className="text-[0.74vw] text-gray-500 font-medium">
                  Showing <span className="text-gray-900 font-semibold">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span> to <span className="text-gray-900 font-semibold">{Math.min(currentPage * ITEMS_PER_PAGE, filteredSegments.length)}</span> of <span className="text-gray-900 font-semibold">{filteredSegments.length}</span> segments
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
                              ? "bg-teal-600 text-white shadow-2xs"
                              : "bg-white border border-gray-200 text-gray-700 hover:border-teal-400 hover:text-teal-600"
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

        {/* Right Column: Quick Add / Help Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-[0.6vw] p-[1.2vw]">
          <div className="space-y-[1vw]">
            <div className="pb-[0.5vw] border-b border-gray-200">
              <h4 className="text-[0.88vw] font-bold text-gray-900 flex items-center gap-[0.4vw]">
                <Icon icon="solar:box-bold-duotone" className="w-[1.05vw] h-[1.05vw] text-teal-600" />
                Add Product Segment
              </h4>
              <p className="text-[0.7vw] text-gray-500">Define a new segment for ticket classification</p>
            </div>

            {canWrite ? (
              <div className="space-y-[0.8vw]">
                <div className="space-y-[0.35vw]">
                  <label className="text-[0.74vw] font-semibold text-gray-700">Segment Name *</label>
                  <input
                    type="text"
                    value={newSegmentName}
                    onChange={(e) => setNewSegmentName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="e.g. Inverters, Stabilizers, Batteries…"
                    className="w-full bg-white border border-gray-300 rounded-[0.4vw] px-[0.75vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100 transition-all font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newSegmentName.trim()}
                  className="w-full flex items-center justify-center gap-[0.4vw] bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Plus className="w-[0.9vw] h-[0.9vw]" /> Add Segment
                </button>
              </div>
            ) : (
              <div className="p-[2vw] text-center text-gray-400 text-[0.78vw] flex flex-col items-center justify-center gap-[0.4vw]">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1.8vw] h-[1.8vw] text-gray-300" />
                <span>Read-only access. You can view existing product segments on the left.</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
  

};

// ─────────────────────────────────────────────────────────────────────────────
// FourMCategoriesSection
// ─────────────────────────────────────────────────────────────────────────────

export default ProductSegmentsSection;
