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
  LEVEL_BG_LIGHT, DURATION_PRESETS, HelpTooltip, DEFAULT_COL_VIS,
  loadCustomerDb
} from "./masterConstants";

const ProductSegmentsSection = ({ segments, setSegments }) => {
  const { toast, confirm } = useNotification();
  const [newSegmentName, setNewSegmentName] = useState("");
  const [editingSegment, setEditingSegment] = useState(null);
  const db = loadCustomerDb();

  const save = async (items) => {
    setSegments(items);
  };

  const handleAdd = async () => {
    const t = newSegmentName.trim();
    if (!t) return;
    if (segments.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Segment already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/product-segments`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setSegments([...segments, newItem]);
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
      segments.some(
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
        segments.map((x) => (x.id === editingSegment.id || x._id === editingSegment._id ? updatedItem : x)),
      );
      setEditingSegment(null);
      toast("Segment updated");
    } catch (err) {
      toast("Failed to update segment", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const segment = segments.find((s) => s.id === id || s._id === mongoId);
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
        setSegments(segments.filter((s) => s.id !== id && s._id !== mongoId));
        toast("Product segment removed");
      } catch (err) {
        toast("Failed to delete segment", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Active Segments
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {segments.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No segments defined
              </div>
            ) : (
              segments.map((seg, idx) => {
                const usageCount = db.filter(
                  (r) => r.productSegment === seg.name,
                ).length;
                return (
                  <div
                    key={seg.id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors"
                  >
                    {editingSegment && (editingSegment._id === seg._id || editingSegment.id === seg.id) ? (
                      <div className="flex-1 flex gap-2">
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
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none shadow-sm"
                        />
                        <button
                          onClick={handleUpdate}
                          className="p-[0.4vw] bg-emerald-600 text-white rounded-[0.3vw] cursor-pointer"
                        >
                          <Check className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                        <button
                          onClick={() => setEditingSegment(null)}
                          className="p-[0.4vw] bg-slate-200 text-slate-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1 flex items-center gap-[0.4vw]">
                          <span className="text-[0.78vw] font-bold text-slate-800">
                            {seg.name}
                          </span>
                          {seg.isFromDb && (
                            <span className="text-[0.58vw] bg-amber-50 text-amber-600 border border-amber-200 px-[0.4vw] py-[0.05vw] rounded-full font-bold">
                              FOUND IN CUSTOMERS
                            </span>
                          )}
                        </div>
                       
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() =>
                              setEditingSegment({ id: seg.id, _id: seg._id, name: seg.name })
                            }
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            onClick={() => handleDelete(seg.id, seg._id)}
                            className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Add New Segment</p>
          <div className="flex gap-[0.5vw]">
            <input
              type="text"
              value={newSegmentName}
              onChange={(e) => setNewSegmentName(e.target.value)}
              placeholder="e.g. Inverters, Stabilizers…"
              className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 transition-all font-semibold"
            />
            <button onClick={handleAdd} disabled={!newSegmentName.trim()} className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-bold">
              <Plus className="w-[0.9vw] h-[0.9vw]" /> Add
            </button>
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
