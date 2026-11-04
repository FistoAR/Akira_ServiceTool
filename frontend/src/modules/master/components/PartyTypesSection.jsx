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

const PartyTypesSection = ({ partyTypes, setPartyTypes }) => {
  const { toast, confirm } = useNotification();
  const [newType, setNewType] = useState({
    name: ""
  });
  const [editingType, setEditingType] = useState(null);

  const handleAdd = async () => {
    const t = newType.name.trim();
    if (!t) return;
    if (partyTypes.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/party-types`, newType);
      const newItem = { ...res.data, id: res.data._id };
      setPartyTypes([...partyTypes, newItem]);
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
      partyTypes.some(
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
        partyTypes.map((x) => (x.id === editingType.id || x._id === editingType._id ? updatedItem : x)),
      );
      setEditingType(null);
      toast("Category updated");
    } catch (err) {
      toast("Failed to update category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    if (partyTypes.length === 1) {
      toast("Cannot delete the last category!", "warning");
      return;
    }
    const type = partyTypes.find((t) => t.id === id || t._id === mongoId);
    const usageCount = loadCustomerDb().filter((r) => r.partyType === type.name).length;

    const confirmed = await confirm({
      title: "Delete Category",
      message: (
        <div className="flex flex-col gap-[0.5vw]">
          <p>Are you sure you want to delete <span className="font-bold text-slate-900">"{type.name}"</span>?</p>
          {usageCount > 0 && (
            <div className="p-[0.8vw] bg-amber-50 border border-amber-200 rounded-[0.4vw]">
               <p className="text-amber-700 font-semibold flex items-center gap-[0.4vw]">
                <AlertTriangle className="w-[1vw] h-[1vw]" /> {usageCount} records affected
              </p>
              <p className="text-amber-600 text-[0.75vw] mt-[0.2vw]">These records will be automatically reassigned to the first available category.</p>
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
        const remaining = partyTypes.filter((t) => t.id !== id && t._id !== mongoId);
        setPartyTypes(remaining);
        toast("Category deleted successfully");
      } catch (err) {
        toast("Failed to delete category", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">
            Existing Categories
          </p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {partyTypes.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">
                No categories yet
              </div>
            ) : (
              partyTypes.map((type, idx) => {
                const badgeClass = TYPE_BADGE_COLORS[idx % TYPE_BADGE_COLORS.length];
                return (
                  <div
                    key={type.id || type._id}
                    className={`flex items-center justify-between px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors ${
                      editingType && (editingType._id === type._id || editingType.id === type.id)
                        ? "bg-blue-50/50 border-l-4 border-l-blue-600"
                        : ""
                    }`}
                  >
                    <div className="flex flex-col gap-[0.2vw]">
                      <span className={`text-[0.75vw] font-semibold px-[0.6vw] py-[0.2vw] rounded-[0.3vw] border w-fit ${badgeClass}`}>
                        {type.name}
                      </span>
                    </div>
                    
                    <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setEditingType({ ...type })}
                        className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"
                      >
                        <Edit2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(type.id, type._id)}
                        className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"
                        disabled={partyTypes.length === 1}
                      >
                        <Trash2 className="w-[0.85vw] h-[0.85vw]" />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="flex flex-col gap-[0.8vw] bg-white border border-slate-400 rounded-[0.6vw] p-[1vw]">
          <p className="text-[0.85vw] font-bold text-slate-800 border-b border-slate-200 pb-[0.3vw] flex items-center gap-[0.4vw]">
            {editingType ? (
              <>
                <Edit2 className="w-[1vw] h-[1vw] text-blue-600" />
                Edit Category: {editingType.name}
              </>
            ) : (
              <>
                <Plus className="w-[1vw] h-[1vw] text-emerald-600" />
                Add New Category
              </>
            )}
          </p>

          <div className="space-y-[0.8vw]">
            <div className="space-y-[0.3vw]">
              <label className="text-[0.72vw] font-semibold text-slate-600">Category Name *</label>
              <input
                type="text"
                value={editingType ? editingType.name : newType.name}
                onChange={(e) =>
                  editingType
                    ? setEditingType({ ...editingType, name: e.target.value })
                    : setNewType({ ...newType, name: e.target.value })
                }
                placeholder="e.g. Domestic, Export..."
                className="w-full border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.4vw] text-[0.8vw] outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="flex gap-[0.5vw] mt-[0.5vw]">
            {editingType ? (
              <>
                <button
                  type="button"
                  onClick={handleUpdate}
                  disabled={!editingType.name.trim()}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => setEditingType(null)}
                  className="flex-1 bg-slate-200 hover:bg-slate-300 text-slate-700 py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={handleAdd}
                disabled={!newType.name.trim()}
                className="w-full flex items-center justify-center gap-[0.4vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white py-[0.4vw] rounded-[0.4vw] text-[0.8vw] font-semibold transition-all cursor-pointer"
              >
                <Plus className="w-[0.85vw] h-[0.85vw]" /> Add Category
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────

export default PartyTypesSection;
