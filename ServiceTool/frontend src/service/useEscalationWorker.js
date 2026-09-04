import { useState, useEffect, useRef, useCallback } from "react";
import axios from "axios";
import { useSocket } from "../contexts/SocketContext";

const NOTIFICATIONS_KEY = "escalation_notifications_v1";

export default function useEscalationWorker() {
  const [timers, setTimers] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [activeCalls, setActiveCalls] = useState([]);
  const [isWorkerReady, setIsWorkerReady] = useState(false);
  
  const { socket } = useSocket() || {};
  const intervalRef = useRef(null);
  const notifiedTimersRef = useRef({ reminder: new Set(), expired: new Set() });

  // Load old notifications
  useEffect(() => {
    const stored = localStorage.getItem(NOTIFICATIONS_KEY);
    if (stored) {
      try { setNotifications(JSON.parse(stored)); } catch (e) {}
    }
  }, []);

  // Fetch active calls on mount
  useEffect(() => {
    axios.get(`${import.meta.env.VITE_API_URL}/service-calls/active`)
      .then(res => {
        setActiveCalls(res.data);
      })
      .catch(err => console.error("Failed to fetch active calls for timers", err));
  }, []);

  // Listen to live socket updates to maintain activeCalls
  useEffect(() => {
    if (!socket) return;
    
    const handleUpdate = (updatedCall) => {
      setActiveCalls(prev => {
        if (updatedCall.deleted || updatedCall.status === "Resolved" || updatedCall.status === "Closed") {
          return prev.filter(c => c._id !== (updatedCall._id || updatedCall.id));
        }
        
        const exists = prev.some(c => c._id === (updatedCall._id || updatedCall.id));
        if (exists) {
          return prev.map(c => c._id === (updatedCall._id || updatedCall.id) ? updatedCall : c);
        }
        return [updatedCall, ...prev];
      });
    };

    socket.on('service_call_updated', handleUpdate);
    return () => socket.off('service_call_updated', handleUpdate);
  }, [socket]);

  // Timer Tick Loop
  useEffect(() => {
    intervalRef.current = setInterval(() => {
      const now = new Date();
      const newTimers = [];

      activeCalls.forEach(call => {
        if (!call.products || call.status === "Resolved" || call.status === "Critical_Unresolved" || call.status === "Closed" || call.status === "Critical") return;
        
        // Find the earliest deadline among active products
        let earliestProduct = null;
        call.products.forEach(p => {
          if (p._assigned && !p._resolved && p._productClosure?.status !== "Closed" && !p._taken && !p._attended && p._deadline) {
            if (!earliestProduct || new Date(p._deadline) < new Date(earliestProduct._deadline)) {
              earliestProduct = p;
            }
          }
        });

        if (earliestProduct) {
          const deadline = new Date(earliestProduct._deadline);
          const remainingMs = Math.max(0, deadline - now);
          const hours = Math.floor(remainingMs / 3600000);
          const minutes = Math.floor((remainingMs % 3600000) / 60000);
          const seconds = Math.floor((remainingMs % 60000) / 1000);

          const isUrgent = remainingMs < 5 * 60 * 1000;
          const isExpired = remainingMs === 0;
          const callId = call._id || call.id;

          newTimers.push({
            callId,
            callNumber: call.callNumber,
            remainingMs,
            remainingFormatted: `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`,
            currentLevel: earliestProduct._levelPointer || 0,
            currentDepartment: earliestProduct._currentDepartment || call.currentDepartment,
            currentEngineerName: earliestProduct._assignedEngineerName || call.currentEngineerName,
            isUrgent,
            isExpired,
            customerName: call.customerName,
            priority: call.priority,
          });

          // Local Beeps / Notifications
          if (isUrgent && !notifiedTimersRef.current.reminder.has(callId)) {
            notifiedTimersRef.current.reminder.add(callId);
            playBeep(0.05, 220, 720);
          }
          if (isExpired && !notifiedTimersRef.current.expired.has(callId)) {
            notifiedTimersRef.current.expired.add(callId);
            playBeep(0.12, 360, 520);
          }
        }
      });

      setTimers(newTimers);
      setIsWorkerReady(true);
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [activeCalls]);

  const playBeep = (volume = 0.06, duration = 150, freq = 880) => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.connect(g);
      g.connect(ctx.destination);
      g.gain.value = volume;
      o.frequency.value = freq;
      o.type = "sine";
      o.start();
      setTimeout(() => { o.stop(); ctx.close(); }, duration);
    } catch (e) {}
  };

  const resolveCall = useCallback((callId) => {
    // Left for backwards compatibility, actual resolution handled via API
  }, []);

  const clearNotifications = useCallback(() => {
    setNotifications([]);
    localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify([]));
  }, []);

  return {
    timers,
    notifications,
    isWorkerReady,
    resolveCall,
    clearNotifications,
  };
}