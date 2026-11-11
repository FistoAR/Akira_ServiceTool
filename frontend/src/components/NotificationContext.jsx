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
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-slate-200/90",
    badgeBg: "bg-emerald-50 border border-emerald-200",
    iconColor: "text-emerald-600",
    progressBg: "bg-emerald-500",
    icon: CheckCircle2,
    title: "Success"
  },
  warning: {
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-slate-200/90",
    badgeBg: "bg-amber-50 border border-amber-200",
    iconColor: "text-amber-600",
    progressBg: "bg-amber-500",
    icon: AlertTriangle,
    title: "Warning"
  },
  error: {
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-slate-200/90",
    badgeBg: "bg-rose-50 border border-rose-200",
    iconColor: "text-rose-600",
    progressBg: "bg-rose-500",
    icon: AlertCircle,
    title: "Error"
  },
  critical: {
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-rose-200",
    badgeBg: "bg-rose-100 border border-rose-300",
    iconColor: "text-rose-700",
    progressBg: "bg-rose-600",
    icon: AlertCircle,
    title: "Critical"
  },
  delete: {
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-slate-200/90",
    badgeBg: "bg-orange-50 border border-orange-200",
    iconColor: "text-orange-600",
    progressBg: "bg-orange-500",
    icon: Trash2,
    title: "Deleted"
  },
  info: {
    bg: "bg-white/95 backdrop-blur-md",
    border: "border-slate-200/90",
    badgeBg: "bg-blue-50 border border-blue-200",
    iconColor: "text-blue-600",
    progressBg: "bg-blue-500",
    icon: Info,
    title: "Info"
  },
};

const ToastItem = ({ toast, onRemove }) => {
  const [progress, setProgress] = useState(100);
  const [isHovered, setIsHovered] = useState(false);
  const duration = toast.duration || 5000;

  useEffect(() => {
    if (duration === Infinity) return;
    if (isHovered) return;
    
    const interval = setInterval(() => {
      setProgress((prev) => {
        const newProgress = prev - 100 / (duration / 100);
        return newProgress <= 0 ? 0 : newProgress;
      });
    }, 100);
    return () => clearInterval(interval);
  }, [duration, isHovered]);

  useEffect(() => {
    if (progress <= 0) onRemove();
  }, [progress, onRemove]);

  const tType = (toast.type || "success").toLowerCase();
  const styles = typeStyles[tType] || typeStyles.success;
  const IconComponent = styles.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: -10, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -8, scale: 0.96 }}
      transition={{ duration: 0.2, ease: "easeOut" }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`pointer-events-auto flex items-start gap-[0.7vw] p-[0.75vw] rounded-[0.7vw] shadow-[0_8px_30px_rgb(0,0,0,0.08)] max-w-[32vw] w-fit min-w-[18vw] relative border ${styles.bg} ${styles.border}`}
    >
      {/* Icon Badge */}
      <div className={`flex items-center justify-center w-[1.8vw] h-[1.8vw] rounded-[0.45vw] flex-shrink-0 mt-[0.05vw] ${styles.badgeBg} ${styles.iconColor}`}>
        <IconComponent className="w-[1vw] h-[1vw]" strokeWidth={2.2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 pr-[0.4vw]">
        <p className="font-semibold text-slate-900 text-[0.78vw] leading-tight">
          {styles.title}
        </p>
        {React.isValidElement(toast.message) ? (
          <div className="text-[0.72vw] text-slate-600 mt-[0.2vw] leading-relaxed font-normal">
            {toast.message}
          </div>
        ) : (
          <p className="text-[0.72vw] text-slate-600 mt-[0.2vw] whitespace-pre-line leading-relaxed font-normal">
            {toast.message}
          </p>
        )}
      </div>

      {/* Close button */}
      <button 
        className="w-[1.4vw] h-[1.4vw] rounded-[0.35vw] flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer transition-colors mt-[0.05vw] flex-shrink-0" 
        onClick={onRemove}
        title="Dismiss"
      >
        <X className="w-[0.85vw] h-[0.85vw]" strokeWidth={2.2} />
      </button>

      {/* Thin Micro-Progress Bar */}
      {duration !== Infinity && (
        <div className="absolute bottom-0 left-0 h-[2px] bg-slate-100 rounded-b-[0.7vw] overflow-hidden w-full pointer-events-none">
          <div 
            className={`h-full ${styles.progressBg} transition-all duration-100 ease-linear opacity-70`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
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

  const addToast = useCallback((message, type = "success", duration = 5000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
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
      <div className="fixed top-[0.8vw] right-[0.8vw] z-[9999] flex flex-col gap-[0.8vw] pointer-events-none">
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
