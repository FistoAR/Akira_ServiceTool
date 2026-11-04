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

const FourMCategoriesSection = ({ items, setItems }) => {
  const { toast, confirm } = useNotification();
  const [newName, setNewName] = useState("");
  const [editingItem, setEditingItem] = useState(null);

  const handleAdd = async () => {
    const t = newName.trim();
    if (!t) return;
    if (items.some((x) => x.name.toLowerCase() === t.toLowerCase())) {
      toast("4M Category already exists!", "error");
      return;
    }
    try {
      const res = await axios.post(`${API_URL}/master/four-m-categories`, { name: t });
      const newItem = { ...res.data, id: res.data._id };
      setItems([...items, newItem]);
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
      items.some(
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
        items.map((x) => (x.id === editingItem.id || x._id === editingItem._id ? updatedItem : x)),
      );
      setEditingItem(null);
      toast("4M Category updated");
    } catch (err) {
      toast("Failed to update 4M Category", "error");
    }
  };

  const handleDelete = async (id, mongoId) => {
    const item = items.find((s) => s.id === id || s._id === mongoId);
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
        const remaining = items.filter((t) => t.id !== id && t._id !== mongoId);
        setItems(remaining);
        toast("4M Category deleted successfully");
      } catch (err) {
        toast("Failed to delete 4M Category", "error");
      }
    }
  };

  return (
    <div>
      <div className="p-[1.2vw] grid grid-cols-2 gap-[1.5vw]">
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Existing 4M Categories</p>
          <div className="border border-slate-400 rounded-[0.5vw] max-h-[64vh] min-h-[64vh] overflow-auto">
            {items.length === 0 ? (
              <div className="p-[2vw] text-center text-slate-400 text-[0.78vw]">No 4M Categories yet</div>
            ) : (
              items.map((seg) => (
                <div key={seg.id} className="flex items-center gap-[0.8vw] px-[0.9vw] py-[0.65vw] hover:bg-slate-50 border-b border-slate-400 last:border-0 group transition-colors">
                  {editingItem && (editingItem._id === seg._id || editingItem.id === seg.id) ? (
                    <div className="flex flex-1 items-center gap-[0.5vw]">
                      <input autoFocus type="text" value={editingItem.name} onChange={(e) => setEditingItem({ ...editingItem, name: e.target.value })} className="flex-1 border border-blue-300 rounded-[0.3vw] px-[0.5vw] py-[0.35vw] text-[0.82vw] outline-none shadow-sm" />
                      <button onClick={handleUpdate} className="p-[0.4vw] bg-emerald-600 text-white rounded-[0.3vw] cursor-pointer"><Check className="w-[0.85vw] h-[0.85vw]" /></button>
                      <button onClick={() => setEditingItem(null)} className="p-[0.4vw] bg-slate-200 text-slate-600 rounded-[0.3vw] cursor-pointer"><X className="w-[0.85vw] h-[0.85vw]" /></button>
                    </div>
                  ) : (
                    <>
                      <div className="flex-1 flex items-center gap-[0.4vw]">
                        <span className="text-[0.78vw] font-bold text-slate-800">{seg.name}</span>
                      </div>
                      <div className="flex gap-[0.3vw] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => setEditingItem({ id: seg.id, _id: seg._id, name: seg.name })} className="p-[0.35vw] text-blue-500 hover:bg-blue-50 rounded-[0.25vw] cursor-pointer"><Edit2 className="w-[0.85vw] h-[0.85vw]" /></button>
                        <button onClick={() => handleDelete(seg.id, seg._id)} className="p-[0.35vw] text-red-400 hover:bg-red-50 rounded-[0.25vw] cursor-pointer"><Trash2 className="w-[0.85vw] h-[0.85vw]" /></button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
        <div>
          <p className="text-[0.75vw] font-semibold text-gray-800 uppercase tracking-wide mb-[0.6vw]">Add New 4M Category</p>
          <div className="flex gap-[0.5vw]">
            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Man, Machine…" className="flex-1 border border-slate-400 rounded-[0.4vw] px-[0.7vw] py-[0.5vw] text-[0.82vw] outline-none focus:border-blue-400 transition-all font-semibold" />
            <button onClick={handleAdd} disabled={!newName.trim()} className="flex items-center gap-[0.4vw] bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white px-[1vw] py-[0.5vw] rounded-[0.4vw] cursor-pointer text-[0.8vw] font-bold"><Plus className="w-[0.9vw] h-[0.9vw]" /> Add</button>
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
