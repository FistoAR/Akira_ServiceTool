import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, CheckCircle, Loader2, X, AlertCircle } from "lucide-react";
import { motion } from "framer-motion";
import { load, EMPLOYEES_KEY } from "./ResponseConstants";
import { useNotification } from "../../../components/NotificationContext";

export const AssignVisitModal = ({
  type,
  entry,
  product,
  currentUser,
  employees: propsEmployees,
  onSave,
  onClose,
  inlineMode = false,
}) => {
  const { toast } = useNotification();
  const employees = propsEmployees || load(EMPLOYEES_KEY, []);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const candidates = useMemo(() => {
    const q = search.toLowerCase();
    return employees.filter(
      (e) =>
        e.role?.toLowerCase() === "user" &&
        (!q ||
          e.name.toLowerCase().includes(q) ||
          e.department.toLowerCase().includes(q)),
    );
  }, [employees, currentUser, search]);

  const [form, setForm] = useState({
    assignedTo: "",
    assignedToName: "",
    assignmentDate: new Date().toISOString().slice(0, 16),
    visitDate: "",
    diagnosisSummary: "",
  });

  const sf = (k, v) => {
    setForm((p) => ({ ...p, [k]: v }));
    setErrors((p) => ({ ...p, [k]: null }));
  };

  const isFV = type === "Field Visit";

  const formBody = (
    <div className="flex flex-col gap-3.5">
      <div className="flex flex-col gap-1 relative" ref={dropdownRef}>
        <label className="text-sm font-normal text-slate-800">
          Assign To *
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-[9px] flex items-center justify-center pointer-events-none">
            <Search className="h-3.5 w-3.5 text-slate-700" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              setErrors((p) => ({ ...p, assignedTo: null }));
              if (!e.target.value) {
                sf("assignedTo", "");
                sf("assignedToName", "");
              }
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search and select specialist..."
            className={`w-full border pl-7 p-2.5 text-sm outline-none bg-white transition-all shadow-sm ${
              errors.assignedTo
                ? "border-rose-500 rounded-lg focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
                : showDropdown
                ? "rounded-t-[8px] border-b-0 border-indigo-400"
                : "border-slate-400 rounded-lg focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
            }`}
          />
        </div>
        {errors.assignedTo && (
          <div className="flex items-center gap-1 text-rose-600 text-sm font-bold mt-px">
            <AlertCircle className="w-2.5 h-2.5" />
            {errors.assignedTo}
          </div>
        )}
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 bg-white border border-indigo-400 border-t-0 rounded-b-[8px] max-h-[173px] overflow-y-auto shadow-xl z-[9999] p-1">
            {candidates.length > 0 ? (
              candidates.map((emp) => (
                <div
                  key={emp.userId}
                  onClick={() => {
                    sf("assignedTo", emp.userId);
                    sf("assignedToName", emp.name);
                    setSearch(`${emp.name} (${emp.department})`);
                    setShowDropdown(false);
                    setErrors((p) => ({ ...p, assignedTo: null }));
                  }}
                  className={`p-2.5 flex items-center justify-between rounded-md cursor-pointer font-bold text-sm transition-colors ${
                    form.assignedTo === emp.userId
                      ? "bg-indigo-50 text-indigo-800"
                      : "text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex flex-col">
                    <span>{emp.name}</span>
                    <span className="text-xs text-slate-700 font-semibold">
                      {emp.department}
                    </span>
                  </div>
                  {form.assignedTo === emp.userId && (
                    <CheckCircle className="w-3.5 h-3.5 text-indigo-600" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-3 text-center text-xs text-slate-700 italic font-bold">
                No matching personnel found
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-normal text-slate-800">
          {isFV ? "Scheduled Visit Date *" : "Received Date *"}
        </label>
        <input
          type="date"
          value={form.visitDate}
          min={new Date().toISOString().split("T")[0]}
          onChange={(e) => sf("visitDate", e.target.value)}
          className={`border rounded-lg p-2.5 text-sm font-normal outline-none transition-all bg-white shadow-2xs text-slate-800 ${
            errors.visitDate
              ? "border-rose-500 focus:ring-4 focus:ring-rose-100 bg-rose-50/20"
              : "border-slate-300 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"
          }`}
        />
        {errors.visitDate && (
          <div className="flex items-center gap-1 text-rose-600 text-sm font-bold mt-px">
            <AlertCircle className="w-2.5 h-2.5" />
            {errors.visitDate}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-sm font-normal text-slate-800">
          Diagnosis Summary
        </label>
        <textarea
          rows="2"
          value={form.diagnosisSummary}
          onChange={(e) => sf("diagnosisSummary", e.target.value)}
          placeholder="Initial findings or instructions for the field visit..."
          className="border border-slate-400 rounded-lg p-2.5 text-xs font-semibold outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
        />
      </div>
    </div>
  );

  const saveBtn = (
    <button
      disabled={isSubmitting}
      onClick={async () => {
        setErrors({});
        const newErr = {};
        if (!form.assignedTo) {
          newErr.assignedTo = "Please select an engineer/person.";
        }
        if (!form.visitDate) {
          newErr.visitDate = "Please select a scheduled visit date.";
        }
        if (Object.keys(newErr).length > 0) {
          setErrors(newErr);
          const firstMsg = newErr.assignedTo || newErr.visitDate;
          toast(firstMsg, "error");
          return;
        }

        setIsSubmitting(true);
        try {
          await onSave(form);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-lg text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5 transition-colors shadow-md shadow-indigo-600/15"
    >
      {isSubmitting ? (
        <Loader2 className="w-3 h-3 animate-spin" />
      ) : (
        <CheckCircle className="w-3 h-3" />
      )}
      Assign Field Visit
    </button>
  );

  if (inlineMode)
    return (
      <div className="border border-indigo-300 rounded-lg overflow-hidden bg-white mt-2.5 shadow-sm">
        <div className="bg-slate-50 border-b border-indigo-300 px-3 py-2 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-800">
            Assign {type}
          </span>
        </div>
        <div className="p-3">
          {formBody}
          <div className="flex justify-end mt-3">{saveBtn}</div>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-7">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[547px] rounded-2xl shadow-2xl overflow-hidden border border-slate-400"
      >
        <div className="border-b border-slate-400 px-5 py-3.5 flex justify-between items-center bg-slate-50">
          <h3 className="text-xs font-bold text-slate-850">Assign {type}</h3>
          <button
            onClick={onClose}
            className="text-slate-550 hover:text-slate-800 p-1 hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5">{formBody}</div>
        <div className="px-5 py-3 border-t border-slate-400 flex justify-end gap-2.5 bg-slate-50">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-400 rounded-lg text-xs font-bold bg-white hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cancel
          </button>
          {saveBtn}
        </div>
      </motion.div>
    </div>
  );
};
