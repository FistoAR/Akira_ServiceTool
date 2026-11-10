// Service Call Response Constants & Helpers
export const API_URL = import.meta.env.VITE_API_URL;
export const EMPLOYEES_KEY = "employees";
export const ESCALATION_FLOWS_KEY = "escalation_flows_v2";
export const MODES_KEY = "call_modes_v1";
export const DEFAULT_MODES = ["Phone", "Email", "WhatsApp", "Portal"];

export const RESOLUTION_TYPES = [
  "Fixed",
  "Replaced",
  "No Fault Found",
  "Partially Fixed",
];

export const load = (key, fb = []) => {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fb));
  } catch {
    return fb;
  }
};

export const save = (key, val) => localStorage.setItem(key, JSON.stringify(val));

export const playNotificationSound = () => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const playBeep = (startTime) => {
      const osc = ctx.createOscillator();
      const gainNode = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(880, startTime);
      osc.frequency.exponentialRampToValueAtTime(1760, startTime + 0.1);
      gainNode.gain.setValueAtTime(0, startTime);
      gainNode.gain.linearRampToValueAtTime(2, startTime + 0.02);
      gainNode.gain.exponentialRampToValueAtTime(0.001, startTime + 0.15);
      osc.connect(gainNode);
      gainNode.connect(ctx.destination);
      osc.start(startTime);
      osc.stop(startTime + 0.15);
    };
    const now = ctx.currentTime;
    playBeep(now);
    playBeep(now + 0.25);
  } catch (e) {
    console.error("Audio play failed:", e);
  }
};

export const getProductStatus = (prod) => {
  if (prod._resolved) return "resolved";
  if (
    prod._productClosure?.status === "Resolved" ||
    prod._productClosure?.status === "Closed"
  )
    return "closed";
  if (prod._productClosure?.status === "Pending") return "pending";
  if (prod._supportRequested) return "support";
  if (prod._attended) return "attended";
  return "open";
};

export const PROD_STATUS_CFG = {
  resolved: {
    dot: "bg-emerald-500",
    label: "Resolved",
    cls: "bg-emerald-50/70 border-emerald-350 text-emerald-800",
  },
  closed: {
    dot: "bg-emerald-500",
    label: "Resolved",
    cls: "bg-emerald-50/70 border-emerald-350 text-emerald-800",
  },
  pending: {
    dot: "bg-amber-500",
    label: "Pending",
    cls: "bg-amber-50/70 border-amber-350 text-amber-805",
  },
  support: {
    dot: "bg-blue-500",
    label: "Support Req",
    cls: "bg-blue-50/70 border-blue-350 text-blue-800",
  },
  attended: {
    dot: "bg-indigo-500",
    label: "Attended",
    cls: "bg-indigo-50/70 border-indigo-350 text-indigo-800",
  },
  open: {
    dot: "bg-rose-500",
    label: "Open",
    cls: "bg-rose-50/70 border-rose-350 text-rose-800",
  },
};

