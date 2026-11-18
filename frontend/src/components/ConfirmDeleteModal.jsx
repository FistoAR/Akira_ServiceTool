import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, Trash2, X } from "lucide-react";

/**
 * ConfirmDeleteModal
 * Polished, high-aesthetic confirmation modal adhering to UI/UX Pro Max guidelines.
 * Features:
 * - Soft rose-50 / red alert badges
 * - Backdrop blur with smooth fade-in
 * - Interactive keyboard listeners (Esc to close, Enter to confirm)
 * - Safe loading / disabled states during API calls
 * - Responsive units
 */
export default function ConfirmDeleteModal({
  isOpen,
  onClose,
  onConfirm,
  title = "Delete Confirmation",
  message,
  callNumber,
  itemCount,
  isLoading = false,
}) {
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === "Escape" && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-3.5">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs"
            onClick={isLoading ? undefined : onClose}
          />

          {/* Modal Container */}
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-[374px] bg-white rounded-2xl shadow-2xl border border-slate-200/90 overflow-hidden z-10 flex flex-col font-sans"
          >
            {/* Header Banner */}
            <div className="p-4 pb-3 flex items-start gap-3.5">
              <div className="w-9 h-9 rounded-full bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0 shadow-xs">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="flex-1 min-w-0 pr-2">
                <h3 className="text-sm font-bold text-slate-850 leading-snug">
                  {title}
                </h3>
                <p className="text-xs text-slate-700 mt-1 leading-relaxed">
                  {message || (
                    <>
                      Are you sure you want to delete{" "}
                      {itemCount ? (
                        <span className="font-bold text-slate-800">
                          {itemCount} selected record{itemCount > 1 ? "s" : ""}
                        </span>
                      ) : callNumber ? (
                        <>
                          call{" "}
                          <span className="font-bold text-slate-800 font-mono">
                            {callNumber}
                          </span>
                        </>
                      ) : (
                        "this record"
                      )}
                      ? This action is irreversible.
                    </>
                  )}
                </p>
              </div>

              {!isLoading && (
                <button
                  type="button"
                  onClick={onClose}
                  className="p-1.5 text-slate-700 hover:text-slate-600 hover:bg-slate-100 rounded-md transition-colors cursor-pointer shrink-0"
                  aria-label="Close dialog"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Warning Callout */}
            <div className="mx-4 mb-3.5 px-3 py-2 bg-rose-50/60 rounded-lg border border-rose-150 flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0" />
              <span className="text-sm font-semibold text-rose-800">
                All associated product records and history will be permanently removed.
              </span>
            </div>

            {/* Actions Footer */}
            <div className="px-4 py-3 bg-slate-50/80 border-t border-slate-150 flex items-center justify-end gap-2.5">
              <button
                type="button"
                disabled={isLoading}
                onClick={onClose}
                className="px-3.5 py-1.5 text-xs font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200/70 border border-slate-300/80 bg-white rounded-lg transition-colors shadow-xs cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isLoading}
                onClick={onConfirm}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-lg transition-all shadow-sm hover:shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
              >
                {isLoading ? (
                  <span className="inline-block w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Trash2 className="w-3 h-3" />
                )}
                <span>{isLoading ? "Deleting..." : "Delete Permanently"}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

