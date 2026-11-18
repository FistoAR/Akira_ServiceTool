import React from "react";
import { FileText, Eye, Download } from "lucide-react";

export const IssueDetailsContainer = ({ product }) => {
  const hasExtra =
    product.serialNumber || product.errorCode || product.warrantyStatus;

  return (
    <div className="mt-2.5 flex flex-col gap-3">
      {hasExtra && (
        <div className="flex flex-wrap gap-3 items-center border-b border-slate-200 pb-2.5">
          {product.serialNumber && (
            <div className="flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
              <span className="font-bold">Serial Num:</span>{" "}
              {product.serialNumber}
            </div>
          )}
          {product.errorCode && (
            <div className="flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
              <span className="font-bold text-slate-900">Error code :</span>{" "}
              {product.errorCode}
            </div>
          )}
          {product.warrantyStatus && (
            <div className="flex items-center gap-1 text-xs text-slate-700 bg-slate-50 border border-slate-200 px-2.5 py-1 rounded-md shadow-sm">
              <span className="font-bold text-slate-900">Warranty:</span>{" "}
              {product.warrantyStatus}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-3.5">
        <div className="flex-1">
          <div className="text-sm font-bold text-slate-700 mb-1">
            Reported Issue Details
          </div>
          <div className="text-sm text-slate-800 font-semibold leading-relaxed">
            {product.callDescription || "No description provided"}
          </div>
        </div>

        {/* Uploaded Reference Media */}
        {product.mediaFiles && product.mediaFiles.length > 0 && (
          <div className="flex flex-wrap gap-2.5 justify-end max-w-[40%]">
            {product.mediaFiles.map((file, idx) => {
              const isImage =
                file.type?.startsWith("image/") ||
                /\.(jpe?g|png|gif|webp)$/i.test(file.name);
              const API_URL_VAR =
                import.meta.env.VITE_API_URL || "http://localhost:5000";
              const BASE_URL = API_URL_VAR.replace(/\/api$/, "");

              // Ensure URL has absolute path if it is relative
              const displayUrl = file.url?.startsWith("http")
                ? file.url
                : `${BASE_URL}${file.url?.startsWith("/") ? "" : "/"}${file.url}`;

              return (
                <div
                  key={idx}
                  className="group relative w-18 h-18 rounded-lg border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm"
                  title={file.name}
                >
                  {isImage ? (
                    <img
                      src={displayUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-2 text-slate-700">
                      <FileText className="w-4 h-4 mb-1" />
                      <span className="text-xs truncate w-14 text-center font-medium">
                        {file.name}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5 backdrop-blur-[1px]">
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/95 hover:bg-white text-slate-800 rounded px-2 py-0.5 text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Eye className="w-2.5 h-2.5" /> View
                    </a>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        fetch(displayUrl)
                          .then((res) => res.blob())
                          .then((blob) => {
                            const link = document.createElement("a");
                            link.href = URL.createObjectURL(blob);
                            link.download = file.name || "download";
                            link.click();
                          });
                      }}
                      className="bg-indigo-600/95 hover:bg-indigo-500 text-white rounded px-2 py-0.5 text-xs font-bold shadow-sm transition-colors flex items-center gap-1"
                    >
                      <Download className="w-2.5 h-2.5" /> Save
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

