import React, { useState, useRef } from "react";
import ReactDOM from "react-dom";
import { Phone, Info } from "lucide-react";

export const CustomTooltip = ({
  children,
  text,
  content: tooltipContent,
  position = "top",
  className = "",
}) => {
  const [coords, setCoords] = useState(null);
  const targetRef = useRef(null);

  if (!text && !tooltipContent) return children;

  const handleMouseEnter = () => {
    if (!targetRef.current) return;
    const rect = targetRef.current.getBoundingClientRect();
    const gap = 6;

    let x = rect.left + rect.width / 2;
    let y = rect.top - gap;
    let side = "top";

    if (rect.top < 120 || position === "bottom") {
      y = rect.bottom + gap;
      side = "bottom";
    }

    if (position === "top-start") {
      x = rect.left;
    } else if (position === "top-end") {
      x = rect.right;
    }

    setCoords({ x, y, side, align: position });
  };

  const handleMouseLeave = () => {
    setCoords(null);
  };

  return (
    <div
      ref={targetRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center ${className}`}
    >
      {children}
      {coords &&
        ReactDOM.createPortal(
          <div
            style={{
              position: "fixed",
              top: `${coords.y}px`,
              left: `${coords.x}px`,
              transform:
                coords.align === "top-start"
                  ? coords.side === "bottom"
                    ? "translate(0, 0)"
                    : "translate(0, -100%)"
                  : coords.align === "top-end"
                  ? coords.side === "bottom"
                    ? "translate(-100%, 0)"
                    : "translate(-100%, -100%)"
                  : coords.side === "bottom"
                  ? "translate(-50%, 0)"
                  : "translate(-50%, -100%)",
              zIndex: 99999,
            }}
            className="flex items-center bg-slate-900 text-white rounded-md px-[0.55vw] py-[0.25vw] text-[0.68vw] font-normal tracking-wide shadow-xl pointer-events-none whitespace-nowrap border border-slate-700 animate-fadeIn"
          >
            {tooltipContent ? tooltipContent : <span>{text}</span>}
            <div
              className={`absolute w-0 h-0 border-[0.25vw] ${
                coords.side === "bottom"
                  ? "bottom-full border-transparent border-b-slate-900"
                  : "top-full border-transparent border-t-slate-900"
              } ${
                coords.align === "top-start"
                  ? "left-[0.6vw]"
                  : coords.align === "top-end"
                  ? "right-[0.6vw]"
                  : "left-1/2 -translate-x-1/2"
              }`}
            />
          </div>,
          document.body
        )}
    </div>
  );
};

export const CustomerInfoCell = ({ customerName, contactNumber, partyCode }) => {
  const hasExtra = Boolean(contactNumber || partyCode);

  return (
    <div className="flex items-center gap-[0.35vw] max-w-full">
      <CustomTooltip text={customerName} position="top-start" className="min-w-0 flex-1">
        <span className="font-normal text-slate-900 text-[0.82vw] truncate block">
          {customerName || "—"}
        </span>
      </CustomTooltip>

      {hasExtra && (
        <CustomTooltip
          position="top-start"
          content={
            <div className="flex flex-col gap-[0.2vw] text-left py-[0.1vw]">
              <div className="font-medium text-slate-200 border-b border-slate-700/80 pb-[0.2vw] mb-[0.1vw]">
                {customerName || "Customer Details"}
              </div>
              {contactNumber && (
                <div className="flex items-center gap-[0.3vw] text-sky-300">
                  <Phone className="w-[0.65vw] h-[0.65vw] text-sky-400 shrink-0" />
                  <span>{contactNumber}</span>
                </div>
              )}
              {partyCode && (
                <div className="flex items-center gap-[0.3vw] text-slate-400 font-mono text-[0.64vw]">
                  <span className="text-slate-500 font-sans">ID:</span>
                  <span>{partyCode}</span>
                </div>
              )}
            </div>
          }
        >
          <button
            type="button"
            tabIndex={-1}
            className="p-[0.15vw] text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-full transition-colors cursor-pointer shrink-0"
          >
            <Info className="w-[0.78vw] h-[0.78vw]" />
          </button>
        </CustomTooltip>
      )}
    </div>
  );
};

