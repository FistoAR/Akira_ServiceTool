import axios from "axios";
import { useNotification } from "../../../components/NotificationContext";
import { API_URL, RESOLUTION_TYPES } from "../serviceCallResponse";
import { Badge } from "./CommonUI";
import React, { useState } from "react";
import {
  Wrench,
  CheckCircle,
  MapPin,
  Clock,
  Share2,
  Calendar,
  ChevronDown,
  Loader2,
  X
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { AssignVisitModal } from "./AssignVisitModal";

const AllocatedActionPanel = ({
  entry,
  product,
  productIdx,
  onAssignFieldVisit,
  onProductClose,
  employees,
  currentUser,
}) => {
  const isReturned = product._fieldVisit?.status === "Returned";
  const [showAssign, setShowAssign] = useState(false);
  const [showResolve, setShowResolve] = useState(false);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden mt-2">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-3.5 flex justify-between items-center">
        <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          Field Visit Allocation
        </h4>
        <Badge
          label={isReturned ? "Returned" : "Pending Action"}
          color={isReturned ? "amber" : "indigo"}
        />
      </div>
      <div className="p-3.5 space-y-3">
        {isReturned && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-amber-800 text-xs font-bold">
            This field visit was returned by{" "}
            {product._fieldVisit.assignedToName}.
          </div>
        )}
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700">
              Assigned To
            </span>
            <span className="text-sm font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
        </div>
      </div>
      {isReturned && (
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => {
                setShowResolve(false);
                setShowAssign(!showAssign);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                showAssign
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
              }`}
            >
              Re-assign Field Visit
            </button>
            <button
              onClick={() => {
                setShowAssign(false);
                setShowResolve(!showResolve);
              }}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                showResolve
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Resolve Product
            </button>
          </div>

          <AnimatePresence>
            {showAssign && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden"
              >
                <AssignVisitModal
                  employees={employees}
                  currentUser={currentUser}
                  type="Field Visit"
                  inlineMode={true}
                  onClose={() => setShowAssign(false)}
                  onSave={async (form) => {
                    await onAssignFieldVisit(form, productIdx);
                    setShowAssign(false);
                  }}
                />
              </motion.div>
            )}
            {showResolve && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-2 overflow-hidden p-2.5 border border-emerald-350 rounded-lg bg-emerald-50/30 space-y-2.5"
              >
                <div className="text-sm font-black text-emerald-900">
                  Resolution Remarks
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide details of steps taken to resolve..."
                  className="w-full border border-slate-400 rounded-md p-2 text-xs font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
                />
                <button
                  disabled={isSubmitting}
                  onClick={async () => {
                    if (!remarks.trim()) {
                      alert("Please provide resolution remarks.");
                      return;
                    }
                    setIsSubmitting(true);
                    try {
                      await onProductClose(productIdx, {
                        status: "Resolved",
                        remarks,
                      });
                      setShowResolve(false);
                      setRemarks("");
                    } finally {
                      setIsSubmitting(false);
                    }
                  }}
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-md text-xs font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-1"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : null}
                  Confirm & Close Task
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

// ── Field Visit Action Panel ──────────────────────────────────────────────────
const FieldVisitActionPanel = ({
  entry,
  product,
  productIdx,
  currentUser,
  onRefresh,
}) => {
  const { toast } = useNotification();
  const [action, setAction] = useState(null); // 'reschedule', 'return', 'resolve'
  const [remarks, setRemarks] = useState("");
  const [visitDate, setVisitDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!remarks) {
      toast("Please provide remarks.", "error");
      return;
    }
    if (action === "reschedule" && !visitDate) {
      toast("Please select a new visit date.", "error");
      return;
    }

    setIsSubmitting(true);
    try {
      if (action === "reschedule") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/reschedule`,
          {
            productIdx,
            visitDate,
            remarks,
            userId: currentUser?.userId,
            userName: currentUser?.name,
          },
        );
        toast("Field visit rescheduled successfully", "success");
      } else if (action === "return") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/return`,
          {
            productIdx,
            remarks,
            userId: currentUser?.userId,
            userName: currentUser?.name,
          },
        );
        toast("Field visit returned successfully", "success");
      } else if (action === "resolve") {
        await axios.patch(
          `${API_URL}/service-calls/field-visit/${entry._id}/close`,
          {
            productIdx,
            remarks,
            closedBy: currentUser?.userId,
            closedByName: currentUser?.name,
          },
        );
        toast("Field visit resolved successfully", "success");
      }

      setAction(null);
      setRemarks("");
      setVisitDate("");
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error("Action error:", err);
      toast(`Failed to ${action} field visit`, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-slate-300 rounded-xl shadow-sm overflow-hidden mt-2">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-3.5 flex justify-between items-center">
        <h4 className="text-sm font-black text-indigo-950 flex items-center gap-2">
          <MapPin className="w-4 h-4 text-indigo-600" />
          Field Visit Details
        </h4>
        <Badge
          label={`Visit Date: ${new Date(product._fieldVisit.visitDate).toLocaleDateString()}`}
          color="indigo"
        />
      </div>
      <div className="p-3.5 space-y-3">
        <div className="flex flex-col gap-1">
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-sm font-bold text-slate-800 bg-slate-50 p-3 rounded-lg border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3.5">
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700">
              Assigned To
            </span>
            <span className="text-sm font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-sm font-bold text-slate-700">
              Requested By
            </span>
            <span className="text-sm font-black text-slate-900">
              {product._fieldVisit.assignedByName}
            </span>
          </div>
        </div>
      </div>
      {product._fieldVisit.assignedTo === currentUser?.userId && (
        <div className="p-3.5 border-t border-slate-200 bg-slate-50/50 flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={() => setAction("reschedule")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                action === "reschedule"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
              }`}
            >
              Reschedule Date
            </button>
            <button
              onClick={() => setAction("return")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                action === "return"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}
            >
              Return
            </button>
            <button
              onClick={() => setAction("resolve")}
              className={`flex-1 py-2 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                action === "resolve"
                  ? "bg-emerald-600 text-white border-emerald-600"
                  : "bg-white text-emerald-700 border-emerald-300 hover:bg-emerald-50"
              }`}
            >
              Resolve
            </button>
          </div>

          <AnimatePresence>
            {action && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex flex-col gap-2.5"
              >
                {action === "reschedule" && (
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-bold text-slate-600">
                      New Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-2 text-xs border border-slate-300 rounded-md"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-bold text-slate-600">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    className="w-full p-2 text-xs border border-slate-300 rounded-md min-h-[58px] resize-y"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setAction(null)}
                    className="px-3.5 py-1.5 text-slate-600 hover:text-slate-800 text-xs font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-md text-xs font-bold shadow-sm cursor-pointer flex items-center justify-center gap-1"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    Confirm {action.charAt(0).toUpperCase() + action.slice(1)}
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
};

const SupportReqActionPanel = ({
  req,
  currentUser,
  employees,
  entry,
  product,
  onDone,
  onAssignFieldVisit,
  onProductClose,
}) => {
  const [selected, setSelected] = useState("");
  const [resolutionType, setResType] = useState("Fixed");
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = async () => {
    if (!remarks.trim()) {
      alert("Please provide resolution notes.");
      return;
    }
    setIsSubmitting(true);
    try {
      await axios.patch(`${API_URL}/service-calls/support/${req._id}/resolve`, {
        status: "Resolved",
        resolutionNotes: remarks,
        resolutionType,
        resolvedAt: new Date().toISOString(),
      });
      onDone();
    } catch (err) {
      alert("Failed to resolve support request");
    } finally {
      setIsSubmitting(false);
    }
  };

  const tabs = [
    {
      k: "Resolved",
      l: "Resolve",
      e: "✓",
      c: "bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/15",
    },
    {
      k: "FVRequired",
      l: "Field Visit",
      e: "📍",
      c: "bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-md shadow-indigo-600/15",
    },
  ];

  return (
    <div className="mt-2.5 flex flex-col gap-2.5">
      <div className={`grid gap-1.5 grid-cols-2`}>
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setSelected(selected === t.k ? "" : t.k)}
            className={`py-2 text-sm font-bold rounded-lg border transition-all cursor-pointer flex items-center justify-center gap-1 ${selected === t.k ? `${t.c}` : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50 hover:text-slate-800 hover:border-slate-400"}`}
          >
            <span className="text-xs">{t.e}</span>
            <span>{t.l}</span>
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected === "Resolved" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-2.5 border border-emerald-350 rounded-lg bg-emerald-50/30 space-y-2.5 shadow-inner overflow-hidden"
          >
            <div className="text-sm font-black text-emerald-900  ">
              Resolution Action
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-1.5">
              {RESOLUTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setResType(t)}
                  className={`py-1.5 rounded-md border text-xs transition-all font-bold cursor-pointer ${resolutionType === t ? "bg-emerald-600 border-emerald-650 text-white shadow-sm shadow-emerald-500/10" : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50"}`}
                >
                  {t}
                </button>
              ))}
            </div>
            <textarea
              rows="2"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Provide details of steps taken to resolve..."
              className="w-full border border-slate-400 rounded-md p-2 text-xs font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
            />
            <button
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-md text-xs font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-1"
            >
              {isSubmitting ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : null}
              Confirm & Close Task
            </button>
          </motion.div>
        )}

        {selected === "FVRequired" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="  overflow-hidden"
          >
            <AssignVisitModal
              inlineMode
              type="Field Visit"
              entry={entry}
              product={product}
              currentUser={currentUser}
              employees={employees}
              onClose={() => setSelected("")}
              onSave={async (form) => {
                await onAssignFieldVisit(form, req.productIdx);
                setSelected("");
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export { AllocatedActionPanel, FieldVisitActionPanel, SupportReqActionPanel };
