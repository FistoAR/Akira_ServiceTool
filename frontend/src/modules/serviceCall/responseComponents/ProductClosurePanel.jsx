import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Wrench,
  CheckCircle,
  Clock,
  MapPin,
  HelpCircle,
  Loader2,
  Calendar,
  X,
  FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AssignVisitModal } from "./AssignVisitModal";
import { API_URL, RESOLUTION_TYPES } from "./ResponseConstants";

const ProductClosurePanel = ({
  prod,
  prodIdx,
  entry,
  currentUser,
  employees: propsEmployees,
  onAssignFieldVisit,
  onProductClose,
  onSupportRequest,
  onProductAttend,
  isPendingTab,
  isSupportDeskAsked,
  isSupportDeskAssigned,
}) => {
  const existing = prod._productClosure || {};
  const saved = existing.status;
  const [selected, setSelected] = useState("");
  const [remarks, setRemarks] = useState(existing.remarks || "");
  const [notes, setNotes] = useState(""); // For Support Request
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const dropdownRef = useRef(null);

  // Click outside listener to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (saved === "Closed")
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="mt-[0.6vw] bg-gradient-to-r from-emerald-50 to-teal-50/30 border border-emerald-350 rounded-[0.5vw] px-[0.8vw] py-[0.5vw] flex items-center gap-[0.6vw] shadow-sm"
      >
        <CheckCircle className="w-[0.9vw] h-[0.9vw] text-emerald-700 flex-shrink-0" />
        <span className="text-[0.75vw] font-bold text-emerald-800">
          Resolved & Closed
        </span>
        {existing.remarks && (
          <span className="text-[0.7vw] text-emerald-700 truncate opacity-95 italic font-bold">
            · {existing.remarks}
          </span>
        )}
      </motion.div>
    );

  const handleUpdate = async (status, extra = {}) => {
    if (status === "Resolved" && !remarks.trim()) {
      alert("Resolution details required.");
      return;
    }
    if (status === "Pending" && !remarks.trim()) {
      alert("Reason required for pending.");
      return;
    }

    if (status === "Returned") {
      if (!remarks.trim()) {
        alert("Please provide a reason for returning this request.");
        return;
      }
      setIsSubmitting(true);
      try {
        await onProductClose(prodIdx, {
          status: "Returned from Support",
          remarks,
          returnToAssigned: true,
          updatedAt: new Date().toISOString(),
        });
        setSelected("");
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    const data = {
      status,
      remarks,
      ...extra,
      updatedAt: new Date().toISOString(),
    };

    setIsSubmitting(true);
    try {
      await onProductClose(prodIdx, data);
      setSelected("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSupport = async () => {
    if (!selectedPerson) {
      alert("Please select a support person.");
      return;
    }
    if (!notes.trim()) {
      alert("Please add handover notes.");
      return;
    }
    setIsSubmitting(true);
    try {
      await onSupportRequest(prodIdx, { supportPerson: selectedPerson, notes });
      setSelected("");
    } finally {
      setIsSubmitting(false);
    }
  };

  const candidates = useMemo(() => {
    const emps = propsEmployees || load(EMPLOYEES_KEY, []);
    const q = search.toLowerCase();
    return emps.filter(
      (e) =>
        e.userId !== currentUser?.userId &&
        e.role?.toLowerCase() === "user" &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)),
    );
  }, [currentUser, search, propsEmployees]);

  const tabs = [
    (!isSupportDeskAsked || !prod._supportPersonId) &&
      !isSupportDeskAssigned && {
        k: "Open",
        l: "Support",
        e: "🔄",
        c: "bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md shadow-blue-600/15",
      },
    !isPendingTab &&
      !isSupportDeskAsked &&
      !isSupportDeskAssigned && {
        k: "Pending",
        l: "Pending",
        e: "⏸",
        c: "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-md shadow-amber-500/15",
      },
    {
      k: "FVRequired",
      l: "Field Visit",
      e: "📍",
      c: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/15",
    },
    {
      k: "Resolved",
      l: "Resolve",
      e: "✓",
      c: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/15",
    },
    isSupportDeskAssigned && {
      k: "Returned",
      l: "Return to Assigned Person",
      e: "🔙",
      c: "bg-gradient-to-r from-rose-500 to-red-500 text-white shadow-md shadow-rose-500/15",
    },
  ].filter(Boolean);

  const isAnyUserProductAttended = entry.products?.some(
    (p) => p._assignedEngineerId === currentUser?.userId && p._attended,
  );

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.6vw]">
      {/* Attendance Guard */}
      {!isAnyUserProductAttended && !prod._attended ? (
        <motion.div
          initial={{ scale: 0.98, opacity: 0.9 }}
          animate={{ scale: 1, opacity: 1 }}
          className="bg-gradient-to-br from-indigo-50/70 via-blue-50/20 to-slate-50 border border-indigo-300 rounded-[0.6vw] p-[1.2vw] flex flex-col items-center justify-center text-center gap-[0.6vw] shadow-sm relative overflow-hidden"
        >
          <div className="absolute -right-[1vw] -top-[1vw] w-[4vw] h-[4vw] bg-indigo-500/5 rounded-full blur-xl pointer-events-none" />
          <div className="w-[2.2vw] h-[2.2vw] rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 shadow-inner">
            <Play className="w-[1.1vw] h-[1.1vw] fill-indigo-650 animate-pulse ml-[0.1vw]" />
          </div>
          <div>
            <div className="text-[0.85vw] font-black text-slate-800 ">
              Attend this Service Call
            </div>
            <p className="text-[0.82vw] text-slate-650 mt-[0.15vw] max-w-[90%] mx-auto font-bold">
              Acknowledge and attend to halt the auto-escalation timer.
            </p>
          </div>
          <button
            disabled={isSubmitting}
            onClick={async () => {
              setIsSubmitting(true);
              try {
                await onProductAttend(prodIdx);
              } finally {
                setIsSubmitting(false);
              }
            }}
            className="w-full py-[0.55vw] bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 disabled:opacity-70 text-white rounded-[0.5vw] font-bold text-[0.85vw] transition-all duration-300 transform active:scale-95 shadow-md shadow-indigo-600/15 cursor-pointer flex items-center justify-center gap-[0.4vw]"
          >
            {isSubmitting ? (
              <Loader2 className="w-[0.85vw] h-[0.85vw] animate-spin" />
            ) : (
              <CheckSquare className="w-[0.85vw] h-[0.85vw]" />
            )}
            Acknowledge & Attend
          </button>
        </motion.div>
      ) : (
        <>
          <div
            className={`grid gap-[0.4vw] ${tabs.length === 4 ? "grid-cols-4" : tabs.length === 3 ? "grid-cols-3" : tabs.length === 2 ? "grid-cols-2" : "grid-cols-1"}`}
          >
            {tabs.map((t) => (
              <button
                key={t.k}
                onClick={() => setSelected(selected === t.k ? "" : t.k)}
                className={`py-[0.5vw] text-[0.85vw] font-bold rounded-[0.5vw] border transition-all cursor-pointer flex items-center justify-center gap-[0.3vw] ${selected === t.k ? `${t.c}` : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400"}`}
              >
                <span className="text-[0.78vw]">{t.e}</span>
                <span>{t.l}</span>
              </button>
            ))}
          </div>

          <AnimatePresence>
            {selected === "Open" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-blue-50 border border-blue-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-visible shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-blue-900  ">
                  Request Support / Escalate
                </div>
                <div className="flex flex-col gap-[0.5vw]">
                  <div className="relative" ref={dropdownRef}>
                    <div className="absolute inset-y-0 left-0 pl-[0.8vw] flex items-center pointer-events-none">
                      <Search className="h-[0.9vw] w-[0.9vw] text-slate-400" />
                    </div>
                    <input
                      type="text"
                      value={search}
                      onFocus={() => setShowDropdown(true)}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setSelectedPerson(null);
                        setShowDropdown(true);
                      }}
                      placeholder="Search person or department..."
                      className="w-full border border-slate-400 rounded-[0.5vw] pl-[2vw] pr-[0.7vw] py-[0.5vw] text-[0.75vw] font-bold outline-none bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm"
                    />
                    {showDropdown && candidates.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 border border-slate-400 bg-white rounded-b-[0.5vw] max-h-[12vw] overflow-y-auto divide-y divide-slate-200 shadow-lg mt-[-0.1vw]">
                        {candidates.map((emp) => (
                          <div
                            key={emp.userId}
                            onClick={() => {
                              setSelectedPerson(emp);
                              setSearch(emp.name);
                              setShowDropdown(false);
                            }}
                            className={`px-[0.7vw] py-[0.6vw] text-[0.72vw] font-bold cursor-pointer hover:bg-blue-50/65 flex justify-between items-center transition-colors ${selectedPerson?.userId === emp.userId ? "bg-blue-55 text-blue-950 font-black border-l-2 border-blue-600" : "text-slate-800"}`}
                          >
                            <span>
                              {emp.name} ({emp.department})
                            </span>
                            {selectedPerson?.userId === emp.userId && (
                              <CheckCircle className="w-[0.75vw] h-[0.75vw] text-blue-750" />
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <textarea
                    rows="2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Provide handover notes..."
                    className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-blue-400 focus:ring-4 focus:ring-blue-100 transition-all shadow-sm resize-none"
                  />
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={handleSupport}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Assign Support Person
                </button>
              </motion.div>
            )}

            {selected === "Resolved" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-emerald-50 border border-emerald-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-emerald-900  ">
                  Resolution Details
                </div>
                <textarea
                  rows="3"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter details of fixed parts, logical adjustments, or resolution explanation..."
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.8vw] text-[0.78vw] font-semibold outline-none bg-white focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Resolved")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm Resolution
                </button>
              </motion.div>
            )}

            {selected === "Pending" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-amber-50 border border-amber-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-amber-900  ">
                  Pending Reason
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Why is this call pending? (e.g., waiting for parts, client unavailable)"
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-amber-400 focus:ring-4 focus:ring-amber-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Pending")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-amber-600 hover:to-orange-655 transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Mark Pending
                </button>
              </motion.div>
            )}

            {selected === "FVRequired" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="p-[0.1vw] overflow-hidden"
              >
                <AssignVisitModal
                  type="Field Visit"
                  entry={entry}
                  product={prod}
                  currentUser={currentUser}
                  employees={propsEmployees}
                  inlineMode
                  onClose={() => setSelected("")}
                  onSave={async (f) => {
                    await onAssignFieldVisit(f, prodIdx);
                  }}
                />
              </motion.div>
            )}

            {selected === "ReverseEscalate" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-50 border border-rose-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[0.85vw] font-black text-rose-900 flex items-center gap-[0.35vw]">
                    <RotateCcw className="w-[0.9vw] h-[0.9vw]" /> Reverse Escalate (Send Back)
                  </div>
                  <span className="text-[0.68vw] bg-rose-100 text-rose-800 px-[0.45vw] py-[0.1vw] rounded font-semibold border border-rose-200">
                    Returns to Sender with SLA
                  </span>
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Enter reason for sending this call back to the previous engineer..."
                  className="w-full border border-slate-300 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting || !remarks.trim()}
                  onClick={async () => {
                    setIsSubmitting(true);
                    try {
                      if (onReverseEscalate) {
                        await onReverseEscalate(prodIdx, remarks);
                        setSelected("");
                        setRemarks("");
                      }
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white disabled:opacity-60 rounded-[0.5vw] font-bold text-[0.75vw] transition-all shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : (
                    <RotateCcw className="w-[0.75vw] h-[0.75vw]" />
                  )}
                  Confirm Reverse Escalation
                </button>
              </motion.div>
            )}

            {selected === "Returned" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-rose-50 border border-rose-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-black text-rose-900">
                  Return to Assigned Person
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Reason for returning this to the original person..."
                  className="w-full border border-slate-400 rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-rose-400 focus:ring-4 focus:ring-rose-100 transition-all shadow-sm resize-none"
                />
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Returned")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-rose-500 to-red-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-rose-600 hover:to-red-700 transition-all shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm Return
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </div>
  );
};

export { ProductClosurePanel };
