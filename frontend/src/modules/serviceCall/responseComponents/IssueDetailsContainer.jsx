import React from "react";
import { FileText, Eye, Download } from "lucide-react";

export const IssueDetailsContainer = ({ product }) => {
  const hasExtra =
    product.serialNumber || product.errorCode || product.warrantyStatus;

  return (
    <div className="mt-[0.6vw] flex flex-col gap-[0.8vw]">
      {hasExtra && (
        <div className="flex flex-wrap gap-[0.8vw] items-center border-b border-slate-200 pb-[0.6vw]">
          {product.serialNumber && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold">Serial Num:</span>{" "}
              {product.serialNumber}
            </div>
          )}
          {product.errorCode && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold text-slate-900">Error code :</span>{" "}
              {product.errorCode}
            </div>
          )}
          {product.warrantyStatus && (
            <div className="flex items-center gap-[0.3vw] text-[0.75vw] text-slate-700 bg-slate-50 border border-slate-200 px-[0.6vw] py-[0.3vw] rounded-[0.4vw] shadow-sm">
              <span className="font-bold text-slate-900">Warranty:</span>{" "}
              {product.warrantyStatus}
            </div>
          )}
        </div>
      )}

      <div className="flex items-start justify-between gap-[1vw]">
        <div className="flex-1">
          <div className="text-[0.85vw] font-bold text-slate-500 mb-[0.3vw]">
            Reported Issue Details
          </div>
          <div className="text-[0.85vw] text-slate-800 font-semibold leading-relaxed">
            {product.callDescription || "No description provided"}
          </div>
        </div>

        {/* Uploaded Reference Media */}
        {product.mediaFiles && product.mediaFiles.length > 0 && (
          <div className="flex flex-wrap gap-[0.6vw] justify-end max-w-[40%]">
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
                  className="group relative w-[5vw] h-[5vw] rounded-[0.5vw] border border-slate-300 overflow-hidden bg-slate-100 flex items-center justify-center shadow-sm"
                  title={file.name}
                >
                  {isImage ? (
                    <img
                      src={displayUrl}
                      alt={file.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-[0.5vw] text-slate-500">
                      <FileText className="w-[1.2vw] h-[1.2vw] mb-[0.2vw]" />
                      <span className="text-[0.5vw] truncate w-[4vw] text-center font-medium">
                        {file.name}
                      </span>
                    </div>
                  )}

                  {/* Hover Overlay */}
                  <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-[0.4vw] backdrop-blur-[1px]">
                    <a
                      href={displayUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-white/95 hover:bg-white text-slate-800 rounded px-[0.5vw] py-[0.15vw] text-[0.6vw] font-bold shadow-sm transition-colors flex items-center gap-[0.2vw]"
                    >
                      <Eye className="w-[0.7vw] h-[0.7vw]" /> View
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
                      className="bg-indigo-600/95 hover:bg-indigo-500 text-white rounded px-[0.5vw] py-[0.15vw] text-[0.6vw] font-bold shadow-sm transition-colors flex items-center gap-[0.2vw]"
                    >
                      <Download className="w-[0.7vw] h-[0.7vw]" /> Save
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

