import React, { useState, useEffect, useRef, useMemo } from "react";
import { Search, CheckCircle, Loader2, X } from "lucide-react";
import { motion } from "framer-motion";
import { load, EMPLOYEES_KEY } from "./ResponseConstants";

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
  const employees = propsEmployees || load(EMPLOYEES_KEY, []);
  const [search, setSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const sf = (k, v) => setForm((p) => ({ ...p, [k]: v }));
  const isFV = type === "Field Visit";

  const formBody = (
    <div className="flex flex-col gap-[0.9vw]">
      <div className="flex flex-col gap-[0.3vw] relative" ref={dropdownRef}>
        <label className="text-[0.85vw] font-semibold text-slate-800">
          Assign To *
        </label>
        <div className="relative flex items-center">
          <div className="absolute left-[0.6vw] flex items-center justify-center pointer-events-none">
            <Search className="h-[0.9vw] w-[0.9vw] text-slate-400" />
          </div>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setShowDropdown(true);
              if (!e.target.value) {
                sf("assignedTo", "");
                sf("assignedToName", "");
              }
            }}
            onFocus={() => setShowDropdown(true)}
            placeholder="Search and select specialist..."
            className={`w-full border border-slate-400 pl-[2vw] p-[0.6vw] text-[0.85vw] outline-none bg-white transition-all shadow-sm ${showDropdown ? "rounded-t-[0.5vw] border-b-0 border-indigo-400" : "rounded-[0.5vw] focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10"}`}
          />
        </div>
        {showDropdown && (
          <div className="absolute top-full left-0 right-0 bg-white border border-indigo-400 border-t-0 rounded-b-[0.5vw] max-h-[12vw] overflow-y-auto shadow-xl z-[9999] p-[0.3vw]">
            {candidates.length > 0 ? (
              candidates.map((emp) => (
                <div
                  key={emp.userId}
                  onClick={() => {
                    sf("assignedTo", emp.userId);
                    sf("assignedToName", emp.name);
                    setSearch(`${emp.name} (${emp.department})`);
                    setShowDropdown(false);
                  }}
                  className={`p-[0.6vw] flex items-center justify-between rounded-[0.4vw] cursor-pointer font-bold text-[0.85vw] transition-colors ${form.assignedTo === emp.userId ? "bg-indigo-50 text-indigo-800" : "text-slate-700 hover:bg-slate-100"}`}
                >
                  <div className="flex flex-col">
                    <span>{emp.name}</span>
                    <span className="text-[0.75vw] text-slate-500 font-semibold">
                      {emp.department}
                    </span>
                  </div>
                  {form.assignedTo === emp.userId && (
                    <CheckCircle className="w-[0.9vw] h-[0.9vw] text-indigo-600" />
                  )}
                </div>
              ))
            ) : (
              <div className="p-[0.8vw] text-center text-[0.75vw] text-slate-500 italic font-bold">
                No matching personnel found
              </div>
            )}
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-[0.8vw]">
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.85vw] font-semibold text-slate-800">
            Assignment Date
          </label>
          <input
            type="datetime-local"
            value={form.assignmentDate}
            min={new Date().toISOString().slice(0, 16)}
            onChange={(e) => sf("assignmentDate", e.target.value)}
            className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.85vw] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
          />
        </div>
        <div className="flex flex-col gap-[0.3vw]">
          <label className="text-[0.85vw] font-semibold text-slate-800">
            {isFV ? "Visit Date" : "Received Date"}
          </label>
          <input
            type="date"
            value={form.visitDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => sf("visitDate", e.target.value)}
            className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.85vw] outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
          />
        </div>
      </div>
      <div className="flex flex-col gap-[0.3vw]">
        <label className="text-[0.85vw] font-semibold text-slate-800">
          Diagnosis Summary
        </label>
        <textarea
          rows="2"
          value={form.diagnosisSummary}
          onChange={(e) => sf("diagnosisSummary", e.target.value)}
          placeholder="Initial findings or instructions for the field visit..."
          className="border border-slate-400 rounded-[0.5vw] p-[0.6vw] text-[0.78vw] font-semibold outline-none resize-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all bg-white"
        />
      </div>
    </div>
  );

  const saveBtn = (
    <button
      disabled={isSubmitting}
      onClick={async () => {
        if (!form.assignedTo) {
          alert("Please select a person.");
          return;
        }
        if (!form.visitDate) {
          alert("Please select a visit date.");
          return;
        }
        setIsSubmitting(true);
        try {
          await onSave(form);
        } finally {
          setIsSubmitting(false);
        }
      }}
      className="px-[1.2vw] py-[0.5vw] bg-indigo-600 hover:bg-indigo-700 disabled:opacity-70 text-white rounded-[0.5vw] text-[0.8vw] font-bold cursor-pointer flex items-center justify-center gap-[0.4vw] transition-colors shadow-md shadow-indigo-600/15"
    >
      {isSubmitting ? (
        <Loader2 className="w-[0.85vw] h-[0.85vw] animate-spin" />
      ) : (
        <CheckCircle className="w-[0.85vw] h-[0.85vw]" />
      )}
      Save Assignment
    </button>
  );

  if (inlineMode)
    return (
      <div className="border border-indigo-300 rounded-[0.6vw] overflow-hidden bg-white mt-[0.6vw] shadow-sm">
        <div className="bg-slate-50 border-b border-indigo-300 px-[0.8vw] py-[0.5vw] flex justify-between items-center">
          <span className="text-[0.85vw] font-semibold text-slate-800">
            Assign {type}
          </span>
        </div>
        <div className="p-[0.8vw]">
          {formBody}
          <div className="flex justify-end mt-[0.8vw]">{saveBtn}</div>
        </div>
      </div>
    );

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-50 flex items-center justify-center p-[2vw]">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-white w-[38vw] rounded-[1vw] shadow-2xl overflow-hidden border border-slate-400"
      >
        <div className="border-b border-slate-400 px-[1.4vw] py-[1vw] flex justify-between items-center bg-slate-50">
          <h3 className="text-[1vw] font-bold text-slate-850">Assign {type}</h3>
          <button
            onClick={onClose}
            className="text-slate-550 hover:text-slate-800 p-[0.3vw] hover:bg-slate-100 rounded-full transition-all"
          >
            <X className="w-[1.1vw] h-[1.1vw]" />
          </button>
        </div>
        <div className="p-[1.4vw]">{formBody}</div>
        <div className="px-[1.4vw] py-[0.8vw] border-t border-slate-400 flex justify-end gap-[0.7vw] bg-slate-50">
          <button
            onClick={onClose}
            className="px-[1.2vw] py-[0.5vw] border border-slate-400 rounded-[0.5vw] text-[0.8vw] font-bold bg-white hover:bg-slate-100 transition-colors shadow-sm"
          >
            Cancel
          </button>
          {saveBtn}
        </div>
      </motion.div>
    </div>
  );
};

