import React, { useState, useEffect, useRef, useMemo, cloneElement } from "react";
import {
  Search,
  Wrench,
  RotateCcw,
  CheckSquare,
  Play,
  CheckCircle,
  Clock,
  MapPin,
  HelpCircle,
  Loader2,
  Calendar,
  X,
  FileText,
  LifeBuoy,
  PauseCircle,
  CheckCircle2,
  Undo2,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AssignVisitModal } from "./AssignVisitModal";
import { API_URL, RESOLUTION_TYPES, load, EMPLOYEES_KEY } from "./ResponseConstants";
import { useNotification } from "../../../components/NotificationContext";

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
  onReverseEscalate,
  isPendingTab,
  isSupportDeskAsked,
  isSupportDeskAssigned,
}) => {
  const { toast } = useNotification();
  const existing = prod._productClosure || {};
  const saved = existing.status;
  const [selected, setSelected] = useState("");
  const [remarks, setRemarks] = useState("");
  const [notes, setNotes] = useState(""); // For Support Request
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);

  // Clear errors when sub-tab switches or inputs change
  useEffect(() => {
    setErrors({});
  }, [selected]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const badgeConfig = {
    Resolved: {
      bg: "bg-emerald-50 text-emerald-700 border-emerald-300",
      icon: <CheckCircle className="w-[0.85vw] h-[0.85vw]" />,
      label: "Resolved",
    },
    Pending: {
      bg: "bg-amber-50 text-amber-700 border-amber-300",
      icon: <Clock className="w-[0.85vw] h-[0.85vw]" />,
      label: "Pending",
    },
    "Field Visit Required": {
      bg: "bg-blue-50 text-blue-700 border-blue-300",
      icon: <MapPin className="w-[0.85vw] h-[0.85vw]" />,
      label: "Field Visit",
    },
    "Support Requested": {
      bg: "bg-sky-50 text-sky-700 border-sky-300",
      icon: <HelpCircle className="w-[0.85vw] h-[0.85vw]" />,
      label: "Support Requested",
    },
  };

  const currentBadge = badgeConfig[saved];

  const savedBadge =
    saved && currentBadge ? (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`flex items-center gap-[0.4vw] px-[0.7vw] py-[0.35vw] rounded-[0.5vw] border text-[0.75vw] font-bold ${currentBadge.bg} shadow-2xs`}
      >
        {currentBadge.icon}
        <span>{currentBadge.label}</span>
        {existing.remarks && (
          <span className="text-[0.7vw] text-slate-600 truncate max-w-[12vw] font-normal">
            - {existing.remarks}
          </span>
        )}
      </motion.div>
    ) : null;

  const handleUpdate = async (status, extra = {}) => {
    setErrors({});
    if (status === "Resolved" && !remarks.trim()) {
      setErrors((p) => ({ ...p, remarks: "Resolution details are required." }));
      toast("Resolution details are required.", "error");
      return;
    }
    if (status === "Pending" && !remarks.trim()) {
      setErrors((p) => ({ ...p, remarks: "Reason is required for marking as pending." }));
      toast("Reason is required for marking as pending.", "error");
      return;
    }

    if (status === "Returned") {
      if (!remarks.trim()) {
        setErrors((p) => ({ ...p, remarks: "Please provide a reason for returning this request." }));
        toast("Please provide a reason for returning this request.", "error");
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
    setErrors({});
    const newErrors = {};
    if (!selectedPerson) {
      newErrors.supportPerson = "Please select a support person.";
    }
    if (!notes.trim()) {
      newErrors.notes = "Please add handover notes.";
    }
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      const msg = newErrors.supportPerson || newErrors.notes;
      toast(msg, "error");
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

  // Determine the first assigned person and the immediate previous person for reverse escalation
  const reverseTargetInfo = useMemo(() => {
    const escHist = prod?._escalationHistory || entry?.escalationHistory || [];
    let firstAssigned = null;
    let immediatePrev = null;

    // 1. First assigned engineer from escalation history or product initial fields
    if (escHist.length > 0) {
      const first = escHist[0];
      firstAssigned = {
        userId: first.engineerId || first.assignedTo,
        name: first.engineerName || first.assignedToName || first.name,
        department: first.department || "",
      };
    } else if (prod?._initialEngineerId || prod?._initialEngineerName) {
      firstAssigned = {
        userId: prod._initialEngineerId,
        name: prod._initialEngineerName,
        department: prod._currentDepartment || "",
      };
    } else {
      const hist = prod?._history || [];
      for (let i = 0; i < hist.length; i++) {
        const h = hist[i];
        if (
          h.status === "Assigned" ||
          h.status === "Initial Assignment" ||
          h.status === "Level 0" ||
          h.assignedTo ||
          h.metadata?.assignedTo
        ) {
          const uId = h.assignedTo || h.metadata?.assignedTo;
          const uName = h.assignedToName || h.metadata?.assignedToName;
          if (uId) {
            firstAssigned = {
              userId: uId,
              name: uName || uId,
              department: h.metadata?.department || "",
            };
            break;
          }
        }
      }
    }

    // 2. Immediate previous engineer in the escalation chain before currentUser
    for (let i = escHist.length - 1; i >= 0; i--) {
      const h = escHist[i];
      const engId = h.engineerId || h.assignedTo;
      const engName = h.engineerName || h.assignedToName || h.name;
      if (
        (engId && engId !== currentUser?.userId) ||
        (engName && engName !== currentUser?.name)
      ) {
        immediatePrev = {
          userId: engId,
          name: engName || engId,
          department: h.department || "",
        };
        break;
      }
    }

    // Fallback to _history if escalationHistory didn't yield an immediate previous
    if (!immediatePrev) {
      const hist = prod?._history || [];
      for (let i = hist.length - 1; i >= 0; i--) {
        const h = hist[i];
        if (h.status === "Escalated" || h.status === "Escalation") {
          const fromId = h.updatedBy || h.escalatedBy || h.metadata?.escalatedBy;
          const fromName = h.updatedByName || h.escalatedByName || h.metadata?.escalatedByName;
          if (fromId && fromId !== currentUser?.userId) {
            immediatePrev = {
              userId: fromId,
              name: fromName || fromId,
              department: h.metadata?.fromDepartment || "",
            };
            break;
          }
        }
      }
    }

    const isL0 =
      firstAssigned &&
      (firstAssigned.userId === currentUser?.userId ||
        firstAssigned.name === currentUser?.name);

    const targetPerson = immediatePrev || firstAssigned;

    return {
      isFirstAssigned: Boolean(isL0),
      hasPreviousEngineer: Boolean(immediatePrev),
      targetName: targetPerson?.name || null,
      targetDept: targetPerson?.department || null,
    };
  }, [prod, entry, currentUser]);

  // Reverse escalate is ONLY available for escalated calls after product attended and no user report yet
  const canReverseEscalate = useMemo(() => {
    // Self assigned calls or calls with no escalation cannot be reverse-escalated
    const isSelfAssigned = Boolean(
      entry?.noEscalation ||
      entry?.isSelfAssigned ||
      (entry?.registeredBy === currentUser?.userId && entry?.currentEngineerId === currentUser?.userId) ||
      (entry?.registeredByName === currentUser?.name && entry?.currentEngineerName === currentUser?.name)
    );
    if (isSelfAssigned) return false;

    // Must have a valid previous engineer in the escalation chain to return to
    if (!reverseTargetInfo.hasPreviousEngineer || reverseTargetInfo.isFirstAssigned || isSupportDeskAssigned) return false;

    // Must be attended
    const isAttended = Boolean(prod?._attended || prod?._attendedAt);
    if (!isAttended) return false;

    // If any product closure status is already set (e.g. Pending, Resolved, Field Visit, etc.)
    if (prod?._productClosure?.status) return false;

    // If user has any non-attended report in history
    const uid = currentUser?.userId;
    const history = prod?._history || [];
    const hasUserReport = history.some((h) => {
      const byUser = h.updatedBy === uid || h.metadata?.userId === uid;
      const isAttendedEvent = h.status === 'Attended';
      return byUser && !isAttendedEvent;
    });

    if (hasUserReport) return false;

    return true;
  }, [reverseTargetInfo, isSupportDeskAssigned, prod, currentUser]);

  const tabs = [
    {
      id: "Open",
      l: "Support",
      icon: <LifeBuoy className="w-[0.9vw] h-[0.9vw] text-blue-500" />,
      activeStyle:
        "bg-blue-600 text-white shadow-md shadow-blue-500/20 border-blue-600",
      hoverStyle: "hover:bg-blue-50 hover:text-blue-700 hover:border-blue-300",
    },
    ...(!isPendingTab
      ? [
          {
            id: "Pending",
            l: "Pending",
            icon: <PauseCircle className="w-[0.9vw] h-[0.9vw] text-amber-500" />,
            activeStyle:
              "bg-amber-600 text-white shadow-md shadow-amber-500/20 border-amber-600",
            hoverStyle:
              "hover:bg-amber-50 hover:text-amber-700 hover:border-amber-300",
          },
        ]
      : []),
    {
      id: "FVRequired",
      l: "Field Visit",
      icon: <MapPin className="w-[0.9vw] h-[0.9vw] text-indigo-500" />,
      activeStyle:
        "bg-indigo-600 text-white shadow-md shadow-indigo-500/20 border-indigo-600",
      hoverStyle:
        "hover:bg-indigo-50 hover:text-indigo-700 hover:border-indigo-300",
    },
    {
      id: "Resolved",
      l: "Resolve",
      icon: <CheckCircle2 className="w-[0.9vw] h-[0.9vw] text-emerald-500" />,
      activeStyle:
        "bg-emerald-600 text-white shadow-md shadow-emerald-500/20 border-emerald-600",
      hoverStyle:
        "hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300",
    },
    ...(isSupportDeskAssigned
      ? [
          {
            id: "Returned",
            l: "Return to Assigned",
            icon: <Undo2 className="w-[0.9vw] h-[0.9vw] text-purple-500" />,
            activeStyle:
              "bg-purple-600 text-white shadow-md shadow-purple-500/20 border-purple-600",
            hoverStyle:
              "hover:bg-purple-50 hover:text-purple-700 hover:border-purple-300",
          },
        ]
      : []),
    ...(canReverseEscalate
      ? [
          {
            id: "ReverseEscalate",
            l: "Reverse Escalate",
            icon: <RotateCcw className="w-[0.9vw] h-[0.9vw] text-rose-500" />,
            activeStyle:
              "bg-rose-600 text-white shadow-md shadow-rose-500/20 border-rose-600",
            hoverStyle:
              "hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300",
          },
        ]
      : []),
  ];

  return (
    <div className="flex flex-col gap-[0.8vw]">
      <div className="flex flex-col gap-[0.6vw]">
        {savedBadge ? (
          <div className="flex items-center justify-between border-b border-slate-200 pb-[0.6vw]">
            <span className="text-[0.72vw] font-normal text-slate-400 uppercase tracking-wider">
              Current Status
            </span>
            {savedBadge}
          </div>
        ) : null}

        <div className="flex flex-col gap-[0.7vw]">
          <div className="flex items-center gap-[0.4vw] w-full flex-nowrap">
            {tabs.map((t) => {
              const isActive = selected === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => {
                    setSelected(isActive ? "" : t.id);
                    setRemarks("");
                    setNotes("");
                    setErrors({});
                  }}
                  className={`flex-1 min-w-0 flex items-center justify-center gap-[0.35vw] py-[0.55vw] px-[0.5vw] rounded-[0.5vw] border text-[0.74vw] font-normal transition-all cursor-pointer shadow-2xs whitespace-nowrap ${
                    isActive
                      ? t.activeStyle
                      : `bg-white border-slate-300 text-slate-700 ${t.hoverStyle}`
                  }`}
                >
                  {t.icon &&
                    (isActive
                      ? cloneElement(t.icon, {
                          className: `${t.icon.props.className || "w-[0.9vw] h-[0.9vw]"} text-white`,
                        })
                      : t.icon)}
                  <span className="truncate">{t.l}</span>
                </button>
              );
            })}
          </div>

          <AnimatePresence>
            {selected === "Open" && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="bg-blue-50 border border-blue-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-visible shadow-inner"
              >
                <div className="text-[0.85vw] font-semibold text-blue-900">
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
                        setErrors((p) => ({ ...p, supportPerson: null }));
                      }}
                      placeholder="Search person or department..."
                      className={`w-full border rounded-[0.5vw] pl-[2vw] pr-[0.7vw] py-[0.5vw] text-[0.74vw] font-normal outline-none bg-white transition-all shadow-sm ${
                        errors.supportPerson
                          ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                          : "border-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      }`}
                    />
                    {errors.supportPerson && (
                      <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.2vw]">
                        <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                        {errors.supportPerson}
                      </div>
                    )}
                    {showDropdown && candidates.length > 0 && (
                      <div className="absolute top-full left-0 right-0 z-20 border border-slate-400 bg-white rounded-b-[0.5vw] max-h-[12vw] overflow-y-auto divide-y divide-slate-200 shadow-lg mt-[-0.1vw]">
                        {candidates.map((emp) => (
                          <div
                            key={emp.userId}
                            onClick={() => {
                              setSelectedPerson(emp);
                              setSearch(emp.name);
                              setShowDropdown(false);
                              setErrors((p) => ({ ...p, supportPerson: null }));
                            }}
                            className={`px-[0.7vw] py-[0.6vw] text-[0.72vw] font-bold cursor-pointer hover:bg-blue-50/65 flex justify-between items-center transition-colors ${
                              selectedPerson?.userId === emp.userId
                                ? "bg-blue-55 text-blue-950 font-bold border-l-2 border-blue-600"
                                : "text-slate-800"
                            }`}
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
                  <div>
                    <textarea
                      rows="2"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setErrors((p) => ({ ...p, notes: null }));
                      }}
                      placeholder="Provide handover notes..."
                      className={`w-full border rounded-[0.5vw] p-[0.7vw] text-[0.74vw] font-normal outline-none bg-white transition-all shadow-sm resize-none ${
                        errors.notes
                          ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                          : "border-slate-400 focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                      }`}
                    />
                    {errors.notes && (
                      <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.1vw]">
                        <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                        {errors.notes}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={handleSupport}
                  className="w-full py-[0.55vw] bg-gradient-to-r from-blue-600 to-indigo-600 text-white disabled:opacity-70 rounded-[0.5vw] font-medium text-[0.74vw] hover:from-blue-700 hover:to-indigo-700 transition-all shadow-md shadow-blue-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
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
                <div className="text-[0.85vw] font-bold text-emerald-900">
                  Resolution Details
                </div>
                <div>
                  <textarea
                    rows="3"
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      setErrors((p) => ({ ...p, remarks: null }));
                    }}
                    placeholder="Enter details of fixed parts, logical adjustments, or resolution explanation..."
                    className={`w-full border rounded-[0.5vw] p-[0.8vw] text-[0.74vw] font-normal outline-none bg-white transition-all shadow-sm resize-none ${
                      errors.remarks
                        ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                        : "border-slate-400 focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
                    }`}
                  />
                  {errors.remarks && (
                    <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.1vw]">
                      <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                      {errors.remarks}
                    </div>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Resolved")}
                  className="w-full py-[0.55vw] bg-gradient-to-r from-emerald-600 to-teal-600 text-white disabled:opacity-70 rounded-[0.5vw] font-medium text-[0.74vw] hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md shadow-emerald-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
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
                <div className="text-[0.85vw] font-bold text-amber-900">
                  Pending Reason
                </div>
                <div>
                  <textarea
                    rows="2"
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      setErrors((p) => ({ ...p, remarks: null }));
                    }}
                    placeholder="Why is this call pending? (e.g., waiting for parts, client unavailable)"
                    className={`w-full border rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white transition-all shadow-sm resize-none ${
                      errors.remarks
                        ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                        : "border-slate-400 focus:border-amber-400 focus:ring-4 focus:ring-amber-100"
                    }`}
                  />
                  {errors.remarks && (
                    <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.1vw]">
                      <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                      {errors.remarks}
                    </div>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Pending")}
                  className="w-full py-[0.55vw] bg-gradient-to-r from-amber-500 to-orange-500 text-white disabled:opacity-70 rounded-[0.5vw] font-medium text-[0.74vw] hover:from-amber-600 hover:to-orange-655 transition-all shadow-md shadow-amber-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
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
                    if (onAssignFieldVisit) {
                      await onAssignFieldVisit(
                        entry?._id || entry?.callId,
                        "Field Visit",
                        f,
                        prodIdx,
                      );
                    }
                    setSelected("");
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
                  <div className="text-[0.85vw] font-bold text-rose-900 flex items-center gap-[0.35vw]">
                    <RotateCcw className="w-[0.9vw] h-[0.9vw]" /> Reverse Escalate (Send Back)
                  </div>
                  <span className="text-[0.68vw] bg-rose-100 text-rose-800 px-[0.45vw] py-[0.1vw] rounded font-semibold border border-rose-200">
                    Returns with SLA
                  </span>
                </div>
                {reverseTargetInfo.targetName && (
                  <div className="bg-white/95 border border-rose-200 rounded-[0.4vw] px-[0.7vw] py-[0.45vw] flex items-center justify-between shadow-2xs">
                    <span className="text-[0.72vw] text-slate-600 font-medium">
                      Will be returned back to:
                    </span>
                    <span className="text-[0.76vw] font-bold text-rose-900 flex items-center gap-[0.35vw]">
                      <span className="w-[0.45vw] h-[0.45vw] rounded-full bg-rose-600 inline-block"></span>
                      {reverseTargetInfo.targetName}
                      {reverseTargetInfo.targetDept && (
                        <span className="text-[0.66vw] font-medium text-slate-500 font-mono">
                          ({reverseTargetInfo.targetDept})
                        </span>
                      )}
                    </span>
                  </div>
                )}
                <div>
                  <textarea
                    rows="2"
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      setErrors((p) => ({ ...p, remarks: null }));
                    }}
                    placeholder="Enter reason for sending this call back to the previous engineer..."
                    className={`w-full border rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white transition-all shadow-sm resize-none ${
                      errors.remarks
                        ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                        : "border-slate-300 focus:border-rose-400 focus:ring-4 focus:ring-rose-100"
                    }`}
                  />
                  {errors.remarks && (
                    <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.1vw]">
                      <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                      {errors.remarks}
                    </div>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!remarks.trim()) {
                      setErrors((p) => ({ ...p, remarks: "Please provide a reason for sending this call back." }));
                      toast("Please provide a reason for sending this call back.", "error");
                      return;
                    }
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
                  className="w-full py-[0.55vw] bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white disabled:opacity-60 rounded-[0.5vw] font-medium text-[0.74vw] transition-all shadow-md shadow-rose-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
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
                className="bg-purple-50 border border-purple-300 rounded-[0.6vw] p-[0.8vw] space-y-[0.7vw] overflow-hidden shadow-inner"
              >
                <div className="text-[0.85vw] font-bold text-purple-900">
                  Return to Assigned Person
                </div>
                <div>
                  <textarea
                    rows="2"
                    value={remarks}
                    onChange={(e) => {
                      setRemarks(e.target.value);
                      setErrors((p) => ({ ...p, remarks: null }));
                    }}
                    placeholder="Enter reason or instructions for returning this request..."
                    className={`w-full border rounded-[0.5vw] p-[0.7vw] text-[0.75vw] font-semibold outline-none bg-white transition-all shadow-sm resize-none ${
                      errors.remarks
                        ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                        : "border-slate-400 focus:border-purple-400 focus:ring-4 focus:ring-purple-100"
                    }`}
                  />
                  {errors.remarks && (
                    <div className="flex items-center gap-[0.25vw] text-rose-600 text-[0.72vw] font-bold mt-[0.1vw]">
                      <AlertCircle className="w-[0.72vw] h-[0.72vw]" />
                      {errors.remarks}
                    </div>
                  )}
                </div>
                <button
                  disabled={isSubmitting}
                  onClick={() => handleUpdate("Returned")}
                  className="w-full py-[0.6vw] bg-gradient-to-r from-purple-600 to-indigo-600 text-white disabled:opacity-70 rounded-[0.5vw] font-bold text-[0.75vw] hover:from-purple-700 hover:to-indigo-700 transition-all shadow-md shadow-purple-500/10 cursor-pointer flex items-center justify-center gap-[0.4vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
                  ) : null}
                  Confirm Return
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export { ProductClosurePanel };
