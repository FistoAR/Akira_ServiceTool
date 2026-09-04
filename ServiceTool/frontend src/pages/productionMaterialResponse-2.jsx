// @ts-nocheck
import React, { useState, useEffect, useMemo } from "react";
import {
  Package, User, CheckCircle, AlertCircle, Eye, X,
  ChevronDown, ChevronUp, BarChart2, History, Search, Clock,
  Target, ClipboardList, Shield, AlertTriangle, FileText,
  Save, Calendar, Wrench, CheckCircle2, ArrowRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ── Storage ───────────────────────────────────────────────────────────────────
const PM_INWARD_KEY = "production_material_nc_v2";

const STATUS_OPTIONS = [
  "Received",
  "Under Testing / Repair in Progress",
  "Pending",
  "Completed / Not Repairable",
  "Delivered / Hold"
];

const STATUS_COLORS = {
  "Received": "bg-blue-50 text-blue-700 border-blue-200",
  "Under Testing / Repair in Progress": "bg-purple-50 text-purple-700 border-purple-200",
  "Pending": "bg-amber-50 text-amber-700 border-amber-200",
  "Completed / Not Repairable": "bg-emerald-50 text-emerald-700 border-emerald-200",
  "Delivered / Hold": "bg-slate-100 text-slate-700 border-slate-400",
};

// ── Helpers ───────────────────────────────────────────────────────────────────
const lsLoad = (key, fb = []) => { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fb; } catch { return fb; } };
const lsSave = (key, v) => localStorage.setItem(key, JSON.stringify(v));

const getCurrentUser = () => {
  for (const k of ["loggedInUser", "currentUser", "user", "akira_user"]) {
    for (const s of [sessionStorage, localStorage]) {
      try { const v = s.getItem(k); if (v) { const p = JSON.parse(v); if (p?.userId || p?.id || p?.name) return p; } } catch { }
    }
  }
  return null;
};

const fmtDate = (s) => {
  if (!s) return "—";
  const d = new Date(s);
  if (isNaN(d.getTime())) return s;
  return `${String(d.getDate()).padStart(2, "0")}-${String(d.getMonth() + 1).padStart(2, "0")}-${d.getFullYear()}`;
};

// Avatar component (matching ServiceMaterial style)
const AVATAR_COLORS = [
  "from-blue-400 to-blue-600",
  "from-purple-400 to-purple-600",
  "from-green-400 to-green-600",
  "from-orange-400 to-orange-600",
  "from-pink-400 to-pink-600",
  "from-teal-400 to-teal-600",
];
const avatarColor = (name = "") => {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
};
const initials = (name = "") =>
  name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "?";
const Avatar = ({ name, size = "md" }) => {
  const sz = {
    sm: "w-[1.4vw] h-[1.4vw] text-[0.52vw]",
    md: "w-[1.8vw] h-[1.8vw] text-[0.65vw]",
    lg: "w-[2.4vw] h-[2.4vw] text-[0.82vw]",
  };
  return (
    <div title={name} className={`rounded-full bg-gradient-to-br ${avatarColor(name)} flex items-center justify-center font-bold text-white flex-shrink-0 ${sz[size]}`}>
      {initials(name)}
    </div>
  );
};

// ── Technical Update Modal (Styled like ServiceMaterial) ─────────────────────
const UpdateModal = ({ item, currentUser, onClose, onUpdate }) => {
  const { entry, product, role } = item;
  const [form, setForm] = useState({
    problem: "",
    rootCause: "",
    correction: "",
    completionDate: new Date().toISOString().slice(0, 10),
    status: "Received"
  });

  useEffect(() => {
    if (product.responses?.[role]) {
      setForm(product.responses[role]);
    }
  }, [product, role]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.problem || !form.rootCause || !form.correction) return;
    const updatedProduct = {
      ...product,
      responses: {
        ...product.responses,
        [role]: { ...form, savedAt: new Date().toISOString(), savedBy: currentUser.name }
      }
    };
    const updatedEntry = {
      ...entry,
      products: entry.products.map(p => p._pid === product._pid ? updatedProduct : p),
      updatedAt: new Date().toISOString()
    };
    onUpdate(updatedEntry);
    onClose();
  };

  const roleLabel = role === "assembledBy" ? "Assembler" : role === "testedBy" ? "Tester" : "Final Inspector";
  const isClosed = entry.finalStatus === "Completed" || entry.finalStatus === "Rejected";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/30 backdrop-blur-[2px] p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white rounded-[0.8vw] shadow-2xl w-[55vw] max-h-[85vh] overflow-hidden flex flex-col border border-gray-400"
      >
        <div className="bg-blue-600 px-[1.5vw] py-[1vw] flex justify-between items-center">
          <div className="flex items-center gap-[0.8vw]">
            <div className="bg-white/20 p-[0.4vw] rounded-full"><ClipboardList className="w-[1.3vw] h-[1.3vw] text-white" /></div>
            <div>
              <h3 className="text-[0.9vw] font-bold text-white uppercase leading-none">Technical Response Form</h3>
              <p className="text-[0.65vw] text-white/80 mt-[0.2vw]">{entry.refNoInternal} · {roleLabel} Verification</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/80 hover:text-white p-[0.3vw] rounded-full hover:bg-white/10 transition-all cursor-pointer">
            <X className="w-[1.2vw] h-[1.2vw]" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-[1.5vw] space-y-[1.2vw]">
          <div className="grid grid-cols-3 gap-[1vw] bg-gray-50 p-[1vw] rounded-[0.4vw] border border-gray-400">
            <div>
              <span className="text-[0.6vw] font-semibold text-gray-500 uppercase">Product Name</span>
              <p className="text-[0.8vw] font-semibold text-gray-800 mt-[0.2vw]">{product.productDescription}</p>
            </div>
            <div>
              <span className="text-[0.6vw] font-semibold text-gray-500 uppercase">Job Order No</span>
              <p className="text-[0.8vw] font-semibold text-gray-800 mt-[0.2vw]">{product.jobOrderNo}</p>
            </div>
            <div>
              <span className="text-[0.6vw] font-semibold text-gray-500 uppercase">Customer</span>
              <p className="text-[0.8vw] font-semibold text-gray-800 mt-[0.2vw]">{product.customerName}</p>
            </div>
          </div>

          {isClosed ? (
            <div className="bg-emerald-50 border border-emerald-200 rounded-[0.5vw] p-[2vw] flex flex-col items-center gap-[0.5vw] text-center">
              <CheckCircle2 className="w-[2vw] h-[2vw] text-emerald-600" />
              <h4 className="text-[0.9vw] font-bold text-emerald-800 uppercase">Verification Closed</h4>
              <p className="text-[0.7vw] text-emerald-600">This entry has been locked by admin.</p>
            </div>
          ) : (
            <div className="space-y-[1vw]">
              <div className="grid grid-cols-2 gap-[1.2vw]">
                <div className="space-y-[1vw]">
                  <div>
                    <label className="text-[0.7vw] font-semibold text-gray-700 uppercase">Problem Identification <span className="text-red-500">*</span></label>
                    <textarea
                      rows={4}
                      value={form.problem}
                      onChange={e => setForm({ ...form, problem: e.target.value })}
                      placeholder="Detailed explanation of findings..."
                      className="w-full border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.78vw] text-gray-800 outline-none focus:border-blue-400 resize-none mt-[0.3vw]"
                    />
                  </div>
                  <div>
                    <label className="text-[0.7vw] font-semibold text-gray-700 uppercase">Root Cause Analysis <span className="text-red-500">*</span></label>
                    <textarea
                      rows={4}
                      value={form.rootCause}
                      onChange={e => setForm({ ...form, rootCause: e.target.value })}
                      placeholder="What caused this issue?"
                      className="w-full border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.78vw] text-gray-800 outline-none focus:border-blue-400 resize-none mt-[0.3vw]"
                    />
                  </div>
                </div>
                <div className="space-y-[1vw]">
                  <div>
                    <label className="text-[0.7vw] font-semibold text-gray-700 uppercase">Correction / Rework Details <span className="text-red-500">*</span></label>
                    <textarea
                      rows={4}
                      value={form.correction}
                      onChange={e => setForm({ ...form, correction: e.target.value })}
                      placeholder="What steps were taken to fix it?"
                      className="w-full border border-gray-400 rounded-[0.4vw] p-[0.6vw] text-[0.78vw] text-gray-800 outline-none focus:border-blue-400 resize-none mt-[0.3vw]"
                    />
                  </div>
                  <div>
                    <label className="text-[0.7vw] font-semibold text-gray-700 uppercase">Completion Date</label>
                    <input
                      type="date"
                      value={form.completionDate}
                      onChange={e => setForm({ ...form, completionDate: e.target.value })}
                      className="w-full border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] text-gray-800 outline-none focus:border-blue-400 mt-[0.3vw]"
                    />
                  </div>
                  <div>
                    <label className="text-[0.7vw] font-semibold text-gray-700 uppercase">Final Status Update</label>
                    <select
                      value={form.status}
                      onChange={e => setForm({ ...form, status: e.target.value })}
                      className="w-full border border-gray-400 rounded-[0.4vw] p-[0.5vw] text-[0.78vw] text-gray-800 outline-none focus:border-blue-400 mt-[0.3vw] bg-white"
                    >
                      {STATUS_OPTIONS.map(opt => <option key={opt}>{opt}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {!isClosed && (
          <div className="p-[1vw] border-t border-gray-400 bg-gray-50 flex justify-end gap-[0.8vw]">
            <button onClick={onClose} className="px-[1.5vw] py-[0.6vw] rounded-[0.4vw] text-[0.75vw] font-medium text-gray-600 hover:bg-gray-200 transition-all cursor-pointer">
              Cancel
            </button>
            <button onClick={handleSubmit} className="bg-blue-600 text-white rounded-[0.4vw] px-[2vw] py-[0.6vw] font-semibold text-[0.75vw] flex items-center gap-[0.5vw] shadow hover:bg-blue-700 active:scale-95 transition-all cursor-pointer">
              <Save className="w-[1vw] h-[1vw]" /> Submit Response
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};

// ── Main Component ───────────────────────────────────────────────────────────
export default function ProductionMaterialResponse() {
  const [data, setData] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [search, setSearch] = useState("");
  const [selectedItem, setSelectedItem] = useState(null);

  const reload = () => setData(lsLoad(PM_INWARD_KEY, []));
  useEffect(() => { reload(); const i = setInterval(reload, 5000); return () => clearInterval(i); }, []);
  useEffect(() => { setCurrentUser(getCurrentUser()); }, []);
  const uid = currentUser?.userId || currentUser?.id;

  const myAssignedItems = useMemo(() => {
    if (!uid) return [];
    const list = [];
    data.forEach(entry => {
      entry.products?.forEach(prod => {
        if (prod.assembledBy === uid) list.push({ entry, product: prod, role: "assembledBy" });
        if (prod.testedBy === uid) list.push({ entry, product: prod, role: "testedBy" });
        if (prod.fiBy === uid) list.push({ entry, product: prod, role: "fiBy" });
      });
    });
    return list;
  }, [data, uid]);

  const filtered = useMemo(() => {
    let f = myAssignedItems;
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(x =>
        (x.product.jobOrderNo || "").toLowerCase().includes(q) ||
        (x.product.productDescription || "").toLowerCase().includes(q) ||
        (x.product.customerName || "").toLowerCase().includes(q) ||
        (x.entry.refNoInternal || "").toLowerCase().includes(q)
      );
    }
    return f;
  }, [myAssignedItems, search]);

  const handleUpdate = (updatedEntry) => {
    const all = lsLoad(PM_INWARD_KEY, []);
    const newData = all.map(d => d.id === updatedEntry.id ? updatedEntry : d);
    lsSave(PM_INWARD_KEY, newData);
    setData(newData);
  };

  return (
    <div className="w-full flex flex-col h-full bg-gray-50 p-[1.2vw] gap-[0.8vw]">
      {/* Header */}
      <div className="flex justify-between items-end border-b border-gray-400 pb-[0.8vw]">
        <div>
          <h1 className="text-[1.1vw] font-bold text-gray-900 flex items-center gap-[0.6vw] uppercase ">
            <ClipboardList className="w-[1.4vw] h-[1.4vw] text-blue-600" /> Daily Technical Response Board
          </h1>
          <p className="text-gray-500 text-[0.7vw] font-normal leading-none mt-[0.2vw] italic">
            Production Environment Assignment Pipeline
          </p>
        </div>
        <div className="flex items-center gap-[1.5vw]">

          <div className="relative">
            <Search className="absolute left-[0.8vw] top-1/2 -translate-y-1/2 w-[0.9vw] h-[0.9vw] text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Filter assignments..."
              className="pl-[2.2vw] pr-[1vw] py-[0.5vw] w-[18vw] border border-gray-400 rounded-[0.4vw] text-[0.78vw] text-gray-700 outline-none focus:border-blue-400 bg-white"
            />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 bg-white border border-gray-400 rounded-[0.6vw] shadow-sm overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-blue-50 border-b border-gray-400 sticky top-0 z-10">
              <tr className="text-[0.7vw] text-gray-800 font-semibold uppercase">
                <th className="px-[1.2vw] py-[0.8vw] w-[12%] border-r border-gray-400">Reg Details</th>
                <th className="px-[1.2vw] py-[0.8vw] w-[25%] border-r border-gray-400">Product & Identification</th>
                <th className="px-[1.2vw] py-[0.8vw] w-[15%] border-r border-gray-400">Customer</th>
                <th className="px-[1.2vw] py-[0.8vw] w-[10%] border-r border-gray-400">My Role</th>
                <th className="px-[1.2vw] py-[0.8vw] w-[20%] border-r border-gray-400">Submission Status</th>
                <th className="px-[1.2vw] py-[0.8vw] w-[8%] text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-300">
              {filtered.length > 0 ? filtered.map((item, idx) => {
                const response = item.product.responses?.[item.role];
                const roleLabel = item.role === "assembledBy" ? "Assembler" : item.role === "testedBy" ? "Tester" : "FI";
                const isClosed = item.entry.finalStatus === "Completed" || item.entry.finalStatus === "Rejected";
                const statusColorClass = response ? (STATUS_COLORS[response.status] || "bg-gray-100 text-gray-700 border-gray-400") : "";

                return (
                  <tr key={`${item.entry.id}-${item.product._pid}-${item.role}`} className="group hover:bg-blue-50/30 transition-colors">
                    <td className="px-[1.2vw] py-[1vw] border-r border-gray-400">
                      <div className="text-[0.75vw] font-semibold text-gray-800 uppercase">{item.entry.refNoInternal}</div>
                      <div className="text-[0.6vw] font-normal text-gray-500 mt-[0.1vw]">{fmtDate(item.entry.date)}</div>
                    </td>
                    <td className="px-[1.2vw] py-[1vw] border-r border-gray-400">
                      <div className="text-[0.78vw] font-semibold text-gray-800 truncate" title={item.product.productDescription}>{item.product.productDescription}</div>
                      <div className="flex items-center gap-[0.4vw] mt-[0.2vw] flex-wrap">
                        <span className="text-[0.6vw] font-medium text-gray-600 border border-gray-400 px-[0.3vw] py-[0.05vw] rounded bg-gray-50">{item.product.jobOrderNo}</span>
                        <span className="text-[0.6vw] font-normal text-gray-500">ID: {item.product.identification || "—"}</span>
                      </div>
                    </td>
                    <td className="px-[1.2vw] py-[1vw] border-r border-gray-400">
                      <div className="text-[0.75vw] font-semibold text-gray-700 truncate" title={item.product.customerName}>{item.product.customerName}</div>
                      <div className="text-[0.55vw] font-normal text-gray-500 mt-[0.1vw]">{item.product.category || "General"}</div>
                    </td>
                    <td className="px-[1.2vw] py-[1vw] border-r border-gray-400">
                      <span className="bg-blue-600 text-white px-[0.5vw] py-[0.15vw] rounded-[0.2vw] text-[0.6vw] font-medium uppercase ">{roleLabel}</span>
                    </td>
                    <td className="px-[1.2vw] py-[1vw] border-r border-gray-400">
                      {response ? (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className={`w-[0.4vw] h-[0.4vw] rounded-full ${response.status === 'Completed / Not Repairable' ? 'bg-emerald-500' : 'bg-blue-500'}`} />
                          <span className={`text-[0.68vw] font-medium uppercase border px-[0.4vw] py-[0.1vw] rounded-full ${statusColorClass}`}>
                            {response.status}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-[0.5vw]">
                          <div className="w-[0.4vw] h-[0.4vw] rounded-full bg-amber-500 animate-pulse" />
                          <span className="text-[0.68vw] font-medium text-amber-700 uppercase">Awaiting Action</span>
                        </div>
                      )}
                      {isClosed && (
                        <div className="text-[0.5vw] text-red-600 font-medium mt-[0.2vw] flex items-center gap-[0.2vw]">
                          <AlertCircle className="w-[0.6vw] h-[0.6vw]" /> Registration Locked
                        </div>
                      )}
                    </td>
                    <td className="px-[1.2vw] py-[1vw] text-center">
                      <button
                        onClick={() => setSelectedItem(item)}
                        className="p-[0.4vw] rounded-full text-gray-400 hover:text-blue-600 hover:bg-blue-100 transition-all cursor-pointer"
                        title="View / Submit Response"
                      >
                        <Eye className="w-[1.1vw] h-[1.1vw]" />
                      </button>
                    </td>
                  </tr>
                );
              }) : (
                <tr>
                  <td colSpan={6} className="py-[10vh] text-center">
                    <div className="flex flex-col items-center gap-[0.6vw]">
                      <BarChart2 className="w-[3vw] h-[3vw] text-gray-300" />
                      <div className="text-[0.8vw] font-medium text-gray-400 uppercase">No assignments found</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedItem && (
          <UpdateModal
            item={selectedItem}
            currentUser={currentUser}
            onClose={() => setSelectedItem(null)}
            onUpdate={handleUpdate}
          />
        )}
      </AnimatePresence>

      {/* Helper note for report data */}
      <div className="text-[0.6vw] text-gray-400 border-t border-gray-400 pt-[0.6vw] mt-[0.2vw] flex justify-center gap-[1vw]">
        <span className="flex items-center gap-[0.3vw]"><div className="w-[0.5vw] h-[0.5vw] rounded-full bg-blue-500"></div> Submitted responses appear in Technical Reports</span>
        <span className="flex items-center gap-[0.3vw]"><div className="w-[0.5vw] h-[0.5vw] rounded-full bg-amber-500 animate-pulse"></div> Pending submissions</span>
      </div>
    </div>
  );
}