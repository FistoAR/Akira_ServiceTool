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
    <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm overflow-hidden mt-[0.5vw]">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-[1vw] flex justify-between items-center">
        <h4 className="text-[0.9vw] font-black text-indigo-950 flex items-center gap-[0.5vw]">
          <MapPin className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
          Field Visit Allocation
        </h4>
        <Badge
          label={isReturned ? "Returned" : "Pending Action"}
          color={isReturned ? "amber" : "indigo"}
        />
      </div>
      <div className="p-[1vw] space-y-[0.8vw]">
        {isReturned && (
          <div className="bg-amber-50 border border-amber-200 rounded-[0.5vw] p-[0.8vw] text-amber-800 text-[0.8vw] font-bold">
            This field visit was returned by{" "}
            {product._fieldVisit.assignedToName}.
          </div>
        )}
        <div className="flex flex-col gap-[0.3vw]">
          <span className="text-[0.75vw] font-bold text-slate-500 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-[0.85vw] font-bold text-slate-800 bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Assigned To
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
        </div>
      </div>
      {isReturned && (
        <div className="p-[1vw] border-t border-slate-200 bg-slate-50/50 flex flex-col gap-[0.8vw]">
          <div className="flex gap-[0.5vw]">
            <button
              onClick={() => {
                setShowResolve(false);
                setShowAssign(!showAssign);
              }}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
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
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
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
                className="mt-[0.5vw] overflow-hidden"
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
                className="mt-[0.5vw] overflow-hidden p-[0.7vw] border border-emerald-350 rounded-[0.5vw] bg-emerald-50/30 space-y-[0.6vw]"
              >
                <div className="text-[0.68vw] font-black text-emerald-900">
                  Resolution Remarks
                </div>
                <textarea
                  rows="2"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder="Provide details of steps taken to resolve..."
                  className="w-full border border-slate-400 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
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
                  className="w-full py-[0.5vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-[0.3vw]"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
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
    <div className="bg-white border border-slate-300 rounded-[0.8vw] shadow-sm overflow-hidden mt-[0.5vw]">
      <div className="bg-indigo-50/50 border-b border-indigo-100 p-[1vw] flex justify-between items-center">
        <h4 className="text-[0.9vw] font-black text-indigo-950 flex items-center gap-[0.5vw]">
          <MapPin className="w-[1.2vw] h-[1.2vw] text-indigo-600" />
          Field Visit Details
        </h4>
        <Badge
          label={`Visit Date: ${new Date(product._fieldVisit.visitDate).toLocaleDateString()}`}
          color="indigo"
        />
      </div>
      <div className="p-[1vw] space-y-[0.8vw]">
        <div className="flex flex-col gap-[0.3vw]">
          <span className="text-[0.75vw] font-bold text-slate-500 uppercase tracking-wider">
            Diagnosis / Objective
          </span>
          <div className="text-[0.85vw] font-bold text-slate-800 bg-slate-50 p-[0.8vw] rounded-[0.5vw] border border-slate-200">
            {product._fieldVisit.diagnosisSummary ||
              "No objective details specified."}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-[1vw]">
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Assigned To
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedToName}
            </span>
          </div>
          <div className="flex flex-col gap-[0.2vw]">
            <span className="text-[0.7vw] font-bold text-slate-500">
              Requested By
            </span>
            <span className="text-[0.85vw] font-black text-slate-900">
              {product._fieldVisit.assignedByName}
            </span>
          </div>
        </div>
      </div>
      {product._fieldVisit.assignedTo === currentUser?.userId && (
        <div className="p-[1vw] border-t border-slate-200 bg-slate-50/50 flex flex-col gap-[0.8vw]">
          <div className="flex gap-[0.5vw]">
            <button
              onClick={() => setAction("reschedule")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                action === "reschedule"
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-white text-blue-700 border-blue-300 hover:bg-blue-50"
              }`}
            >
              Reschedule Date
            </button>
            <button
              onClick={() => setAction("return")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
                action === "return"
                  ? "bg-amber-600 text-white border-amber-600"
                  : "bg-white text-amber-700 border-amber-300 hover:bg-amber-50"
              }`}
            >
              Return
            </button>
            <button
              onClick={() => setAction("resolve")}
              className={`flex-1 py-[0.5vw] rounded-[0.5vw] text-[0.75vw] font-bold border transition-colors cursor-pointer ${
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
                className="flex flex-col gap-[0.6vw]"
              >
                {action === "reschedule" && (
                  <div className="flex flex-col gap-[0.2vw]">
                    <label className="text-[0.7vw] font-bold text-slate-600">
                      New Visit Date
                    </label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      min={new Date().toISOString().split("T")[0]}
                      className="w-full p-[0.5vw] text-[0.75vw] border border-slate-300 rounded-[0.4vw]"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-[0.2vw]">
                  <label className="text-[0.7vw] font-bold text-slate-600">
                    Remarks
                  </label>
                  <textarea
                    value={remarks}
                    onChange={(e) => setRemarks(e.target.value)}
                    placeholder="Enter remarks..."
                    className="w-full p-[0.5vw] text-[0.75vw] border border-slate-300 rounded-[0.4vw] min-h-[4vw] resize-y"
                  />
                </div>
                <div className="flex justify-end gap-[0.5vw]">
                  <button
                    onClick={() => setAction(null)}
                    className="px-[1vw] py-[0.4vw] text-slate-600 hover:text-slate-800 text-[0.75vw] font-bold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={isSubmitting}
                    onClick={handleSubmit}
                    className="px-[1.2vw] py-[0.4vw] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold shadow-sm cursor-pointer flex items-center justify-center gap-[0.3vw]"
                  >
                    {isSubmitting ? (
                      <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
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
    <div className="mt-[0.6vw] flex flex-col gap-[0.6vw]">
      <div className={`grid gap-[0.4vw] grid-cols-2`}>
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
        {selected === "Resolved" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="p-[0.7vw] border border-emerald-350 rounded-[0.5vw] bg-emerald-50/30 space-y-[0.6vw] shadow-inner overflow-hidden"
          >
            <div className="text-[0.68vw] font-black text-emerald-900  ">
              Resolution Action
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-[0.4vw]">
              {RESOLUTION_TYPES.map((t) => (
                <button
                  key={t}
                  onClick={() => setResType(t)}
                  className={`py-[0.35vw] rounded-[0.4vw] border text-[0.65vw] transition-all font-bold cursor-pointer ${resolutionType === t ? "bg-emerald-600 border-emerald-650 text-white shadow-sm shadow-emerald-500/10" : "bg-white border-slate-400 text-slate-600 hover:bg-slate-50"}`}
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
              className="w-full border border-slate-400 rounded-[0.4vw] p-[0.5vw] text-[0.75vw] font-semibold outline-none bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
            />
            <button
              disabled={isSubmitting}
              onClick={handleClose}
              className="w-full py-[0.5vw] bg-emerald-600 hover:bg-emerald-700 disabled:opacity-70 text-white rounded-[0.4vw] text-[0.75vw] font-bold transition-all shadow-md shadow-emerald-600/15 cursor-pointer flex items-center justify-center gap-[0.3vw]"
            >
              {isSubmitting ? (
                <Loader2 className="w-[0.75vw] h-[0.75vw] animate-spin" />
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
