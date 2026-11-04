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

const UnitsSection = ({ units, setUnits }) => {
  const { toast, confirm } = useNotification();
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);

  const handleAdd = async () => {
    const t = newTypeName.trim();
    if (!t) return;
    if (units.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Unit already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/units`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setUnits([...units, newItem]);
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
      units.some(
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
        units.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Unit updated");
    } catch (err) {
      toast("Failed to update unit", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const type = units.find((t) => t.id === id || t._id === mongoId);
    const confirmed = await confirm({
      title: "Delete Unit",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
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
        const remaining = units.filter((t) => t.id !== id && t._id !== mongoId);
        setUnits(remaining);
        toast("Unit deleted successfully");
      } catch (err) {
        toast("Failed to delete unit", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Existing Units
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {units.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No units yet
              </div>
            ) : (
              units.map((type, idx) => {
                const badgeClass =
                  TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                return (
                  <div
                    key={type.id}
                    className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors"
                  >
                    {editingType && (editingType._id === type._id || editingType.id === type.id) ? (
                      <div className="flex flex-1 items-center gap-[0.5vw]">
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
                          className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-blue-100"
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
                          onClick={() => setEditingType(null)}
                          className="p-[0.4vw] bg-slate-200 hover:bg-slate-300 text-slate-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span
                          className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${badgeClass}`}
                        >
                          {type.name}
                        </span>
                        
                        <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            type="button"
                            onClick={() =>
                              setEditingType({ id: type.id, _id: type._id, name: type.name })
                            }
                            className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                          >
                            <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(type.id, type._id)}
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
        <div className="flex flex-col gap-[0.8vw]">
          <div>
            <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
              Add New Unit
            </p>
            <div className="flex gap-[0.5vw]">
              <input
                type="text"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                placeholder="e.g. Nos, Kgs, Ltrs…"
                className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition-all"
              />
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newTypeName.trim()}
                className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white px-[0.9vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-semibold transition-all"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add
              </button>
            </div>
          </div>
          {units.length > 0 && (
            <div className="bg-slate-50 border border-slate-400 rounded-[0.4vw] p-[0.7vw]">
              <p className="text-[0.68vw] font-semibold text-gray-800 mb-[0.5vw]">
                Preview
              </p>
              <div className="flex flex-wrap gap-[0.4vw]">
                {units.map((type, idx) => (
                  <span
                    key={type.id}
                    className={`text-[0.72vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border ${TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length]}`}
                  >
                    {type.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};


// ─────────────────────────────────────────────────────────────────────────────
// SitesSection
// ─────────────────────────────────────────────────────────────────────────────

export default UnitsSection;
