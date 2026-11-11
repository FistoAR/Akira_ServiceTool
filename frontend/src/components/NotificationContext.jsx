import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  X, 
  CheckCircle2, 
  AlertTriangle, 
  Info, 
  AlertCircle,
  HelpCircle,
  Trash2
} from "lucide-react";

const typeStyles = {
  success: {
    border: "border-emerald-300",
    text: "text-emerald-700",
    badgeBg: "bg-emerald-600 text-white",
    icon: CheckCircle2,
  },
  warning: {
    border: "border-amber-300",
    text: "text-amber-700",
    badgeBg: "bg-amber-500 text-white",
    icon: AlertTriangle,
  },
  error: {
    border: "border-rose-300",
    text: "text-rose-600",
    badgeBg: "bg-rose-600 text-white",
    icon: AlertCircle,
  },
  critical: {
    border: "border-rose-400",
    text: "text-rose-700 font-semibold",
    badgeBg: "bg-rose-700 text-white",
    icon: AlertCircle,
  },
  delete: {
    border: "border-orange-300",
    text: "text-orange-700",
    badgeBg: "bg-orange-600 text-white",
    icon: Trash2,
  },
  info: {
    border: "border-blue-300",
    text: "text-blue-700",
    badgeBg: "bg-blue-600 text-white",
    icon: Info,
  },
};

const ToastItem = ({ toast, onRemove }) => {
  const [isHovered, setIsHovered] = useState(false);
  const duration = toast.duration || 4000;

  useEffect(() => {
    if (duration === Infinity) return;
    if (isHovered) return;

    const timer = setTimeout(() => {
      onRemove();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, isHovered, onRemove]);

  const tType = (toast.type || "success").toLowerCase();
  const styles = typeStyles[tType] || typeStyles.success;
  const IconComponent = styles.icon;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.95 }}
      transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto flex items-center gap-[0.8vw] px-[1vw] py-[0.6vw] rounded-full bg-white shadow-[0_4px_20px_-2px_rgba(0,0,0,0.1)] max-w-[34vw] w-fit min-w-[18vw] border ${styles.border}`}
    >
      {/* Solid Filled Circular Icon Badge */}
      <div
        className={`flex items-center justify-center w-[1.7vw] h-[1.7vw] rounded-full flex-shrink-0 shadow-2xs ${styles.badgeBg}`}
      >
        <IconComponent className="w-[1.05vw] h-[1.05vw]" strokeWidth={2.6} />
      </div>

      {/* Message Text */}
      <div className="flex-1 min-w-0 pr-[0.3vw]">
        {React.isValidElement(toast.message) ? (
          <div className={`text-[0.85vw] leading-normal font-medium truncate ${styles.text}`}>
            {toast.message}
          </div>
        ) : (
          <p className={`text-[0.85vw] leading-normal font-medium ${styles.text}`}>
            {toast.message}
          </p>
        )}
      </div>

      {/* Minimal Close 'X' Button */}
      <button
        className="w-[1.3vw] h-[1.3vw] rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition-colors flex-shrink-0"
        onClick={onRemove}
        title="Dismiss"
      >
        <X className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
      </button>
    </motion.div>
  );
};

const NotificationContext = createContext(null);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error("useNotification must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const [confirmData, setConfirmData] = useState(null);
  const [confirmInput, setConfirmInput] = useState("");

  const addToast = useCallback((message, type = "success", duration = 4000) => {
    setToasts((prev) => {
      // Prevent spamming identical toasts
      const isDuplicate = prev.some(
        (t) => t.message === message && t.type === type
      );
      if (isDuplicate) return prev;

      // Keep maximum 3 toasts on screen at once
      const id = Date.now();
      const updated = [...prev, { id, message, type, duration }];
      return updated.slice(-3);
    });
  }, []);

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmInput("");
      setConfirmData({
        ...options,
        resolve
      });
    });
  }, []);

  const handleConfirm = (value) => {
    if (confirmData) {
      confirmData.resolve(value);
      setConfirmData(null);
      setConfirmInput("");
    }
  };

  const isConfirmDisabled = confirmData?.confirmTextMatch
    ? confirmInput.trim().toLowerCase() !== confirmData.confirmTextMatch.trim().toLowerCase()
    : false;

  return (
    <NotificationContext.Provider value={{ toast: addToast, confirm }}>
      {children}
      
      {/* Toast Container */}
      <div className="fixed top-[0.8vw] right-[0.8vw] z-[9999] flex flex-col items-end gap-[0.6vw] pointer-events-none">
        <AnimatePresence>
          {toasts.map((t) => (
            <ToastItem
              key={t.id}
              toast={t}
              onRemove={() => removeToast(t.id)}
            />
          ))}
        </AnimatePresence>
      </div>

      {/* Confirm Modal */}
      <AnimatePresence>
        {confirmData && (
          <div className="fixed inset-0 z-[99999] flex items-center justify-center p-[2vw] bg-slate-900/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-[1.2vw] shadow-2xl border border-slate-350 w-full max-w-[34vw] overflow-hidden"
            >
              <div className="p-[1.8vw] flex flex-col gap-[1.2vw]">
                <div className="flex items-start gap-[1.2vw]">
                  {/* <div className={`
                    w-[3.5vw] h-[3.5vw] rounded-full flex items-center justify-center flex-shrink-0
                    ${confirmData.type === "danger" ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"}
                  `}>
                    {confirmData.type === "danger" ? <AlertTriangle className="w-[1.8vw] h-[1.8vw]" /> : <HelpCircle className="w-[1.8vw] h-[1.8vw]" />}
                  </div> */}
                  <div className="flex-1">
                    <h3 className="text-[1.2vw] font-bold text-slate-900 mb-[0.4vw]">
                      {confirmData.title || "Confirm Action"}
                    </h3>
                    <div className="text-[0.9vw] text-slate-600 leading-relaxed">
                      {typeof confirmData.message === "string" ? confirmData.message : confirmData.message}
                    </div>
                  </div>
                </div>

                {confirmData.confirmTextMatch && (
                  <div className="flex flex-col gap-[0.4vw] mt-[0.4vw] bg-red-50/70 p-[0.8vw] rounded-[0.6vw] border border-red-100">
                    <label className="text-[0.8vw] font-semibold text-slate-700">
                      Type <span className="font-bold text-red-600 select-all">"{confirmData.confirmTextMatch}"</span> to confirm deletion:
                    </label>
                    <input
                      type="text"
                      value={confirmInput}
                      onChange={(e) => setConfirmInput(e.target.value)}
                      placeholder={`Type "${confirmData.confirmTextMatch}" here`}
                      className="w-full border border-slate-300 rounded-[0.4vw] p-[0.5vw] text-[0.85vw] outline-none focus:border-red-500 focus:ring-1 focus:ring-red-200 bg-white"
                      autoFocus
                    />
                  </div>
                )}

                <div className="flex items-center justify-end gap-[0.8vw] mt-[0.6vw]">
                  <button
                    onClick={() => handleConfirm(false)}
                    className="px-[1.2vw] py-[0.6vw] rounded-[0.6vw] text-[0.85vw] font-semibold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                  >
                    {confirmData.cancelText || "Cancel"}
                  </button>
                  <button
                    onClick={() => handleConfirm(true)}
                    disabled={isConfirmDisabled}
                    className={`
                      px-[1.5vw] py-[0.6vw] rounded-[0.6vw] text-[0.85vw] font-bold text-white shadow-lg transition-all
                      ${isConfirmDisabled 
                        ? "bg-gray-300 text-gray-500 cursor-not-allowed shadow-none" 
                        : confirmData.type === "danger" 
                          ? "bg-red-600 hover:bg-red-700 shadow-red-200 cursor-pointer" 
                          : "bg-blue-600 hover:bg-blue-700 shadow-blue-200 cursor-pointer"
                      }
                    `}
                  >
                    {confirmData.confirmText || "Confirm"}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
