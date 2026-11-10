import React, { useState, useEffect } from "react";
import { User, Phone, Mail, MapPin, Clock, CheckSquare } from "lucide-react";
import { motion } from "framer-motion";
import { load, ESCALATION_FLOWS_KEY } from "./ResponseConstants";

export const Badge = ({ label, color = "gray" }) => {
  const map = {
    green:
      "bg-gradient-to-r from-emerald-50 to-teal-50 text-emerald-800 border-emerald-350",
    blue: "bg-gradient-to-r from-blue-50 to-indigo-50 text-blue-800 border-blue-350",
    slate:
      "bg-gradient-to-r from-slate-50 to-slate-100 text-slate-700 border-slate-400",
    gray: "bg-slate-100 text-slate-750 border-slate-400",
    orange:
      "bg-gradient-to-r from-amber-50 to-orange-50 text-amber-800 border-amber-350",
    red: "bg-gradient-to-r from-rose-50 to-red-50 text-rose-800 border-rose-350",
    indigo:
      "bg-gradient-to-r from-indigo-50 to-violet-50 text-indigo-800 border-indigo-350",
  };
  return (
    <span
      className={`text-[0.68vw] px-[0.6vw] py-[0.2vw] rounded-full border font-bold whitespace-nowrap shadow-sm transition-all duration-300 ${map[color] || map.gray}`}
    >
      {label}
    </span>
  );
};

export const ContactInfoBar = ({ entry }) => {
  if (
    !entry?.contactPerson &&
    !entry?.contactNumber &&
    !entry?.emailId &&
    !entry?.location
  )
    return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: -5 }}
      animate={{ opacity: 1, y: 0 }}
      className="mx-[0.9vw] mb-[0.6vw] bg-slate-50/85 backdrop-blur-sm border border-slate-400 rounded-[0.6vw] px-[0.7vw] py-[0.6vw] flex items-center gap-[1.6vw] flex-wrap shadow-inner"
    >
      {entry.contactPerson && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold hover:text-slate-950 transition-colors">
          <User className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span>{entry.contactPerson}</span>
        </div>
      )}
      {entry.contactNumber && (
        <a
          href={`tel:${entry.contactNumber}`}
          className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-850 font-bold hover:text-indigo-700 transition-colors"
        >
          <Phone className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span className="font-mono">{entry.contactNumber}</span>
        </a>
      )}
      {entry.emailId && (
        <a
          href={`mailto:${entry.emailId}`}
          className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-850 font-bold hover:text-indigo-700 transition-colors"
        >
          <Mail className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span className="font-mono">{entry.emailId}</span>
        </a>
      )}
      {entry.location && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold">
          <MapPin className="w-[1vw] h-[1vw] text-slate-650 flex-shrink-0" />
          <span>{entry.location}</span>
        </div>
      )}
      {entry.site && (
        <div className="flex items-center gap-[0.4vw] text-[0.85vw] text-slate-800 font-bold">
          <span className="text-[0.7vw] uppercase font-bold text-slate-500">Site:</span>
          <span>{entry.site}</span>
        </div>
      )}
    </motion.div>
  );
};

export const ProductSLATimer = ({ product, globalTimer }) => {
  const lastEsc =
    product._escalationHistory?.[product._escalationHistory.length - 1];
  const [timeLeft, setTimeLeft] = useState("");

  useEffect(() => {
    if (product._attended) {
      setTimeLeft("attended");
      return;
    }
    if (!lastEsc?.assignedAt) return;
    const flows = load(ESCALATION_FLOWS_KEY, {});
    const allFlows = Object.values(flows).find((f) => Array.isArray(f)) || [];
    const step = allFlows.find((s) => s.dept === lastEsc.department);
    const durationMs = (step?.slaHours || 2) * 60 * 60 * 1000;
    const deadline = new Date(lastEsc.assignedAt).getTime() + durationMs;

    const update = () => {
      const diff = deadline - Date.now();
      if (diff <= 0) {
        setTimeLeft("overdue");
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(h > 0 ? `${h}h ${m}m` : `${m}m ${s}s`);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [lastEsc, product._attended]);

  if (product._attended) {
    return (
      <div className="flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] bg-emerald-50 text-emerald-700 border border-emerald-350 font-bold text-[0.68vw] shadow-sm">
        <CheckSquare className="w-[0.7vw] h-[0.7vw]" />
        Attended
      </div>
    );
  }

  if (!lastEsc && !globalTimer) return null;
  if (!lastEsc && globalTimer) {
    return (
      <div
        className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] font-mono text-[0.68vw] font-bold shadow-sm ${globalTimer.isExpired ? "bg-red-55 text-red-700 border border-red-350 animate-pulse" : globalTimer.isUrgent ? "bg-amber-55 text-amber-800 border border-amber-350" : "bg-blue-55 text-blue-700 border border-blue-350"}`}
      >
        <Clock className="w-[0.7vw] h-[0.7vw]" />
        {globalTimer.isExpired ? "Escalating" : globalTimer.remainingFormatted}
      </div>
    );
  }
  if (!timeLeft) return null;
  const isOverdue = timeLeft === "overdue";
  return (
    <div
      className={`flex items-center gap-[0.25vw] px-[0.5vw] py-[0.2vw] rounded-[0.4vw] font-mono text-[0.68vw] font-bold shadow-sm ${isOverdue ? "bg-red-55 text-red-700 border border-red-350 animate-pulse" : "bg-blue-55 text-blue-700 border border-blue-350"}`}
    >
      <Clock className="w-[0.7vw] h-[0.7vw]" />
      {isOverdue ? "SLA Breached" : timeLeft}
    </div>
  );
};
