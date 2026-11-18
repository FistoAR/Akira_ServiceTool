import React from "react";
import { motion } from "framer-motion";
import { Package, X, FileText } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL;

// Format date utility (DD-MM-YYYY)
const fmtDate = (d) => {
  if (!d) return "—";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * ServiceMaterialDetailModal
 * Shared read-only popup for Service Material details across:
 * - ServiceMaterial.jsx (Registry)
 * - serviceMaterialResponse.jsx (Response / Inward)
 * - ServiceMaterialReports.jsx (Reports)
 *
 * Requirements:
 * - Modal title can be bold (font-bold)
 * - Inside body: NO font-bold anywhere (all text regular font-normal / font-medium)
 * - Uniform font size used throughout the body (text-xs)
 * - Attachment preview shown with click-to-open in new tab
 */
const ServiceMaterialDetailModal = ({ item, data, product: fallbackProduct, entry: fallbackEntry, onClose }) => {
  const activeItem = item || data || {};
  const product = activeItem.product || fallbackProduct || (activeItem.report ? activeItem : null);
  const entry = activeItem.entry || fallbackEntry || null;

  if (!product) return null;
  const report = product.report || {};

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-7">
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="bg-white w-[806px] max-w-[850px] max-h-[88vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 font-sans"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Title font-bold as requested */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex justify-between items-center bg-white shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-6.5 h-6.5 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center border border-blue-200 shadow-2xs">
              <Package className="w-3.5 h-3.5" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-slate-800">
                Service Material Details
              </h3>
              <p className="text-xs text-slate-600 font-normal">
                {entry?.customerName || "Customer"} {entry?.customerCode ? `(${entry.customerCode})` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-700 hover:text-slate-800 transition-colors cursor-pointer border-0 bg-transparent"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body - Regular weight (font-normal / font-medium), uniform font size (text-xs) */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 bg-[#f8fafd]">
          {/* Section 1: Inward & Customer Info */}
          {entry && (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-medium text-slate-800 mb-2.5 flex items-center gap-1.5">
                <span className="w-1 h-3 bg-blue-600 rounded-full" />
                Inward &amp; Customer Information
              </h4>
              <div className="grid grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Inward Date</span>
                  <span className="font-normal text-slate-800">{fmtDate(entry.date || entry.timestamp)}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Customer Ref No</span>
                  <span className="font-normal text-purple-800">{entry.refNoCustomer || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Internal Ref No</span>
                  <span className="font-normal text-blue-800">{entry.refNoInternal || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Category</span>
                  <span className="font-normal text-slate-800">{entry.category || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80 col-span-2">
                  <span className="text-xs text-slate-600 block font-medium">Customer Name</span>
                  <span className="font-normal text-slate-800">{entry.customerName || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Unit</span>
                  <span className="font-normal text-teal-800">{entry.unit || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Site</span>
                  <span className="font-normal text-slate-800">{entry.site || "—"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 2: Product & Warranty Details */}
          {product && (
            <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
              <h4 className="text-xs font-medium text-slate-800 mb-2.5 flex items-center gap-1.5">
                <span className="w-1 h-3 bg-emerald-600 rounded-full" />
                Product &amp; Warranty Details
              </h4>
              <div className="grid grid-cols-4 gap-2.5 text-xs">
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80 col-span-2">
                  <span className="text-xs text-slate-600 block font-medium">Product Description</span>
                  <span className="font-normal text-slate-800">{product.productDescription || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Product Code</span>
                  <span className="font-mono font-normal text-slate-800">{product.productCode || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Board Type</span>
                  <span className="font-normal text-slate-800">{product.boardType || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Serial Number</span>
                  <span className="font-mono font-normal text-blue-700">{product.serialNumber || "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Warranty Type</span>
                  <span className={`inline-block px-2 py-px rounded font-normal text-xs ${product.type === "W" ? "bg-green-100 text-green-800" : "bg-blue-100 text-blue-800"}`}>
                    {product.type === "W" ? "Warranty (W)" : "Paid (PW)"}
                  </span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Expected Delivery</span>
                  <span className="font-normal text-slate-800">{product.expectedDeliveryDate ? fmtDate(product.expectedDeliveryDate) : "—"}</span>
                </div>
                <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                  <span className="text-xs text-slate-600 block font-medium">Claimed By</span>
                  <span className="font-normal text-slate-800">{product.assignedToName || "Unassigned"}</span>
                </div>
              </div>
            </div>
          )}

          {/* Section 3: Technical Service Report */}
          <div className="bg-white rounded-xl p-3.5 border border-slate-200 shadow-2xs">
            <h4 className="text-xs font-medium text-slate-800 mb-2.5 flex items-center gap-1.5">
              <span className="w-1 h-3 bg-indigo-600 rounded-full" />
              Technical Service Report
            </h4>
            <div className="grid grid-cols-3 gap-2.5 text-xs">
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Tested By</span>
                <span className="font-normal text-slate-800">{report.testedBy || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">4M Category</span>
                <span className="font-normal text-slate-800">{report.fourMCategory || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Error Code</span>
                <span className="font-mono font-normal text-slate-800">{report.errorCode || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80 col-span-3">
                <span className="text-xs text-slate-600 block font-medium">Problem Description</span>
                <span className="text-slate-800 leading-relaxed font-normal">{report.problemDescription || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80 col-span-3">
                <span className="text-xs text-slate-600 block font-medium">Root Cause</span>
                <span className="text-slate-800 leading-relaxed font-normal">{report.rootCause || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80 col-span-3">
                <span className="text-xs text-slate-600 block font-medium">Corrective Action</span>
                <span className="text-slate-800 leading-relaxed font-normal">{report.correctiveAction || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Time (Hours)</span>
                <span className="font-normal text-slate-800">{report.timeInHours ? `${report.timeInHours} hrs` : "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Material Cost</span>
                <span className="font-normal text-slate-800">{report.materialCost != null && report.materialCost !== "" ? `₹${report.materialCost}` : "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Man Power Cost</span>
                <span className="font-normal text-emerald-800">{report.manpowerCost != null ? `₹${Number(report.manpowerCost).toFixed(2)}` : "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Status</span>
                <span className="font-normal text-slate-800">{report.status || product?.status || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Parts Replaced</span>
                <span className="text-slate-800 font-normal">{report.partsReplacement || "—"}</span>
              </div>
              <div className="bg-slate-50/80 p-2 rounded-md border border-slate-200/80">
                <span className="text-xs text-slate-600 block font-medium">Disposition</span>
                <span className="font-normal text-slate-800">{report.disposition || "—"}</span>
              </div>
            </div>

            {/* Technical Image / Attachment Preview if any */}
            {report.image && (
              <div className="mt-3 pt-3 border-t border-slate-200">
                <span className="text-xs text-slate-700 block font-medium mb-1.5">
                  Attached Technical Document (Image / PDF)
                </span>
                {report.image.toLowerCase().endsWith(".pdf") ? (
                  <button
                    type="button"
                    onClick={() => {
                      const url = report.image.startsWith("http")
                        ? report.image
                        : `${API_URL?.replace(/\/$/, "") || ""}${report.image.startsWith("/") ? "" : "/"}${report.image}`;
                      window.open(url, "_blank");
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 rounded-md text-xs font-medium shadow-2xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5 text-rose-600" />
                    <span>Open Attached PDF Document (New Tab)</span>
                  </button>
                ) : (
                  <div className="inline-block group relative">
                    <img
                      src={
                        report.image.startsWith("data:") || report.image.startsWith("http")
                          ? report.image
                          : `${API_URL?.replace(/\/$/, "") || ""}${report.image.startsWith("/") ? "" : "/"}${report.image}`
                      }
                      alt="Technical Attachment Preview"
                      className="max-h-[16vh] max-w-[288px] object-contain rounded-md border border-slate-300 shadow-sm cursor-pointer group-hover:opacity-95 transition-all bg-white"
                      onClick={() => {
                        const url =
                          report.image.startsWith("data:") || report.image.startsWith("http")
                            ? report.image
                            : `${API_URL?.replace(/\/$/, "") || ""}${report.image.startsWith("/") ? "" : "/"}${report.image}`;
                        window.open(url, "_blank");
                      }}
                      title="Click to open full view in new tab"
                    />
                    <div className="text-sm text-slate-700 font-normal mt-1">
                      Click preview to open in full view
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-slate-200 bg-white flex items-center justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 h-7.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium text-xs rounded-full transition-colors cursor-pointer border-0"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default ServiceMaterialDetailModal;

