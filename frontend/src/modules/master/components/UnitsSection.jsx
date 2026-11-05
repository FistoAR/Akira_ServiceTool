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

const UnitsSection = ({ units = [], setUnits }) => {
  const { canWrite, canUpdate, canDelete } = useModulePermissions("units");
  const safeUnits = Array.isArray(units) ? units : [];
  const { toast, confirm } = useNotification();
  const [newTypeName, setNewTypeName] = useState("");
  const [editingType, setEditingType] = useState(null);

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
        const remaining = safeUnits.filter((t) => t.id !== id && t._id !== mongoId);
        setUnits(remaining);
        toast("Unit deleted successfully");
      } catch (err) {
        toast("Failed to delete unit", "error");
      }
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-white">
      <div className="p-[1.4vw] grid grid-cols-1 lg:grid-cols-12 gap-[1.8vw] items-start">
        {/* Left Column: Units List */}
        <div className="lg:col-span-7 flex flex-col">
          <div className="flex items-center justify-between pb-[0.6vw] mb-[0.6vw] border-b border-gray-100">
            <div>
              <h3 className="text-[0.88vw] font-bold text-gray-900">Configured Units of Measurement</h3>
              <p className="text-[0.72vw] text-gray-500">Inventory and material measurement units</p>
            </div>
            <span className="text-[0.7vw] font-semibold text-gray-500 bg-gray-100 px-[0.6vw] py-[0.2vw] rounded-full">
              {safeUnits.length} total
            </span>
          </div>

          <div className="divide-y divide-gray-100 border border-gray-200 rounded-[0.6vw] bg-white overflow-hidden max-h-[60vh] overflow-y-auto">
            {safeUnits.length === 0 ? (
              <div className="p-[3vw] text-center text-gray-400 text-[0.8vw]">
                No units configured yet.
              </div>
            ) : (
              safeUnits.map((type, idx) => {
                const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                const isEditingThis = editingType && (editingType._id === type._id || editingType.id === type.id);
                return (
                  <div
                    key={type.id || type._id || idx}
                    className={`flex items-center justify-between px-[1vw] py-[0.75vw] transition-colors group ${
                      isEditingThis ? "bg-emerald-50/70" : "hover:bg-gray-50/70"
                    }`}
                  >
                    {isEditingThis ? (
                      <div className="flex-1 flex items-center gap-[0.5vw]">
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
                          className="flex-1 bg-white border border-emerald-400 rounded-[0.35vw] px-[0.6vw] py-[0.35vw] text-[0.82vw] outline-none ring-2 ring-emerald-100 font-medium"
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
                          className="p-[0.4vw] bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-[0.3vw] cursor-pointer"
                        >
                          <X className="w-[0.85vw] h-[0.85vw]" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center gap-[0.65vw]">
                          <span className="w-[1.6vw] h-[1.6vw] rounded-full bg-emerald-50 text-emerald-700 flex items-center justify-center text-[0.72vw] font-bold">
                            {idx + 1}
                          </span>
                          <span className={`text-[0.76vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.35vw] border ${badgeClass}`}>
                            {type.name}
                          </span>
                        </div>

                        {(canUpdate || canDelete) && (
                          <div className="flex items-center gap-[0.35vw] opacity-0 group-hover:opacity-100 transition-opacity">
                            {canUpdate && (
                              <button
                                type="button"
                                onClick={() =>
                                  setEditingType({ id: type.id, _id: type._id, name: type.name })
                                }
                                className="p-[0.35vw] text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                title="Edit Unit"
                              >
                                <Icon icon="solar:pen-new-square-linear" className="w-[0.95vw] h-[0.95vw]" />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                type="button"
                                onClick={() => handleDelete(type.id, type._id)}
                                className="p-[0.35vw] text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded-[0.3vw] transition-colors cursor-pointer"
                                title="Delete Unit"
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
        </div>

        {/* Right Column: Quick Add Workspace */}
        <div className="lg:col-span-5 bg-gray-50/60 border border-gray-200 rounded-[0.6vw] p-[1.2vw]">
          <div className="space-y-[1vw]">
            <div className="pb-[0.5vw] border-b border-gray-200">
              <h4 className="text-[0.88vw] font-bold text-gray-900 flex items-center gap-[0.4vw]">
                <Icon icon="solar:tuning-2-bold-duotone" className="w-[1.05vw] h-[1.05vw] text-emerald-600" />
                Add Measurement Unit
              </h4>
              <p className="text-[0.7vw] text-gray-500">Define measurement units for service parts</p>
            </div>

            {canWrite ? (
              <div className="space-y-[0.8vw]">
                <div className="space-y-[0.35vw]">
                  <label className="text-[0.74vw] font-semibold text-gray-700">Unit Name *</label>
                  <input
                    type="text"
                    value={newTypeName}
                    onChange={(e) => setNewTypeName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAdd();
                    }}
                    placeholder="e.g. Nos, Kgs, Ltrs, Sets…"
                    className="w-full bg-white border border-gray-300 rounded-[0.4vw] px-[0.75vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all font-medium"
                  />
                </div>

                <button
                  type="button"
                  onClick={handleAdd}
                  disabled={!newTypeName.trim()}
                  className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white py-[0.5vw] rounded-[0.4vw] text-[0.82vw] font-semibold transition-all cursor-pointer shadow-sm"
                >
                  <Icon icon="solar:add-circle-linear" className="w-[0.9vw] h-[0.9vw]" /> Add Unit
                </button>
              </div>
            ) : (
              <div className="p-[2vw] text-center text-gray-400 text-[0.78vw] flex flex-col items-center justify-center gap-[0.4vw]">
                <Icon icon="solar:lock-keyhole-bold-duotone" className="w-[1.8vw] h-[1.8vw] text-gray-300" />
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
